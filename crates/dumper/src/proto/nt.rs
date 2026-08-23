use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::Ordering;

use crate::{
    proto::{
        FIGHT_GAME_SEND, IL2CPP_OBJECT_NEW_RVA, MessageMinimalInfo, NETWORK_MANAGER_SEND_NAME,
        NETWORK_MANAGER_SEND_VA, XLUA_OBJECT_TRANSLATOR_DELEGATE,
        XLUA_OBJECT_TRANSLATOR_METHOD_CLASS, XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS,
        XLUA_REGISTER_OBJECT_RVA,
    },
    script::TYPE_INFOS,
};
use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use il2cpp::vm::method::Il2CppMethod;
use il2cpp::{
    FUNCTIONS_TABLE_REFLECTION, GA_BASE,
    api::Il2CppClass,
    get_cached_class, get_native_method,
    vm::{
        metadata_cache, native_collections::Dictionary, object::Il2CppObject, r#type::Il2CppType,
        value::Il2CppValue,
    },
};
use reflection::{field_info::FieldInfo, runtime_type::RuntimeType};
use std::borrow::Cow;
use utils::game_assembly_slice;

pub fn get_rsp_notify_map() -> HashMap<RuntimeType, u16> {
    let start = il2cpp::ASSEMBLY_CSHARP_START.load(Ordering::Relaxed);
    let end = il2cpp::MAX_TYPEDEFINDEX.load(Ordering::Relaxed);

    for typedef_index in start..end {
        let class = metadata_cache::get_typeinfo_from_typedefindex(typedef_index);
        let runtime_type = match RuntimeType::from_class(class) {
            Ok(rt) => rt,
            Err(_) => continue,
        };

        let fields = runtime_type.get_fields(62);
        for field in fields {
            if let Ok(ft) = field.get_field_type() {
                if ft.format_type_name(true) == "Dictionary<RuntimeTypeHandle, ushort>" {
                    if let Ok(val) = field.get_value(Il2CppObject::NULL) {
                        if !val.is_null() {
                            let dict = unsafe { *(val.0 as *const Dictionary<Il2CppType, u16>) };
                            let mut map = HashMap::new();
                            for (ty, cmdid) in dict.iter() {
                                if let Ok(rt) = RuntimeType::from_il2cpp_type(ty) {
                                    map.insert(rt, cmdid);
                                }
                            }
                            if !map.is_empty() {
                                log::debug!("[Proto Dumper] Found rsp/notify map with {} entries", map.len());
                                return map;
                            }
                        }
                    }
                }
            }
        }
    }

    log::warn!("[Proto Dumper] cannot find nt field for rsp/notify map");
    HashMap::new()
}

fn get_req_method_va_name_map() -> HashMap<usize, String> {
    let mut output = HashMap::new();

    let mappings = disasm_obf_deobf_method_by_xlua_obj_translator();
    let mut unique_methods = HashMap::<Cow<'static, str>, Vec<Il2CppMethod>>::new();
    FUNCTIONS_TABLE_REFLECTION
        .get()
        .unwrap()
        .iter()
        .for_each(|v| unique_methods.entry(v.1.get_name()).or_default().push(*v.1));

    for (obf, deobf) in mappings {
        if !deobf.ends_with("Req") {
            continue;
        }

        let Some(methods) = unique_methods.get(&Cow::Borrowed(obf.as_str())) else {
            continue;
        };

        for method in methods {
            if method.class().byval_arg().il_name() == *XLUA_OBJECT_TRANSLATOR_METHOD_CLASS {
                continue;
            }

            output.insert(method.va(), deobf.clone());
        }
    }

    output
}

fn disasm_obf_deobf_method_by_xlua_obj_translator() -> HashMap<String, String> {
    let mut output = HashMap::new();

    let delegate_class = get_cached_class(&XLUA_OBJECT_TRANSLATOR_DELEGATE).unwrap();
    let delegate_type_rva = *TYPE_INFOS.get().unwrap().get(&delegate_class).unwrap();

    let obj_translator_fields_class =
        get_cached_class(&XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS).unwrap();
    let obj_translator_fields = obj_translator_fields_class
        .get_fields()
        .into_iter()
        .map(|v| {
            (
                v.offset(),
                strip_prefixes(
                    FieldInfo::from_il2cpp_field(v)
                        .unwrap()
                        .get_name()
                        .unwrap()
                        .as_str()
                        .split_once("__")
                        .map(|(_, rest)| rest)
                        .unwrap(),
                    &["Send"],
                )
                .to_string(),
            )
        })
        .collect::<HashMap<_, _>>();

    let slice = game_assembly_slice();
    let xlua_register_object_rva = *XLUA_REGISTER_OBJECT_RVA;
    let mut decoder = Decoder::with_ip(
        64,
        &slice[xlua_register_object_rva..],
        *GA_BASE as u64 + xlua_register_object_rva as u64,
        DecoderOptions::NONE,
    );

    let mut instructions = VecDeque::<Instruction>::with_capacity(500);
    let mut instruction = Instruction::default();

    let mut static_field_offset = None;
    let mut push_cnt = 0;
    let mut past_prologue = false;

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        if instruction.mnemonic() == Mnemonic::Push {
            if past_prologue {
                push_cnt += 1;

                if push_cnt > 4 {
                    break;
                }
            }
        } else {
            past_prologue = true;
        }

        // mov rcx, cs:XLUA_DELEGATE_TYPE_INFO_VA
        if instruction.mnemonic() == Mnemonic::Mov
            && instruction.op0_register() == Register::RCX
            && instruction.op1_kind() == OpKind::Memory
            && instruction.memory_displacement64() == (delegate_type_rva + *il2cpp::GA_BASE) as u64
        {
            // traverse to find the displacement register
            let mut found_offset = None;
            for i in (0..instructions.len()).rev() {
                let inst = instructions[i];

                if inst.mnemonic() != Mnemonic::Mov {
                    continue;
                }

                let offset = (is_gp64_register(inst.op0_register())
                    && inst.op1_kind() == OpKind::Memory
                    || inst.op0_kind() == OpKind::Memory)
                    .then(|| inst.memory_displacement64());

                let Some(offset) = offset else {
                    continue;
                };

                if obj_translator_fields.contains_key(&(offset as usize)) {
                    found_offset = Some(offset);
                    break;
                }
            }

            if let Some(offset) = found_offset {
                static_field_offset = Some(offset);
            }

            continue;
        }

        // static_field_offset already set
        // call to il2cpp_object_new
        let il2cpp_object_new_rva = *IL2CPP_OBJECT_NEW_RVA;
        if let Some(offset) = static_field_offset
            && instruction.mnemonic() == Mnemonic::Call
            && instruction.near_branch_target() == (*il2cpp::GA_BASE + il2cpp_object_new_rva) as u64
        {
            decoder.decode_out(&mut instruction); // skip mov rsi, rax
            decoder.decode_out(&mut instruction);

            // mov rax, cs::METHOD_INFO_VA
            if instruction.mnemonic() == Mnemonic::Mov && instruction.op1_kind() == OpKind::Memory {
                let type_va = instruction.memory_displacement64() as usize;

                let method = unsafe { *(type_va as *const Il2CppMethod) };
                if method.0 == 0 {
                    static_field_offset = None;
                    continue;
                }

                let Some(field_name) = obj_translator_fields.get(&(offset as usize)) else {
                    static_field_offset = None;
                    continue;
                };

                let name = method.get_name();

                output.insert(name.to_string(), field_name.to_string());
                static_field_offset = None;
            }

            continue;
        }

        instructions.push_back(instruction);
    }

    output
}

pub fn get_req_map(
    minimal_info: &HashMap<RuntimeType, MessageMinimalInfo>,
    rsp_notify_map: &HashMap<RuntimeType, u16>,
    req_map: &mut HashMap<RuntimeType, (u16, Option<String>)>,
) -> HashMap<RuntimeType, Vec<String>> {
    let type_info_rvas = minimal_info
        .iter()
        .filter(|(ty, _)| !ty.get_isenum().unwrap().unbox() && !rsp_notify_map.contains_key(ty))
        .filter_map(|(ty, _)| {
            TYPE_INFOS
                .get()
                .unwrap()
                .get(&ty.get_il2cpp_type().get_class())
                .copied()
        })
        .collect::<HashSet<_>>();

    let mut targets = HashMap::with_capacity(3);

    if let Some(m) = get_native_method(&format!(
        "RPG.Client.NetworkManager::{}(System.UInt16,Google.Protobuf.IMessage,System.Boolean)",
        *NETWORK_MANAGER_SEND_NAME
    )) {
        targets.insert(m.va(), ReqFlavor::Standard);
    }
    let networkmanager_send_va2 = *NETWORK_MANAGER_SEND_VA;
    let networkmanager_send_va3 = *FIGHT_GAME_SEND;

    if networkmanager_send_va2 != 0 {
        targets.insert(networkmanager_send_va2, ReqFlavor::Standard);
    }
    if networkmanager_send_va3 != 0 {
        targets.insert(networkmanager_send_va3, ReqFlavor::Fight);
    }

    disasm_all_req(&type_info_rvas, targets, rsp_notify_map, req_map)
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
enum ReqFlavor {
    Standard, // DX, R8
    Fight,    // R8, R9
}

fn disasm_all_req(
    type_info_rvas: &HashSet<usize>,
    targets: HashMap<usize, ReqFlavor>,
    rsp_notify_map: &HashMap<RuntimeType, u16>,
    out: &mut HashMap<RuntimeType, (u16, Option<String>)>,
) -> HashMap<RuntimeType, Vec<String>> {
    let va_deobf_map = get_req_method_va_name_map();
    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(64, slice, *GA_BASE as u64, DecoderOptions::NONE);

    let mut instruction = Instruction::default();
    let mut instructions = VecDeque::<Instruction>::with_capacity(500);
    let mut req_rvas: HashMap<RuntimeType, Vec<String>> = HashMap::new();

    #[derive(Debug, Eq, PartialEq, Clone, Copy)]
    enum InstType {
        Memory { base: Register, displacement: i64 },
        Normal(Register),
    }

    impl InstType {
        pub fn new(op_kind: OpKind, reg: Register, memory: Register, displacement: i64) -> Self {
            if op_kind == OpKind::Memory {
                Self::Memory {
                    base: memory,
                    displacement,
                }
            } else {
                Self::Normal(reg)
            }
        }
        pub fn is_rax(&self) -> bool {
            match self {
                InstType::Memory { base, .. } => *base == Register::RAX,
                InstType::Normal(register) => *register == Register::RAX,
            }
        }
        pub fn is_none(&self) -> bool {
            match self {
                InstType::Memory { base, .. } => *base == Register::None,
                InstType::Normal(register) => *register == Register::None,
            }
        }
    }

    type CandidateInfo = (HashSet<u16>, HashSet<Option<String>>, Vec<String>);
    let mut candidates: HashMap<RuntimeType, CandidateInfo> = HashMap::new();
    let mut cur_func_va = None;

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        if instruction.mnemonic() == Mnemonic::Push
            && let Some(prev) = instructions.back()
            && prev.mnemonic() != Mnemonic::Push
        {
            cur_func_va = Some(instruction.ip());
            instructions.clear();
        }

        if (instruction.mnemonic() == Mnemonic::Jmp || instruction.mnemonic() == Mnemonic::Call)
            && let Some(&flavor) = targets.get(&(instruction.near_branch_target() as usize))
        {
            let mut obj_register = None;
            let mut cmd_id = None;
            let mut push_rva = None;
            let mut last_push_index = None;

            let mut i = instructions.len();
            while i > 0 {
                i -= 1;
                if instructions[i].mnemonic() == Mnemonic::Push {
                    last_push_index = Some(i);
                } else if last_push_index.is_some() {
                    break;
                }
            }
            if let Some(push_index) = last_push_index {
                push_rva = Some(instructions[push_index].ip() as usize - *GA_BASE);
            }

            for i in (0..instructions.len()).rev() {
                let inst = instructions[i];
                if inst.mnemonic() == Mnemonic::Push {
                    break;
                }

                // 1: CmdId
                if cmd_id.is_none() && inst.mnemonic() == Mnemonic::Mov {
                    let reg = inst.op0_register();
                    let is_match = match flavor {
                        ReqFlavor::Standard => reg == Register::DX,
                        ReqFlavor::Fight => reg == Register::R8 || reg == Register::R8W,
                    };
                    if is_match {
                        let id = inst.immediate16();
                        if id != 0 && !rsp_notify_map.values().any(|&v| v == id) {
                            cmd_id = Some(id);
                        }
                    }
                    if cmd_id.is_some() {
                        continue;
                    }
                }

                // 2: Object Register
                if obj_register.is_none() && inst.mnemonic() == Mnemonic::Mov {
                    let reg = inst.op0_register();
                    let is_match = match flavor {
                        ReqFlavor::Standard => reg == Register::R8,
                        ReqFlavor::Fight => reg == Register::R9,
                    };
                    if is_match {
                        obj_register = Some(InstType::new(
                            inst.op1_kind(),
                            inst.op1_register(),
                            inst.memory_base(),
                            inst.memory_displacement64() as i64,
                        ));
                        continue;
                    }
                }

                // 3: register
                if let Some(reg) = obj_register
                    && inst.mnemonic() == Mnemonic::Mov
                    && (InstType::new(
                        inst.op0_kind(),
                        inst.op0_register(),
                        inst.memory_base(),
                        inst.memory_displacement64() as i64,
                    ) == reg)
                    && !reg.is_rax()
                {
                    let new = InstType::new(
                        inst.op1_kind(),
                        inst.op1_register(),
                        inst.memory_base(),
                        inst.memory_displacement64() as i64,
                    );
                    if !new.is_none() {
                        obj_register = Some(new);
                    }
                    continue;
                }

                // 4: Identification
                if let Some(cmd_id) = cmd_id
                    && let Some(reg) = obj_register
                {
                    // A: il2cpp_object_new
                    if reg.is_rax()
                        && (inst.mnemonic() == Mnemonic::Call || inst.mnemonic() == Mnemonic::Jmp)
                    {
                        let target_va = inst.near_branch_target() as usize;
                        if target_va - *GA_BASE == *IL2CPP_OBJECT_NEW_RVA {
                            let va = instructions[i - 1].memory_displacement64() as usize;
                            if type_info_rvas.contains(&(va - *GA_BASE)) {
                                let class = unsafe { *(va as *const Il2CppClass) };
                                if let Ok(rt) = RuntimeType::from_class(class) {
                                    let deobf_name = cur_func_va
                                        .and_then(|v| va_deobf_map.get(&(v as usize)).cloned());
                                    let entry = candidates.entry(rt).or_insert_with(|| {
                                        (HashSet::new(), HashSet::new(), Vec::new())
                                    });
                                    entry.0.insert(cmd_id);
                                    entry.1.insert(deobf_name);
                                    if let Some(prva) = push_rva {
                                        entry.2.push(format!("0x{prva:X}"));
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    // B: Cmp
                    if flavor == ReqFlavor::Standard
                        && inst.mnemonic() == Mnemonic::Cmp
                        && inst.op0_kind() == OpKind::Memory
                        && inst.memory_base()
                            == match reg {
                                InstType::Normal(r) => r,
                                InstType::Memory { base, .. } => base,
                            }
                    {
                        let type_info_reg = inst.op1_register();
                        if type_info_reg != Register::None {
                            for j in (0..i).rev() {
                                let prev = instructions[j];
                                if prev.mnemonic() == Mnemonic::Mov
                                    && prev.op0_register() == type_info_reg
                                {
                                    let va = prev.memory_displacement64() as usize;
                                    if type_info_rvas.contains(&(va - *GA_BASE)) {
                                        let class = unsafe { *(va as *const Il2CppClass) };
                                        if let Ok(rt) = RuntimeType::from_class(class) {
                                            let deobf_name = cur_func_va.and_then(|v| {
                                                va_deobf_map.get(&(v as usize)).cloned()
                                            });
                                            let entry = candidates.entry(rt).or_insert_with(|| {
                                                (HashSet::new(), HashSet::new(), Vec::new())
                                            });
                                            entry.0.insert(cmd_id);
                                            entry.1.insert(deobf_name);
                                            if let Some(prva) = push_rva {
                                                entry.2.push(format!("0x{prva:X}"));
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                            if candidates.values().any(|v| v.0.contains(&cmd_id)) {
                                break;
                            }
                        }
                    }
                }
            }
        }
        if instructions.len() >= 500 {
            instructions.pop_front();
        }
        instructions.push_back(instruction);
    }

    for (rt, (ids, names, rvas)) in candidates {
        if ids.len() == 1 {
            out.insert(
                rt,
                (
                    *ids.iter().next().unwrap(),
                    names.into_iter().flatten().next(),
                ),
            );
            req_rvas.insert(rt, rvas);
        }
    }
    req_rvas
}

pub fn get_rsp_notify_names() -> HashMap<String, String> {
    let cached_methods = FUNCTIONS_TABLE_REFLECTION.get().unwrap();
    let prefixes_to_replace = ["_OnCmd", "_Cmd", "_On", "OnCmd", "On", "Cmd"];

    let mut nt_map = HashMap::new();

    for (m_name, m) in cached_methods {
        if !m_name.ends_with("(System.UInt16,System.Object)") {
            continue;
        }

        let Some(proto_class) = disasm_rsp_notify_3_args(m.rva()) else {
            continue;
        };

        let m_name = m.get_name();
        for prefix in prefixes_to_replace {
            if let Some(name) = m_name.strip_prefix(prefix) {
                let _ = microseh::try_seh(|| {
                    nt_map.insert(
                        RuntimeType::from_class(proto_class)
                            .unwrap()
                            .format_type_name(true),
                        name.to_string()
                            .replace("Cmd", "")
                            .replace("ScRep", "ScRsp"),
                    );
                });
            }
        }
    }

    nt_map
}

pub fn get_rsp_notify_method_rvas() -> HashMap<String, Vec<String>> {
    let cached_methods = FUNCTIONS_TABLE_REFLECTION.get().unwrap();
    let prefixes_to_replace = ["_OnCmd", "_Cmd", "_On", "OnCmd", "On", "Cmd"];

    let mut rva_map: HashMap<String, Vec<String>> = HashMap::new();

    for (m_name, m) in cached_methods {
        if !m_name.ends_with("(System.UInt16,System.Object)") {
            continue;
        }

        let Some(proto_class) = disasm_rsp_notify_3_args(m.rva()) else {
            continue;
        };

        let m_name_str = m.get_name();
        for prefix in prefixes_to_replace {
            if m_name_str.starts_with(prefix) {
                let _ = microseh::try_seh(|| {
                    let formatted_name = RuntimeType::from_class(proto_class)
                        .unwrap()
                        .format_type_name(true)
                        .replace("ScRep", "ScRsp");

                    rva_map
                        .entry(formatted_name)
                        .or_default()
                        .push(format!("0x{:X}", m.rva()));
                });
                break;
            }
        }
    }

    rva_map
}

fn disasm_rsp_notify_3_args(rva: usize) -> Option<Il2CppClass> {
    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[rva..],
        (*GA_BASE + rva) as u64,
        DecoderOptions::NONE,
    );

    let mut instruction = Instruction::default();

    let mut is_passing_push = false;
    let mut current_r8_reg = Register::R8;
    let mut current_dereferenced_reg = None;

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        // Move current r8 reg into another reg
        // mov new_current_r8_reg, current_r8_reg
        if instruction.mnemonic() == Mnemonic::Mov && instruction.op1_register() == current_r8_reg {
            current_r8_reg = instruction.op0_register();
            is_passing_push = true;
        }

        // detect if current_r8_reg is being dereferenced
        // mov current_dereferenced_reg, [current_r8_reg]
        if instruction.op1_kind() == OpKind::Memory && instruction.memory_base() == current_r8_reg {
            current_dereferenced_reg = Some(instruction.op0_register());
        }

        // cmp current_dereferenced_reg, cs:PROTO_TYPE
        if instruction.mnemonic() == Mnemonic::Cmp
            && let Some(reg) = current_dereferenced_reg
            && instruction.op0_register() == reg
            && instruction.op1_kind() == OpKind::Memory
        {
            let va = instruction.memory_displacement64() as usize;
            match microseh::try_seh(|| {
                let class = unsafe { *(va as *const Il2CppClass) };
                if class.0 != 0 { Some(class) } else { None }
            }) {
                Ok(data) => return data,
                Err(_err) => {
                    return None;
                }
            }
        }

        // already out of current sub_
        if is_passing_push && instruction.mnemonic() == Mnemonic::Push {
            break;
        }
    }

    None
}

fn strip_prefixes<'a>(s: &'a str, prefixes: &[&str]) -> &'a str {
    for p in prefixes {
        if let Some(rest) = s.strip_prefix(p) {
            return rest;
        }
    }
    s
}

fn is_gp64_register(register: Register) -> bool {
    matches!(
        register,
        Register::RAX
            | Register::RCX
            | Register::RDX
            | Register::RBX
            | Register::RSP
            | Register::RBP
            | Register::RSI
            | Register::RDI
            | Register::R8
            | Register::R9
            | Register::R10
            | Register::R11
            | Register::R12
            | Register::R13
            | Register::R14
            | Register::R15
    )
}
