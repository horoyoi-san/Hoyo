use std::collections::HashMap;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

use crate::proto::output::{ProtoItem, TypeToItemMap};

use super::{VOLATILE_REGS, full_reg};
use crate::proto::handler_nt::handler::build_game_offset_map;

pub fn process(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let mut map = HashMap::new();

    let Some((game_fields, proto_type, rva)) =
        il2cpp::get_cached_class("RPG.Client.ServerDispatchData")
            .and_then(|c| RuntimeType::from_class(c).ok())
            .and_then(|rt| {
                let m = rt.get_methods_il2cpp().into_iter().find(|m| {
                    m.get_name()
                        .is_ok_and(|n| n.as_str() == "_ParseServerDispatchData")
                })?;
                let proto = m
                    .get_parameters()
                    .first()
                    .and_then(|p| p.get_parameter_type().ok())?;
                let rva = m.get_il2cpp_method().rva();
                (rva != 0).then_some((build_game_offset_map(rt), proto, rva))
            })
    else {
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

    if let Some(item) = type_to_item.get(&proto_type)
        && let ProtoItem::Message(m) = &*item.borrow()
    {
        let field_num_map: HashMap<u32, String> = m
            .fields
            .iter()
            .map(|f| (f.number, f.name.clone()))
            .collect();
        super::decode_gateway::set_proto_fields(field_num_map);
    }

    let slice = game_assembly_slice();
    let data = &slice[rva..rva + 0xF70];
    let ip = (*il2cpp::GA_BASE + rva) as u64;

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut insn = Instruction::default();
    let mut proto_reg = Register::None;
    let mut game_regs = Vec::new();
    let mut seen_call = false;

    while decoder.can_decode() && (proto_reg == Register::None || game_regs.len() < 3) {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() == Mnemonic::Call {
            seen_call = true;
            continue;
        }
        if seen_call {
            if insn.mnemonic() == Mnemonic::Mov
                && (insn.op1_register() == Register::RAX || insn.op0_register() == Register::RAX)
            {
                let reg = full_reg(insn.op0_register());
                if !game_regs.contains(&reg) {
                    game_regs.push(reg);
                }

                if game_regs.len() >= 3 {
                    seen_call = false;
                }
            } else if insn.op0_kind() == OpKind::Memory && insn.memory_base() == Register::RAX {
                if !game_regs.contains(&Register::RAX) {
                    game_regs.push(Register::RAX);
                }
                seen_call = false;
            } else if !game_regs.is_empty() {
                seen_call = false;
            }
        }
        if insn.mnemonic() == Mnemonic::Mov && insn.op1_register() == Register::RCX {
            proto_reg = insn.op0_register();
        }
    }

    if proto_reg == Register::None || game_regs.is_empty() {
        log::debug!("[Handler NT] ParseGateServer: reg detection failed");
        return map;
    }

    let sl_map = crate::script::STRING_LITERALS.get();
    let ga_base = *il2cpp::GA_BASE;

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut pending: HashMap<Register, u32> = HashMap::new();
    // reg → string literal rva
    let mut str_reg: HashMap<Register, usize> = HashMap::new();

    while decoder.can_decode() {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() == Mnemonic::Ret {
            break;
        }

        if matches!(
            insn.mnemonic(),
            Mnemonic::Mov | Mnemonic::Movzx | Mnemonic::Movq | Mnemonic::Movdqu
        ) && insn.op1_kind() == OpKind::Memory
            && insn.memory_base() == proto_reg
        {
            pending.insert(full_reg(insn.op0_register()), insn.memory_displacement32());
            continue;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base() == Register::RIP
            && let Some(sl_map) = sl_map
        {
            let rva_key = insn.memory_displacement64().wrapping_sub(ga_base as u64) as usize;
            if sl_map.contains_key(&rva_key) {
                str_reg.insert(full_reg(insn.op0_register()), rva_key);
            }
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Register
        {
            let dst = full_reg(insn.op0_register());
            let src = full_reg(insn.op1_register());
            if let Some(&v) = pending.get(&src) {
                pending.insert(dst, v);
            }
            if let Some(&v) = str_reg.get(&src) {
                str_reg.insert(dst, v);
            }
        }

        if insn.mnemonic() == Mnemonic::Call
            && let (Some(&str_rva), Some(&proto_off)) =
                (str_reg.get(&Register::RDX), pending.get(&Register::R8))
            && let (Some(sv), Some(pn)) = (
                sl_map.and_then(|m| m.get(&str_rva)),
                proto_fields.get(&(proto_off as usize)),
            )
        {
            log::debug!("[Handler NT] {pn} -> {}", sv.as_str());
            map.insert(pn.clone(), sv.as_str().into_owned());
        }

        if insn.mnemonic() == Mnemonic::Call {
            for r in &VOLATILE_REGS {
                pending.remove(r);
                str_reg.remove(r);
            }
            continue;
        }

        if insn.op1_kind() == OpKind::Register
            && (insn.mnemonic() == Mnemonic::Mov
                || insn.mnemonic() == Mnemonic::Movq
                || insn.mnemonic() == Mnemonic::Movdqu)
            && insn.op0_kind() == OpKind::Memory
            && game_regs.contains(&insn.memory_base())
            && let Some(&proto_off) = pending.get(&full_reg(insn.op1_register()))
        {
            let game_off = insn.memory_displacement32() as usize;
            if let (Some(pn), Some(gn)) = (
                proto_fields.get(&(proto_off as usize)),
                game_fields.get(&game_off),
            ) {
                log::debug!("[Handler NT] {pn} -> {gn}");
                map.insert(pn.clone(), gn.clone());
            }
            continue;
        }
    }

    if map.is_empty() {
        log::debug!("[Handler NT] gate server: no field pairs found");
    }
    map
}
