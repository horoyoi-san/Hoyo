// Il2CppEventDefinition 14 bytes: nameIndex(4) typeIndex(4) raise(2) add(2) remove(2)
// PATTERN = E8 ? ? ? ? 48 8B 85 88 00 00 00 48 8B 08 FF 15 ? ? ? ? 4C 8B 7B 18

use anyhow::Result;

use crate::pe::{Pe, read_u16, read_u32};

pub const ENTRY_SIZE: usize = 14;
pub const ACCESSOR_NONE: u16 = 0xFFFF;

pub struct RawEvent {
    pub name_index: u32,
    pub type_index: i32,
    pub raise_local: u16,
    pub add_local: u16,
    pub remove_local: u16,
}

// v35 = qword_8E5B120 + (*(int *)(qword_8E5B118 + 0x1AC) ^ 0x37080D6E);  // events table base
pub fn head_block(pe: &Pe, hdr: u32) -> Result<u32> {
    Ok(pe.rd32(hdr + 0x1AC)? ^ 0x37080D6E)
}

// EventStart = *(_WORD *)(typedef + 0x30) ^ 0x6ECD ; EventCount = *(_BYTE *)(typedef + 0x40) ^ 0x73
pub fn type_block(data: &[u8], entry: usize) -> Result<(u32, usize)> {
    let event_start = (read_u16(data, entry + 0x30)? ^ 0x6ECD) as u32;
    let event_count = (data[entry + 0x40] ^ 0x73) as usize;
    Ok((event_start, event_count))
}

// v34 = (1598447864 * ((1057473644 * ((15580 * idx) ^ 0x550D63BA)) >> 19) + 0x26824684CA69CA48) >> 15;
pub fn event_key(index: u64) -> u32 {
    let a = (0x3CDC * index) ^ 0x550D63BA;
    let b = (0x3F07C46C * a) >> 19;
    ((0x5F4660F8 * b + 0x26824684CA69CA48) >> 15) as u32
}

pub fn decrypt(data: &[u8], entry: usize, global_index: u64) -> Result<RawEvent> {
    let k = event_key(global_index);
    Ok(RawEvent {
        name_index: (read_u32(data, entry)? ^ 0x078981CB) - k, // ((*(_DWORD *)v35 ^ 0x78981CB) - (unsigned int)v34)
        type_index: ((read_u32(data, entry + 4)? ^ 0x53243DF3) - k) as i32, // v36 = (*(_DWORD *)(v35 + 4) ^ 0x53243DF3) - v34;
        raise_local: (read_u16(data, entry + 8)? ^ 0x8450) - k as u16, // ((*(_WORD *)(v35 + 8) ^ 0x8450) - v34))
        add_local: (read_u16(data, entry + 10)? ^ 0xE8CB) - k as u16, //  ((*(_WORD *)(v35 + 10) ^ 0xE8CB) - v34))
        remove_local: (read_u16(data, entry + 12)? ^ 0x3CE2) - k as u16, // ((*(_WORD *)(v35 + 12) ^ 0x3CE2) - v34))
    })
}
