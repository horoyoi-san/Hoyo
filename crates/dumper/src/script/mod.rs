use std::sync::atomic::Ordering;
use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use il2cpp::{
    MAX_TYPEDEFINDEX,
    vm::{
        class::Il2CppClass, method::Il2CppMethod, string::Il2CppString,
        r#type::Il2CppTypeNameFormat,
    },
};
use reflection::{method_info::MethodInfo, runtime_type::RuntimeType};
use serde::{Serialize, Serializer, ser::SerializeStruct as _};
use std::{borrow::Cow, collections::HashMap, sync::OnceLock};
use utils::{game_assembly_slice, scan_ga_section};

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct ScriptMethod {
    pub address: usize,
    pub name: String,
    pub signature: String,
    pub type_signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct ScriptString {
    pub address: usize,
    pub value: Cow<'static, str>,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct ScriptMetadata {
    pub address: usize,
    pub name: String,
    pub signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct ScriptMetadataMethod {
    pub address: usize,
    pub name: String,
    pub method_address: usize,
}

#[derive(Default)]
struct ScriptJson {
    pub script_method: HashMap<usize, ScriptMethod>,
    pub script_string: HashMap<usize, ScriptString>,
    pub script_metadata: HashMap<usize, ScriptMetadata>,
    pub script_metadata_method: HashMap<usize, ScriptMetadataMethod>,
}

impl Serialize for ScriptJson {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("ScriptJson", 4)?;

        state.serialize_field(
            "ScriptMethod",
            &self.script_method.values().collect::<Vec<_>>(),
        )?;
        state.serialize_field(
            "ScriptString",
            &self.script_string.values().collect::<Vec<_>>(),
        )?;
        state.serialize_field(
            "ScriptMetadata",
            &self.script_metadata.values().collect::<Vec<_>>(),
        )?;
        state.serialize_field(
            "ScriptMetadataMethod",
            &self.script_metadata_method.values().collect::<Vec<_>>(),
        )?;

        state.end()
    }
}

//
const GET_METADATA_FROM_INDEX_FUNC_PTR: usize = 0x0; // atas "yes" di "mscorlib.dll", no args mungkin?
const TABLE_BASE: usize = 0x0;
const TYPEINFO_OFFSET: usize = 0x0; // case 1
const METHODINFO_OFFSET: usize = 0x0; // case 3, 6
const STRINGLITERAL_OFFSET: usize = 0x0; // case 5

pub static METADATA_METHODS: OnceLock<HashMap<i32, HashMap<i32, Vec<MethodInfo>>>> =
    OnceLock::new();
pub static TYPE_INFOS: OnceLock<HashMap<Il2CppClass, usize>> = OnceLock::new(); // <Il2CppClass, rva>
pub static METHODS: OnceLock<HashMap<u64, Il2CppMethod>> = OnceLock::new(); // <rva, Il2CppMethod>
pub static STRING_LITERALS: OnceLock<HashMap<usize, Il2CppString>> = OnceLock::new(); // <rva, Il2CppString>

#[allow(unused)]
pub fn dump() {
    unsafe {
        if STRING_LITERALS.get().is_some() {
            return;
        }

        log::debug!("[Script Dumper] dumping script...");

        let mut out = ScriptJson::default();

        let mut methods = HashMap::new();
        dump_methods(&mut out, &mut methods);
        METHODS.set(methods);

        let (metadata_init_rva, table_rva, offsets) = if let Some((metadata_init_rva, table_va, offsets)) = scan_address() {
            let table_rva = table_va - *il2cpp::GA_BASE;
            log::debug!(
                "[Script Dumper] Metadata Init: 0x{metadata_init_rva:X} | Table Base: 0x{table_rva:X} | Offsets: {}",
                offsets
                    .iter()
                    .map(|(case, offset)| match *case {
                        1 => {
                            format!("TypeInfo {offset}")
                        }
                        3 | 6 => {
                            format!("MethodInfo {offset}")
                        }
                        5 => {
                            format!("StringLiteral {offset}")
                        }
                        other => format!("case {other} => {offset}"),
                    })
                    .collect::<Vec<_>>()
                    .join(" | ")
            );
            (metadata_init_rva, table_rva, offsets)
        } else {
            log::debug!("[Script Dumper] Failed to scan address, using the hardcoded one");

            if GET_METADATA_FROM_INDEX_FUNC_PTR == 0 {
                log::debug!(
                    "[Script Dumper] Hardcoded offset is not set! aborting script dump."
                );
                METADATA_METHODS.set(HashMap::new());
                return;
            }

            (
                GET_METADATA_FROM_INDEX_FUNC_PTR,
                TABLE_BASE,
                HashMap::from([
                    (1, TYPEINFO_OFFSET),
                    (3, METHODINFO_OFFSET),
                    (6, METHODINFO_OFFSET),
                    (5, STRINGLITERAL_OFFSET),
                ]),
            )
        };

        let func: extern "C" fn(u32) = std::mem::transmute(*il2cpp::GA_BASE + metadata_init_rva);

        let mut max_index = 0;

        for i in 0..999_999 {
            if microseh::try_seh(|| {
                func(i as u32);
            })
            .is_err()
            {
                max_index = i;
                break;
            }
        }

        log::debug!("[Script Dumper] dumping type info...");
        let mut type_infos = HashMap::new();
        for index in 0..999_999 {
            match microseh::try_seh(|| {
                let table = *((*((*il2cpp::GA_BASE + table_rva) as *const usize)
                    + offsets.get(&1).unwrap()) as *const usize);
                let pointer = table + 8 * index;
                let table_pointer = pointer - *il2cpp::GA_BASE;
                let class = *((pointer) as *const Il2CppClass);
                if class.0 == 0 {
                    return true;
                }

                let name = class.byval_arg().get_name(Il2CppTypeNameFormat::IL);
                let signature = format!("{name}_c*");
                type_infos.insert(class, table_pointer);

                out.script_metadata.insert(
                    table_pointer,
                    ScriptMetadata {
                        address: table_pointer,
                        name: format!("{name}_TypeInfo"),
                        signature,
                    },
                );

                false
            }) {
                Ok(true) | Err(_) => break,
                _ => continue,
            }
        }
        TYPE_INFOS.set(type_infos);

        log::debug!("[Script Dumper] dumping method info...");
        let mut metadata_methods: HashMap<i32, HashMap<i32, Vec<MethodInfo>>> = HashMap::new();
        for index in 0..999_999 {
            match microseh::try_seh(|| {
                let table = *((*((*il2cpp::GA_BASE + table_rva) as *const usize)
                    + offsets.get(&3).unwrap()) as *const usize);
                let pointer = table + 8 * index;
                let table_pointer = pointer - *il2cpp::GA_BASE;
                let method = *((pointer) as *const Il2CppMethod);
                if method.0 == 0 {
                    return true;
                }

                let runtime_type = RuntimeType::from_class(method.class()).unwrap();
                let method_info = MethodInfo::from_handle(method).unwrap();

                let name = method
                    .class()
                    .byval_arg()
                    .get_name(Il2CppTypeNameFormat::IL);

                metadata_methods
                    .entry(runtime_type.get_metadata_token())
                    .or_default()
                    .entry(method_info.get_metadata_token())
                    .or_default()
                    .push(method_info);

                out.script_metadata_method.insert(
                    table_pointer,
                    ScriptMetadataMethod {
                        address: table_pointer,
                        name: format!("{}_{}", name, method.get_name()),
                        method_address: method.rva(),
                    },
                );

                false
            }) {
                Ok(true) | Err(_) => break,
                _ => continue,
            }
        }
        METADATA_METHODS.set(metadata_methods).unwrap();

        log::debug!("[Script Dumper] string literal...");
        let mut string_literals = HashMap::new();
        for index in 0..999_999 {
            match microseh::try_seh(|| {
                let table = *((*((*il2cpp::GA_BASE + table_rva) as *const usize)
                    + offsets.get(&5).unwrap()) as *const usize);
                let pointer = table + 8 * index;
                let table_pointer = pointer - *il2cpp::GA_BASE;
                let string = *((pointer) as *const Il2CppString);
                if string.0 == 0 {
                    return true;
                }

                string_literals.insert(table_pointer, string);

                out.script_string.insert(
                    table_pointer,
                    ScriptString {
                        address: table_pointer,
                        value: string.as_str(),
                    },
                );

                false
            }) {
                Ok(true) | Err(_) => break,
                _ => continue,
            }
        }
        STRING_LITERALS.set(string_literals);

        std::fs::write(
            "./DUMP/script-mini.json",
            serde_json::to_string_pretty(&out).unwrap(),
        )
        .unwrap();

        log::debug!("[Script Dumper] Done");
    }
}

fn dump_methods(out: &mut ScriptJson, methods: &mut HashMap<u64, Il2CppMethod>) {
    log::debug!("[Script Dumper] dumping methods...");

    let mut method_idx = 0;
    for typedef_index in 0..MAX_TYPEDEFINDEX.load(Ordering::Relaxed) {
        let class = il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(typedef_index);
        let name = class.byval_arg().get_name(Il2CppTypeNameFormat::IL);
        for method in class.get_methods() {
            out.script_method.insert(
                method_idx,
                ScriptMethod {
                    address: method.rva(),
                    name: format!("{}$${}", name, method.get_name()),
                    signature: String::new(),
                    type_signature: String::new(),
                },
            );
            methods.insert(method.rva() as u64, method);
            method_idx += 1;
        }
    }

    log::debug!("[Script Dumper] dump_methods done");
}

fn scan_address() -> Option<(usize, usize, HashMap<usize, usize>)> {
    let Some(metadata_init_rva) = scan_ga_section("E8 ? ? ? ? C6 05 ? ? ? ? ? EB ? CC CC CC CC")
    else {
        log::debug!("[Script Dumper] Failed to find metadata_init_rva");
        return None;
    };

    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[metadata_init_rva..],
        (*il2cpp::GA_BASE + metadata_init_rva) as u64,
        DecoderOptions::NONE,
    );

    let mut instruction = Instruction::default();

    let mut jump_table_base = None;
    let mut jump_table_offset = None;
    let mut max_case = None;

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        // Find the lea instruction that loads the jump table base
        if instruction.mnemonic() == Mnemonic::Lea && instruction.op0_register() == Register::RDI {
            // This is: lea     rdi, jpt_1838E8730
            jump_table_base = Some(instruction.near_branch64());
        }

        // Find the max case comparison
        if instruction.mnemonic() == Mnemonic::Cmp && instruction.op0_register() == Register::EBX {
            // This is: cmp     ebx, 7
            max_case = Some(instruction.immediate32());
        }

        // Find the jump table access
        if jump_table_offset.is_none()
            && instruction.mnemonic() == Mnemonic::Movsxd
            && instruction.op0_register() == Register::RBX
            && instruction.op1_kind() == OpKind::Memory
        {
            // This is: movsxd  rbx, ds:(jpt_1838E8730 - 1838E8B94h)[rdi+rbx*4]
            jump_table_offset = Some(instruction.memory_displacement32());
        }

        // Stop when we reach the switch jump
        if instruction.mnemonic() == Mnemonic::Jmp && instruction.op0_kind() == OpKind::Register {
            break;
        }
    }

    let mut case_values = HashMap::new();

    // Now parse the jump table if we found all components
    if let (Some(base), Some(offset), Some(max)) = (jump_table_base, jump_table_offset, max_case) {
        // Calculate the actual jump table address
        // In the assembly: jpt_181488F6F - 181489260h
        // So the full address is base + offset
        let jump_table_addr = base.wrapping_add(offset as u64);

        // Read each case from the jump table
        for case_idx in 0..=max {
            // Calculate the original case value (after dec edx)
            let original_case = match case_idx {
                0 => 0,
                1 => 1,
                2 => 2,
                3 => 3,
                4 => 4,
                5 => 5,
                6 => 6,
                _ => continue,
            };

            // Skip the default case (case 2)
            if case_idx == 2 {
                continue;
            }

            // Read the 32-bit offset from the jump table
            let table_offset = (case_idx * 4) as u64;
            let offset_addr = jump_table_addr + table_offset;

            // Safety: Ensure we're reading within bounds
            if offset_addr + 4 <= (*il2cpp::GA_BASE + slice.len()) as u64 {
                let slice_offset = offset_addr as usize - *il2cpp::GA_BASE;
                let offset = i32::from_le_bytes([
                    slice[slice_offset],
                    slice[slice_offset + 1],
                    slice[slice_offset + 2],
                    slice[slice_offset + 3],
                ]);

                // Calculate target address
                let target_addr = base.wrapping_add(offset as u64);

                case_values.insert(original_case, target_addr);

                // Handle case 3 and 6 sharing the same code block
                if original_case == 3 {
                    case_values.insert(6, target_addr);
                }
            }
        }
    }

    fn get_table_and_offset(addr: u64) -> Option<(usize, usize)> {
        let rva = addr as usize - *il2cpp::GA_BASE;
        let slice = game_assembly_slice();
        let mut decoder = Decoder::with_ip(64, &slice[rva..], addr, DecoderOptions::NONE);

        let mut instruction = Instruction::default();

        let mut table = None;
        let mut offset = None;

        while decoder.can_decode() {
            decoder.decode_out(&mut instruction);

            if table.is_none()
                && instruction.mnemonic() == Mnemonic::Mov
                && instruction.op1_kind() == OpKind::Memory
            {
                table = Some(instruction.memory_displacement64() as usize);
                continue;
            }

            if table.is_some() && instruction.mnemonic() == Mnemonic::Mov {
                offset = Some(instruction.memory_displacement64() as usize);
                break;
            }
        }

        if let (Some(table), Some(offset)) = (table, offset) {
            return Some((table, offset));
        }

        None
    }

    let mut table_va = None;
    let mut offsets = HashMap::with_capacity(3);

    for (value, addr) in case_values {
        if let Some((table, offset)) = get_table_and_offset(addr) {
            if let Some(table_va) = table_va
                && table_va != table
            {
                continue;
            }
            table_va = Some(table);
            offsets.insert(value, offset);
        }
    }

    if let Some(table_va) = table_va
        && offsets.len() == 6
    {
        return Some((metadata_init_rva, table_va, offsets));
    }

    None
}
