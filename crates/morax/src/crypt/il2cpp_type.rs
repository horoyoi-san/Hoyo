// Il2CppCodeRegistration + METADATA_REGISTRATION_TYPES_OFF
// 9D 01 00 00 00 00 1C 00 [data:u32][attrs:u16][kind:u8 @+6][bits:u8 @+7]
// data 0x19D attr 0 kind 1c bits 0

use crate::pe::Pe;
use anyhow::Result;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Format {
    Packed8,
    Pointer16,
}

impl Format {
    pub fn stride(self) -> u32 {
        match self {
            Format::Packed8 => 8,
            Format::Pointer16 => 16,
        }
    }
}

#[derive(Clone, Copy)]
pub struct Decoded {
    pub data: u32,
    pub kind: u8,
    pub bits: u8,
    pub attrs: u16,
}

pub fn detect(pe: &Pe, table_rva: u32) -> Format {
    const PROBE: u32 = 16;
    let mut votes_8 = 0u32;
    let mut votes_16 = 0u32;
    for index in 0..PROBE {
        if let Ok(byte) = pe.rd8(table_rva + index * 8 + 6)
            && is_sensible_kind(byte)
        {
            votes_8 += 1;
        }
        if let Ok(byte) = pe.rd8(table_rva + index * 16 + 10)
            && is_sensible_kind(byte)
        {
            votes_16 += 1;
        }
    }
    if votes_16 >= votes_8 {
        Format::Pointer16
    } else {
        Format::Packed8
    }
}

fn is_sensible_kind(byte: u8) -> bool {
    matches!(byte, 0x01..=0x1F)
}

pub fn decode(
    pe: &Pe,
    table_rva: u32,
    image_base: u64,
    index: u32,
    format: Format,
) -> Result<Decoded> {
    let rva = table_rva + index * format.stride();
    match format {
        Format::Packed8 => {
            let raw = pe.rd64(rva)?;
            Ok(Decoded {
                data: raw as u32,
                attrs: (raw >> 32) as u16,
                kind: (raw >> 48) as u8,
                bits: (raw >> 56) as u8,
            })
        }
        Format::Pointer16 => decode_pointer16(pe, table_rva, image_base, rva),
    }
}

fn decode_pointer16(pe: &Pe, table_rva: u32, image_base: u64, rva: u32) -> Result<Decoded> {
    let raw_data = pe.rd64(rva)?;
    let bits = pe.rd32(rva + 8)?;
    let data = if raw_data >= image_base {
        let ptr_rva = (raw_data - image_base) as u32;
        match ptr_rva.checked_sub(table_rva) {
            Some(off) if off % 16 == 0 => off / 16,
            _ => return decode_at_pointer(pe, table_rva, image_base, ptr_rva),
        }
    } else {
        raw_data as u32
    };
    Ok(Decoded {
        data,
        attrs: bits as u16,
        kind: (bits >> 16) as u8,
        bits: (bits >> 24) as u8,
    })
}

fn decode_at_pointer(pe: &Pe, table_rva: u32, image_base: u64, rva: u32) -> Result<Decoded> {
    let raw_data = pe.rd64(rva)?;
    let bits = pe.rd32(rva + 8)?;
    let data = if raw_data >= image_base {
        let ptr_rva = (raw_data - image_base) as u32;
        match ptr_rva.checked_sub(table_rva) {
            Some(off) if off % 16 == 0 => off / 16,
            _ => raw_data as u32,
        }
    } else {
        raw_data as u32
    };
    Ok(Decoded {
        data,
        attrs: bits as u16,
        kind: (bits >> 16) as u8,
        bits: (bits >> 24) as u8,
    })
}

pub fn ptr_index(ptr_rva: u32, table_rva: u32, format: Format) -> Result<u32> {
    let off = ptr_rva.checked_sub(table_rva).ok_or_else(|| {
        anyhow::anyhow!("Il2CppType pointer RVA 0x{ptr_rva:X} is before table RVA 0x{table_rva:X}")
    })?;
    let stride = format.stride();
    if off % stride != 0 {
        return Err(anyhow::anyhow!(
            "Il2CppType pointer RVA 0x{ptr_rva:X} is not aligned to a {stride}-byte entry"
        ));
    }
    Ok(off / stride)
}
