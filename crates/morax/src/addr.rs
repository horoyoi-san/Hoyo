use crate::pe::Pe;
use iced_x86::{Decoder, DecoderOptions, Instruction};

pub const METADATA_CACHE_REGISTER: &str = "48 8D 05 ?? ?? ?? ?? 48 89 05 ?? ?? ?? ?? 48 8D 05";
pub const METADATA_PAYLOAD_INIT: &str = "48 8D 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 89 C6 48 8D 0D";

pub fn parse_pattern(pat: &str) -> Vec<Option<u8>> {
    pat.split_whitespace()
        .map(|token| match token {
            "?" | "??" => None,
            hex => Some(u8::from_str_radix(hex, 16).expect("invalid hex byte in pattern")),
        })
        .collect()
}

pub fn scan_all(pe: &Pe, pat: &str) -> Vec<u32> {
    pe.scan(&parse_pattern(pat))
}

pub fn scan_first(pe: &Pe, pat: &str) -> Option<u32> {
    scan_all(pe, pat).into_iter().next()
}

pub fn disasm(pe: &Pe, rva: u32, count: usize) -> Vec<Instruction> {
    let Ok(bytes) = pe.rd_bytes(rva, count * 15) else {
        return Vec::new();
    };
    let mut decoder = Decoder::with_ip(64, bytes, rva as u64, DecoderOptions::NONE);
    let mut out = Vec::with_capacity(count);
    let mut instruction = Instruction::default();
    while decoder.can_decode() && out.len() < count {
        decoder.decode_out(&mut instruction);
        out.push(instruction);
    }
    out
}
