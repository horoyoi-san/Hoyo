use std::collections::HashMap;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

use crate::proto::output::{ProtoItem, TypeToItemMap};

use super::build_game_offset_map;

pub fn process(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let mut map = HashMap::new();

    let result = il2cpp::get_cached_class("RPG.Client.TeamModule")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .and_then(|rt| {
            let method = rt
                .get_methods_il2cpp()
                .into_iter()
                .find(|m| m.get_name().is_ok_and(|n| n.as_str() == "_UpdateTeamData"))?;
            let proto = method
                .get_parameters()
                .get(1)
                .and_then(|p| p.get_parameter_type().ok())?;
            let game = method
                .get_parameters()
                .first()
                .and_then(|p| p.get_parameter_type().ok())?;
            let rva = method.get_il2cpp_method().rva();
            (rva != 0).then_some((build_game_offset_map(game), proto, rva))
        });
    let Some((game_fields, proto_type, rva)) = result else {
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
    let data = &slice[rva..(rva + 0x7C6).min(slice.len())];
    let ip = (*il2cpp::GA_BASE + rva) as u64;

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut insn = Instruction::default();
    let mut proto_reg = Register::None;
    let mut game_reg = Register::None;

    while decoder.can_decode() && (proto_reg == Register::None || game_reg == Register::None) {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() != Mnemonic::Mov {
            continue;
        }
        if insn.op1_register() == Register::R8 {
            proto_reg = insn.op0_register();
        }
        if insn.op1_register() == Register::RDX {
            game_reg = insn.op0_register();
        }
    }

    if proto_reg == Register::None || game_reg == Register::None {
        log::debug!("[Handler NT] Relic: reg detection failed");
        return map;
    }

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut pending = None::<u32>;

    while decoder.can_decode() {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() == Mnemonic::Ret {
            break;
        }

        if (insn.mnemonic() == Mnemonic::Mov || insn.mnemonic() == Mnemonic::Movzx)
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base() == proto_reg
        {
            pending = Some(insn.memory_displacement32());
            continue;
        }

        if pending.is_some()
            && insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Memory
            && insn.memory_base() == game_reg
        {
            let proto_off = pending.take().unwrap();
            let game_off = insn.memory_displacement32() as usize;
            if let (Some(pn), Some(gn)) = (
                proto_fields.get(&(proto_off as usize)),
                game_fields.get(&game_off),
            ) {
                map.insert(pn.clone(), gn.clone());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Handler NT] Relic: no NT generate");
    }
    map
}
