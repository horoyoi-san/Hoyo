use std::collections::HashMap;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

use crate::proto::output::{ProtoItem, TypeToItemMap};

use super::{VOLATILE_REGS, full_reg};
use crate::proto::handler_nt::handler::build_game_offset_map;

pub fn process_stop_info(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let (proto_type, rva) = il2cpp::get_cached_class("RPG.Client.ServerDispatchData")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .and_then(|rt| {
            rt.get_methods_il2cpp()
                .into_iter()
                .find(|m| {
                    m.get_name()
                        .is_ok_and(|n| n.as_str() == "_ParseServerStopInfo")
                })
                .and_then(|m| {
                    let proto = m.get_parameters().first()?.get_parameter_type().ok()?;
                    let rva = m.get_il2cpp_method().rva();
                    (rva != 0).then_some((proto, rva))
                })
        })
        .unwrap_or((reflection::runtime_type::RuntimeType(0), 0));
    if rva == 0 {
        return HashMap::new();
    }

    let mut map = HashMap::new();

    let game_fields = il2cpp::get_cached_class("RPG.Client.ServerStopInfo")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .map(build_game_offset_map)
        .unwrap_or_default();

    let proto_class = proto_type.get_il2cpp_type().get_class().0;
    let proto_fields: HashMap<usize, String> = type_to_item
        .iter()
        .find(|(rt, _)| rt.get_il2cpp_type().get_class().0 == proto_class)
        .and_then(|(_, item)| match &*item.borrow() {
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
    let data = &slice[rva..rva + 0xB0];
    let ip = (*il2cpp::GA_BASE + rva) as u64;

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut insn = Instruction::default();
    let mut proto_reg = Register::None;
    let mut game_reg = Register::None;
    let mut seen_call = false;

    while decoder.can_decode() && (proto_reg == Register::None || game_reg == Register::None) {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() == Mnemonic::Call {
            seen_call = true;
            continue;
        }
        if seen_call {
            if insn.mnemonic() == Mnemonic::Mov
                && (insn.op1_register() == Register::RAX || insn.op0_register() == Register::RAX)
            {
                game_reg = insn.op0_register();
                seen_call = false;
            } else if insn.op0_kind() == OpKind::Memory && insn.memory_base() == Register::RAX {
                game_reg = Register::RAX;
                seen_call = false;
            }
        }
        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_register() == Register::RCX
        {
            proto_reg = insn.op0_register();
        }
    }
    if proto_reg == Register::None || game_reg == Register::None {
        log::debug!("[Handler NT] StopInfo: reg detection failed");
        return map;
    }

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut pending: HashMap<Register, u32> = HashMap::new();

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
            && insn.op1_kind() == OpKind::Register
        {
            let d = full_reg(insn.op0_register());
            let s = full_reg(insn.op1_register());
            if let Some(&v) = pending.get(&s) {
                pending.insert(d, v);
            }
        }

        if insn.mnemonic() == Mnemonic::Call {
            for r in &VOLATILE_REGS {
                pending.remove(r);
            }
            continue;
        }

        let is_write = (insn.mnemonic() == Mnemonic::Mov
            || insn.mnemonic() == Mnemonic::Movq
            || insn.mnemonic() == Mnemonic::Movdqu)
            && insn.op0_kind() == OpKind::Memory
            && insn.memory_base() == game_reg
            && insn.op1_kind() == OpKind::Register;
        if is_write
            && let Some(&off) = pending.get(&full_reg(insn.op1_register()))
            && let (Some(pn), Some(gn)) = (
                proto_fields.get(&(off as usize)),
                game_fields.get(&(insn.memory_displacement32() as usize)),
            )
        {
            map.insert(pn.clone(), gn.clone());
        }
    }

    map
}
