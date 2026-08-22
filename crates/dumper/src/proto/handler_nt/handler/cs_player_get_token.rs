use std::collections::HashMap;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

use crate::proto::output::{ProtoItem, TypeToItemMap};

use super::build_game_offset_map;

pub fn process(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let mut map = HashMap::new();

    let result = il2cpp::get_cached_class("RPG.Client.RPGSDKAccountManager")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .map(|rt| {
            let sdk_methods: Vec<(String, usize)> = rt
                .get_methods_il2cpp()
                .into_iter()
                .filter_map(|m| {
                    let rva = m.get_il2cpp_method().rva();
                    (rva != 0).then(|| {
                        let name = m.get_name().ok()?.as_str().to_string();
                        Some((name, rva))
                    })?
                })
                .collect();
            (build_game_offset_map(rt), sdk_methods)
        });

    let Some((game_fields, sdk_methods)) = result else {
        return map;
    };

    let handler_entry = crate::proto::handler_nt::CS_HANDLER_TABLE
        .get()
        .and_then(|table| {
            table
                .iter()
                .find(|(_, deobf, _)| deobf == "PlayerGetTokenCsReq")
        });

    let Some((obf_name, _, handler_rva)) = handler_entry else {
        log::debug!("[Handler NT] PlayerGetToken: not found in handler table");
        return map;
    };

    let handler_rva = *handler_rva;

    let proto_type = type_to_item
        .keys()
        .find(|rt| rt.il_name() == obf_name.as_str())
        .copied();
    let Some(proto_type) = proto_type else {
        log::debug!("[Handler NT] PlayerGetToken: proto type not in type_to_item");
        return map;
    };

    let proto_fields: HashMap<usize, String> = type_to_item
        .get(&proto_type)
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

    let slice = game_assembly_slice();
    let ga_base = *il2cpp::GA_BASE;
    let data = &slice[handler_rva..(handler_rva + 0x3F0).min(slice.len())];
    let ip = (ga_base + handler_rva) as u64;
    let obj_new_rva = *crate::proto::IL2CPP_OBJECT_NEW_RVA;

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut insn = Instruction::default();

    let mut proto_reg = Register::None;
    let mut game_reg = Register::None;
    let mut rip_reg = Register::None;
    let mut alloc_seen = false;

    while decoder.can_decode() && (proto_reg == Register::None || game_reg == Register::None) {
        decoder.decode_out(&mut insn);

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base() == Register::RIP
        {
            rip_reg = insn.op0_register().full_register();
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base().full_register() == rip_reg
            && insn.memory_index() == Register::None
        {
            game_reg = insn.op0_register().full_register();
        }

        if (insn.mnemonic() == Mnemonic::Call || insn.mnemonic() == Mnemonic::Jmp)
            && insn.near_branch_target() as usize - ga_base == obj_new_rva
        {
            alloc_seen = true;
        }

        if alloc_seen
            && insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_register() == Register::RAX
        {
            proto_reg = insn.op0_register().full_register();
        }
    }

    if proto_reg == Register::None {
        log::debug!("[Handler NT] PlayerGetToken: proto_reg not found");
        return map;
    }

    if game_reg == Register::None {
        log::debug!("[Handler NT] PlayerGetToken: game_reg not found");
        return map;
    }

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut reg_field: HashMap<Register, u64> = HashMap::new();
    let mut last_call_target: Option<u64> = None;

    while decoder.can_decode() {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() == Mnemonic::Ret {
            break;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base().full_register() == game_reg
            && insn.memory_index() == Register::None
        {
            reg_field.insert(
                insn.op0_register().full_register(),
                insn.memory_displacement64(),
            );
            continue;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Register
            && let Some(&v) = reg_field.get(&insn.op1_register().full_register())
        {
            reg_field.insert(insn.op0_register().full_register(), v);
            continue;
        }

        if insn.mnemonic() == Mnemonic::Call {
            last_call_target = Some(insn.near_branch_target());
            for r in [
                Register::RAX,
                Register::RCX,
                Register::RDX,
                Register::R8,
                Register::R9,
                Register::R10,
                Register::R11,
            ] {
                reg_field.remove(&r);
            }
            continue;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Memory
            && insn.memory_base().full_register() == proto_reg
            && insn.memory_index() == Register::None
        {
            let proto_off = insn.memory_displacement64() as usize;
            let Some(obf_field) = proto_fields.get(&proto_off) else {
                continue;
            };

            if insn.op1_kind() == OpKind::Register {
                let src = insn.op1_register().full_register();
                if let Some(&game_off) = reg_field.get(&src)
                    && let Some(readable) = game_fields.get(&(game_off as usize))
                {
                    log::debug!("[Handler NT] PlayerGetToken: {obf_field} -> {readable}");
                    map.insert(obf_field.clone(), readable.clone());
                    continue;
                }

                if src == Register::RAX
                    && let Some(call_target) = last_call_target
                {
                    let call_rva = call_target as usize - ga_base;
                    if let Some(readable) = sdk_methods
                        .iter()
                        .find(|(_, rva)| *rva == call_rva)
                        .and_then(|(name, _)| name.strip_prefix("Get"))
                    {
                        log::debug!("[Handler NT] PlayerGetToken: {obf_field} -> {readable}");
                        map.insert(obf_field.clone(), readable.to_string());
                    }
                }
            }

            if matches!(
                insn.op1_kind(),
                OpKind::Immediate8 | OpKind::Immediate8to32 | OpKind::Immediate32
            ) && insn.immediate32() == 1
            {
                log::debug!("[Handler NT] PlayerGetToken: {obf_field} -> SignType");
                map.insert(obf_field.clone(), "SignType".to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Handler NT] PlayerGetToken: no NT generated");
    }
    map
}
