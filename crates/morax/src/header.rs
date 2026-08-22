use iced_x86::{Mnemonic, OpKind, Register};

use crate::addr;
use crate::crypt::header as header_crypt;
use crate::crypt::header::Il2CppGlobalMetadataHeader;
use crate::error::Result;
use crate::pe::Pe;

pub(crate) struct MetadataGlobals {
    pub metadata_cache_register_rva: u32,
    pub code_registration_rva: u32,
    pub metadata_registration_rva: u32,
    pub global_metadata_header_rva: u32,
    pub usage_struct_rva: u32,
}

impl Il2CppGlobalMetadataHeader {
    pub(crate) fn discover(pe: &Pe) -> Result<(MetadataGlobals, Self)> {
        let globals = registration_globals(pe)?;
        let payload_offset = payload_offset(pe)?;
        let header =
            header_crypt::decode_header(pe, globals.global_metadata_header_rva, payload_offset)?;
        Ok((globals, header))
    }
}

fn registration_globals(pe: &Pe) -> Result<MetadataGlobals> {
    for candidate in addr::scan_all(pe, addr::METADATA_CACHE_REGISTER) {
        let instructions = addr::disasm(pe, candidate, 11);
        if instructions.len() < 10 {
            continue;
        }
        let is_lea_mov_block = (0..5).all(|pair| {
            let lea = &instructions[pair * 2];
            let mov = &instructions[pair * 2 + 1];
            lea.mnemonic() == Mnemonic::Lea
                && lea.is_ip_rel_memory_operand()
                && mov.mnemonic() == Mnemonic::Mov
                && mov.is_ip_rel_memory_operand()
        });
        if !is_lea_mov_block {
            continue;
        }

        let code_registration_rva = instructions[0].ip_rel_memory_address() as u32;
        let metadata_registration_rva = instructions[2].ip_rel_memory_address() as u32;
        let usage_struct_rva = instructions[4].ip_rel_memory_address() as u32;
        let global_metadata_header_rva = instructions[8].ip_rel_memory_address() as u32;

        let Ok(count_raw) =
            pe.rd32(metadata_registration_rva + header_crypt::METADATA_REGISTRATION_COUNT_OFF)
        else {
            continue;
        };
        let Ok(span_raw) = pe.rd32(global_metadata_header_rva + header_crypt::HDR_METHODS_SPAN_OFF)
        else {
            continue;
        };
        if (count_raw - header_crypt::METADATA_REGISTRATION_COUNT_ADD) > 100_000
            && (span_raw ^ header_crypt::HDR_METHODS_SPAN_XOR) > 1_000_000
        {
            return Ok(MetadataGlobals {
                metadata_cache_register_rva: candidate,
                code_registration_rva,
                metadata_registration_rva,
                global_metadata_header_rva,
                usage_struct_rva,
            });
        }
    }
    Err("".into())
}

fn payload_offset(pe: &Pe) -> Result<u32> {
    let Some(initializer_rva) = addr::scan_first(pe, addr::METADATA_PAYLOAD_INIT) else {
        return Ok(0);
    };

    let instructions = addr::disasm(pe, initializer_rva, 12);

    let payload_offset = instructions
        .iter()
        .find(|i| {
            i.mnemonic() == Mnemonic::Add
                && i.op0_register() == Register::RSI
                && i.op1_kind() == OpKind::Immediate32to64
        })
        .map_or(0, |i| i.immediate(1) as u32);

    Ok(payload_offset)
}
