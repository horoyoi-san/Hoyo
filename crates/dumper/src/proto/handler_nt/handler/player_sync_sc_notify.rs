use std::collections::HashMap;

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use il2cpp::vm::class::Il2CppClass;
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

use crate::proto::output::{ProtoItem, TypeToItemMap};

pub fn process(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    let mut map = HashMap::new();

    let result = il2cpp::get_cached_class("RPG.Client.InventoryModule")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .and_then(|rt| {
            let methods_map: HashMap<usize, String> = rt
                .get_methods_il2cpp()
                .into_iter()
                .filter_map(|m| {
                    let rva = m.get_il2cpp_method().rva();
                    (rva != 0).then(|| {
                        let name = m.get_name().ok()?.as_str().to_string();
                        Some((rva, name))
                    })?
                })
                .collect();

            let handler_rva = rt.get_methods_il2cpp().into_iter().find_map(|m| {
                m.get_name()
                    .is_ok_and(|n| n.as_str().contains("_OnCmdPlayerSyncScNotify"))
                    .then(|| m.get_il2cpp_method().rva())
                    .filter(|&rva| rva != 0)
            })?;

            Some((handler_rva, methods_map))
        });

    let Some((handler_rva, inventory_methods)) = result else {
        return map;
    };

    let slice = game_assembly_slice();
    let ga_base = *il2cpp::GA_BASE;
    let data = &slice[handler_rva..(handler_rva + 0x23E).min(slice.len())];
    let ip = (ga_base + handler_rva) as u64;

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut insn = Instruction::default();

    let obj_new_rva = *crate::proto::IL2CPP_OBJECT_NEW_RVA;
    let mut proto_reg = Register::None;
    let mut proto_type_va: Option<u64> = None;
    let mut rip_load: Option<(Register, u64)> = None;

    while decoder.can_decode() && (proto_reg == Register::None || proto_type_va.is_none()) {
        decoder.decode_out(&mut insn);

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_register() == Register::R8
            && proto_reg == Register::None
        {
            proto_reg = insn.op0_register().full_register();
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base() == Register::RIP
        {
            rip_load = Some((
                insn.op0_register().full_register(),
                insn.memory_displacement64(),
            ));
            continue;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Register
            && let Some((src, disp)) = rip_load
            && insn.op1_register().full_register() == src
        {
            rip_load = Some((insn.op0_register().full_register(), disp));
            continue;
        }

        if insn.mnemonic() == Mnemonic::Cmp
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_base() == Register::RIP
        {
            let typeinfo_ptr_addr = insn.memory_displacement64() as usize;
            if typeinfo_ptr_addr >= ga_base && typeinfo_ptr_addr - ga_base + 8 <= slice.len() {
                let class = unsafe { *(typeinfo_ptr_addr as *const Il2CppClass) };
                if RuntimeType::from_class(class).is_ok() {
                    proto_type_va = Some(typeinfo_ptr_addr as u64);
                }
            }
        }

        if (insn.mnemonic() == Mnemonic::Call || insn.mnemonic() == Mnemonic::Jmp)
            && insn.near_branch_target() as usize - ga_base == obj_new_rva
            && let Some((reg, disp)) = rip_load
            && reg == Register::RCX
        {
            let ptr_addr = disp as usize;
            if ptr_addr >= ga_base && ptr_addr - ga_base + 8 <= slice.len() {
                let class = unsafe { *(ptr_addr as *const Il2CppClass) };
                if RuntimeType::from_class(class).is_ok() {
                    proto_type_va = Some(ptr_addr as u64);
                }
            }
        }

        if proto_type_va.is_some()
            && insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_register() == Register::RAX
            && proto_reg == Register::None
        {
            proto_reg = insn.op0_register().full_register();
        }
    }

    let Some(proto_type_va) = proto_type_va else {
        log::debug!("[Handler NT] PlayerSyncScNotify: proto type not found");
        return map;
    };

    let ptr_addr = proto_type_va as usize;
    let proto_type = (ptr_addr >= ga_base && ptr_addr - ga_base + 8 <= slice.len())
        .then(|| unsafe { *(ptr_addr as *const Il2CppClass) })
        .and_then(|class| RuntimeType::from_class(class).ok());

    let Some(proto_type) = proto_type else {
        log::debug!("[Handler NT] PlayerSyncScNotify: proto type resolve failed");
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

    let mut decoder = Decoder::with_ip(64, data, ip, DecoderOptions::NONE);
    let mut reg_proto_off: HashMap<Register, u64> = HashMap::new();

    while decoder.can_decode() {
        decoder.decode_out(&mut insn);
        if insn.mnemonic() == Mnemonic::Ret {
            break;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Memory
            && insn.memory_index() == Register::None
            && insn.memory_base().full_register() == proto_reg
        {
            reg_proto_off.insert(
                insn.op0_register().full_register(),
                insn.memory_displacement64(),
            );
            continue;
        }

        if insn.mnemonic() == Mnemonic::Mov
            && insn.op0_kind() == OpKind::Register
            && insn.op1_kind() == OpKind::Register
            && let Some(&v) = reg_proto_off.get(&insn.op1_register().full_register())
        {
            reg_proto_off.insert(insn.op0_register().full_register(), v);
            continue;
        }

        if insn.mnemonic() == Mnemonic::Call {
            let target_rva = insn.near_branch_target() as usize - ga_base;
            if let Some(method_name) = inventory_methods.get(&target_rva)
                && let Some(readable) = method_name_to_field(method_name)
            {
                for arg_reg in [Register::RCX, Register::RDX, Register::R8, Register::R9] {
                    if let Some(&proto_off) = reg_proto_off.get(&arg_reg)
                        && let Some(obf_name) = proto_fields.get(&(proto_off as usize))
                    {
                        log::debug!("[Handler NT] PlayerSyncScNotify: {obf_name} -> {readable}");
                        map.insert(obf_name.clone(), readable);
                        break;
                    }
                }
            }

            for r in [
                Register::RAX,
                Register::RCX,
                Register::RDX,
                Register::R8,
                Register::R9,
                Register::R10,
                Register::R11,
            ] {
                reg_proto_off.remove(&r);
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Handler NT] PlayerSyncScNotify: no NT generated");
    }
    map
}

fn method_name_to_field(name: &str) -> Option<String> {
    Some(name.strip_prefix('_')?.to_string() + "_list")
}
