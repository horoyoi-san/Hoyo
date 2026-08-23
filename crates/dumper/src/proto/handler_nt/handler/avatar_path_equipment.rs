use std::collections::HashMap;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

use crate::proto::output::{ProtoItem, TypeToItemMap};

pub fn process(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let mut map = HashMap::new();

    let handler_class_name = &*crate::proto::method_nt::method::avatar::AVATAR_HANDLER_CLASS;
    if handler_class_name.is_empty() {
        return map;
    }

    let result = il2cpp::get_cached_class(handler_class_name)
        .and_then(|c| RuntimeType::from_class(c).ok())
        .map(|rt| {
            let methods: Vec<_> = rt
                .get_methods_il2cpp()
                .into_iter()
                .filter_map(|m| {
                    let params = m.get_parameters();
                    (params.len() == 1).then(|| {
                        let param_type = params[0].get_parameter_type().ok()?;
                        let return_type = m.get_return_type().ok()?;
                        let ret_name = return_type.il_name();
                        (!ret_name.contains("IEnumerable")).then_some(())?;
                        let rva = m.get_il2cpp_method().rva();
                        (rva != 0).then_some((param_type, rva))
                    })?
                })
                .collect();
            methods
        });

    let Some(methods) = result else {
        return map;
    };

    let proto_fields_map: HashMap<RuntimeType, HashMap<usize, String>> = methods
        .iter()
        .map(|(pt, _)| {
            let fields = type_to_item
                .get(pt)
                .and_then(|item| match &*item.borrow() {
                    ProtoItem::Message(m) => Some(
                        m.fields
                            .iter()
                            .map(|f| (f.offset as usize, f.name.clone()))
                            .collect(),
                    ),
                    _ => None,
                })
                .unwrap_or_default();
            (*pt, fields)
        })
        .collect();

    let slice = game_assembly_slice();
    let ga_base = *il2cpp::GA_BASE;

    for (proto_type, rva) in &methods {
        let data = &slice[*rva..(*rva + 0x80).min(slice.len())];
        let ip = (ga_base + *rva) as u64;

        let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
        let mut insn = Instruction::default();
        let mut proto_reg = Register::None;

        while decoder.can_decode() && proto_reg == Register::None {
            decoder.decode_out(&mut insn);
            if insn.mnemonic() == Mnemonic::Mov
                && insn.op0_kind() == OpKind::Register
                && insn.op1_register() == Register::RCX
            {
                proto_reg = insn.op0_register().full_register();
            }
        }

        if proto_reg == Register::None {
            continue;
        }

        let proto_fields = proto_fields_map
            .get(proto_type)
            .cloned()
            .unwrap_or_default();

        let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
        while decoder.can_decode() {
            decoder.decode_out(&mut insn);
            if insn.mnemonic() == Mnemonic::Ret {
                break;
            }

            if (insn.mnemonic() == Mnemonic::Mov || insn.mnemonic() == Mnemonic::Movzx)
                && insn.op1_kind() == OpKind::Memory
                && insn.memory_base().full_register() == proto_reg
            {
                let proto_off = insn.memory_displacement64() as usize;
                if let Some(obf_name) = proto_fields.get(&proto_off) {
                    map.insert(obf_name.clone(), "path_equipment_id".to_string());
                }
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Handler NT] AvatarPathEquipment: no NT generate");
    }

    map
}
