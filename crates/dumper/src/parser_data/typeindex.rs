use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind};
use il2cpp::{
    GA_BASE,
    api::Il2CppArray,
    get_cached_class, get_native_method,
    vm::{class::Il2CppClass, object::Il2CppObject, value::Void},
};
use reflection::{assembly, method_info::MethodInfo, runtime_type::RuntimeType};
use utils::game_assembly_slice;

use std::{
    collections::{BTreeMap, HashMap},
    sync::LazyLock,
};

use crate::parser_data::{BINARY_READER_CLASS, FROM_BINARY_FUNC_NAME};

static METHOD_MAP: LazyLock<HashMap<Il2CppClass, MethodInfo>> = LazyLock::new(HashMap::default);

pub fn dump_type_indexes() -> HashMap<Il2CppClass, BTreeMap<u32, Option<Il2CppClass>>> {
    let assemblies = assembly::get_assemblies();
    let asm = assemblies
        .iter()
        .find(|asm| asm.get_name() == "RPG.GameCore.Config")
        .unwrap();

    let mut output = HashMap::new();

    for ty in asm.get_types() {
        let class = ty.get_il2cpp_type().get_class();
        let type_name = ty.il_name();

        let Some(from_binary) = get_native_method(&format!(
            "{type_name}::{from_binary_func}({binary_reader_class},{type_name}&)",
            from_binary_func = *FROM_BINARY_FUNC_NAME,
            binary_reader_class = *BINARY_READER_CLASS
        ))
        .or_else(|| {
            get_native_method(&format!(
                "{type_name}::FromBinary({binary_reader_class},{type_name}&)",
                binary_reader_class = *BINARY_READER_CLASS
            ))
        }) else {
            continue;
        };

        unsafe {
            #[allow(invalid_reference_casting)]
            let map = &mut *(&*METHOD_MAP as *const _ as *mut HashMap<Il2CppClass, MethodInfo>);
            map.insert(class, MethodInfo::from_handle(from_binary).unwrap());
        }

        let ctor = get_native_method(&format!("{}::.ctor()", ty.il_name()));

        let mut type_indexes = BTreeMap::new();

        for i in 0..5000u32 {
            let mut out = ty.get_il2cpp_type().get_class().create_instance();
            if let Some(ctor) = ctor {
                ctor.invoke::<Void>(out, &[]).unwrap();
            }

            let class_before = out.get_class();

            let result = microseh::try_seh(|| {
                from_binary.invoke::<Void>(
                    Il2CppObject::NULL,
                    &[
                        &create_binary_reader(&encode_varint(i)),
                        &Il2CppObject(&mut out.0 as *mut usize as _),
                    ],
                )
            });

            match result {
                Ok(Ok(_)) => {}
                Ok(Err(_)) => {
                    if i > 1 {
                        // allow invalid typeindex at 0 and 1
                        break;
                    }
                    continue;
                }
                Err(_) => {
                    continue;
                }
            }

            let class_after = out.get_class();

            if i > 0 && class_after == class_before {
                type_indexes.clear();
                break;
            }

            type_indexes.insert(i, Some(class_after));
        }

        if !type_indexes.is_empty() {
            if type_indexes.len() == 1
                && let Some(first) = type_indexes.get(&0)
                && let Some(typeindex_class) = first
                && *typeindex_class == class
            {
                continue;
            }

            if !type_indexes.is_empty() {
                output.insert(class, type_indexes);
            }
        }
    }

    output
}

fn encode_varint(mut value: u32) -> Vec<u8> {
    let mut buf = Vec::with_capacity(10);
    while value >= 0x80 {
        buf.push(((value as u8) & 0x7F) | 0x80);
        value >>= 7;
    }
    buf.push(value as u8);
    buf
}

fn create_binary_reader(data: &[u8]) -> Il2CppObject {
    let class = get_cached_class(&BINARY_READER_CLASS).unwrap();
    let ty = RuntimeType::from_class(class).unwrap();
    let obj = class.create_instance();
    get_native_method(&format!(
        "{binary_reader_class}::.ctor()",
        binary_reader_class = *BINARY_READER_CLASS
    ))
    .unwrap()
    .invoke::<Void>(obj, &[])
    .unwrap();

    let mut arr = Il2CppArray::new(
        get_cached_class("System.Byte").unwrap().get_array_class(1),
        128,
    );
    arr.as_mut_slice()[..data.len()].copy_from_slice(data);

    for field in ty.get_fields_il2cpp() {
        if field.get_field_type().unwrap().il_name() == "System.Byte[]" {
            field.set_value(obj, Il2CppObject(arr.0)).unwrap();
            break;
        }
    }

    obj
}

pub fn is_skip_exist_flag(class: Il2CppClass) -> Option<bool> {
    let method = METHOD_MAP.get(&class)?;

    let rva = method.get_il2cpp_method().rva();
    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[rva..],
        (*GA_BASE + rva) as u64,
        DecoderOptions::NONE,
    );

    let mut in_body = false;

    while decoder.can_decode() {
        let mut instruction = Instruction::default();
        decoder.decode_out(&mut instruction);

        let is_push = instruction.mnemonic() == Mnemonic::Push;
        if !in_body && !is_push {
            in_body = true;
        } else if in_body && is_push {
            break;
        }

        if instruction.mnemonic() == Mnemonic::Mov
            && instruction.op0_kind() == OpKind::Memory
            && instruction.memory_displacement64() == 0x10
            && instruction.op1_kind() == OpKind::Immediate8
            && instruction.immediate8() == 1
        {
            decoder.decode_out(&mut instruction);
            if instruction.mnemonic() != Mnemonic::Mov {
                return None;
            }

            decoder.decode_out(&mut instruction);
            if instruction.mnemonic() != Mnemonic::Add {
                return None;
            }

            return Some(true);
        }
    }

    None
}
