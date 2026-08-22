// PATTERN = E8 ? ? ? ? C6 05 ? ? ? ? ? EB ? CC CC CC CC

use anyhow::Result;

use crate::pe::Pe;

/// if ( !*(_QWORD *)(*(_QWORD *)(qword + offset
pub const USAGE_STRUCT_METHOD_OFF: u32 = 0x00; // case 3 | 6
pub const USAGE_STRUCT_STRING_OFF: u32 = 0x28; // case 5
pub const USAGE_STRUCT_TYPEINFO_OFF: u32 = 0x60; // case 1

// v7 = v4 + v5 - 0x6E8B512D;                  // LIST_BIAS while ( 2 ) above
pub const LIST_BIAS: u32 = 0x6E8B512D;

// v11 = *(_DWORD *)(v12 + 8LL * v7 + 4) - v10 - 0x54C5934B;// PAIR
// LODWORD(v12) = (*(_DWORD *)(v12 + 8LL * v7) ^ 0x6907AB9A) - v10;
// v13 = v11 & 0x1FFFFFFF;
// switch ( v11 >> 29 )
pub const PAIR_HIGH_SUB: u32 = 0x54C5934B;
pub const PAIR_LOW_XOR: u32 = 0x6907AB9A;
pub const PAIR_KIND_SHIFT: u32 = 29;
pub const PAIR_SOURCE_MASK: u32 = 0x1FFFFFFF;

// case 5 call param v37 + 0x3BD9429B + v2 + *(_DWORD *)(v1 + 8) - 0x8EEB1A7,
pub const LIT_DATA_BASE_SUB: u32 = 0x8EEB1A7;
pub const LIT_OFF_BIAS: u32 = 0x3BD9429B;

// case 5 call -> v4 = ((0xDE8C09C836133DBDuLL * a1) ^ 0x18D025C96EE74E86LL) + 0x2C6833CC6F0A9C48LL;
pub const LIT_SEED_MUL: u64 = 0xDE8C09C836133DBD;
pub const LIT_SEED_XOR: u64 = 0x18D025C96EE74E86;
pub const LIT_SEED_ADD: u64 = 0x2C6833CC6F0A9C48;
pub const LIT_PAYLOAD_INCREMENT: u64 = 0x464C46540F730312; //  v4 += 0x464C46540F730312LL * v7;

// 4 + 8 = 12
pub const METHOD_SPEC_ENTRY_SIZE: usize = 12;
pub const METHOD_SPEC_METHOD_INST_OFF: usize = 0x4;
pub const METHOD_SPEC_CLASS_INST_OFF: usize = 0x8;

//  v5 = (((0x8CD81660EE8LL * (unsigned __int64)a1) >> 17) + 0x7AFCE30F) ^ 0xEF048154;
pub fn usage_list_key(index: u32) -> u32 {
    (((0x8CD81660EE8 * index as u64) >> 17) + 0x7AFCE30F) as u32 ^ 0xEF048154
}

// v10 = (0x102533D7 * ((0x334FB2BA * ((0x87C3LL * v7) ^ 0x5FA3FAD3uLL) + 0x454D10D89E6A02ALL) >> 14) + 0x58972D9863A807LL) >> 23;
pub fn usage_pair_key(pair_index: u32) -> u64 {
    let i = pair_index as u64;
    let t = (0x87C3 * i) ^ 0x5FA3FAD3;
    let a = 0x334FB2BA * t + 0x454D10D89E6A02A;
    let b = a >> 14;
    let c = 0x102533D7 * b + 0x58972D9863A807;
    c >> 23
}

/// case 5 param + (unsigned int)((0x24085C9A * ((unsigned __int64)(v36 + 0x1F42A428F4C04CLL) >> 14)) >> 8)));
pub fn string_literal_key(index: u32) -> u32 {
    ((0x24085C9A * ((0x32C1CF25BB14 * index as u64 + 0x1F0FE259CF0538) >> 14)) >> 8) as u32
}

pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32, u32, u32, u32)> {
    let usage_lists_offset = pe.rd32(hdr + 0x1D0)? - 0x36599B5B; // v3 = qword_8E5B120 + *(_DWORD *)(qword_8E5B118 + 0x1D0) - 0x36599B5B;
    let usage_pairs_offset = pe.rd32(hdr + 0x190)? - 0x1286EF8D; // v12 = v2 + *(_DWORD *)(v1 + 0x190) - 0x1286EF8D;
    let string_literal_offset = pe.rd32(hdr + 0x1F0)? ^ 0x56C7D20D; // v35 = v2 + (*(int *)(v1 + 0x1F0) ^ 0x56C7D20DLL); case 5
    let string_literal_data_offset = pe.rd32(hdr + 0x08)?; // case 5
    let method_specs_offset = pe.rd32(hdr + 0x38)? - 0x8870E55; // case 3 | 6 v16 = *(_DWORD *)(v1 + 0x38) - 0x8870E55 + v2;
    Ok((
        usage_lists_offset,
        usage_pairs_offset,
        string_literal_offset,
        string_literal_data_offset,
        method_specs_offset,
    ))
}
