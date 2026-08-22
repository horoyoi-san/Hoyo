// Il2CppMethodDefinition
// PATTERN = 66 0F 6F 05 ?? ?? ?? ?? 4C 89 C5

use anyhow::Result;

use crate::pe::{Pe, read_u16, read_u32};

pub const ENTRY_SIZE: usize = 26;

// 66 0F 6F 05 ?? ?? ?? ?? 4C 89 C5
pub const METHOD_ATTRIBUTE_XOR: u16 = 0x3733;

pub struct RawMethod {
    pub name_index: u32,
    pub parameter_start: i32,
    pub return_type_index: u32,
    pub flags: u16,
    pub parameter_count: usize,
}

// 3st The hash table exceeds its maximum size. at global metadata under while ( 1 )
pub fn type_block(data: &[u8], entry: usize) -> Result<(u32, usize)> {
    let method_start = read_u32(data, entry + 0x08)? ^ 0x1A7AF5FE; // v35 = *(int *)(*(_QWORD *)(a1 + 0x70) + 8LL) ^ 0x1A7AF5FELL;// method_start
    let method_count = (read_u16(data, entry + 0x34)? + 0x5F93) as usize; // if ( (unsigned __int16)++v329 >= (unsigned __int16)(*(_WORD *)(v328 + 0x34) + 0x5F93) )// method_count
    Ok((method_start, method_count))
}

// v47 = ((0x540CC9F4 * ((0x2C03F17D * ((0x31E1LL * (unsigned int)v42) ^ 0x33914937uLL)) >> 0x17)) >> 0x15) + 0x71BC7861; // method_key
pub fn method_key(index: u64) -> u32 {
    let v = (index * 0x31E1) ^ 0x33914937;
    let v = (v * 0x2C03F17D) >> 0x17;
    let v = (v * 0x540CC9F4) >> 0x15;
    (v as u32) + 0x71BC7861
}

// this part from different api
pub fn decrypt(
    data: &[u8],
    entry: usize,
    method_index: usize,
    attribute_xor: u16,
) -> Result<RawMethod> {
    let k = method_key(method_index as u64);
    Ok(RawMethod {
        // E8 ? ? ? ? 48 8B 05 ? ? ? ? 48 8B 15 ? ? ? ? EB ?
        // il2cpp_class_get_method_from_name
        name_index: (read_u32(data, entry)? ^ k) ^ 0xE714BC1, //  v21 = sub_392E220(*(_DWORD *)(v20 + v8) ^ v19 ^ 0xE714BC1);
        // E8 ? ? ? ? 49 8B 56 28 0F B6 5A 2E
        // il2cpp_method_get_param
        parameter_start: (read_u32(data, entry + 4)? ^ k ^ 0x9889B8) as i32, // v28 = v25 + ((unsigned int)v32 ^ *(_DWORD *)(v12 + 4) ^ 0x9889B8);
        // 48 89 C6 0F B6 46 06 C1 E0 ? 3D ? ? ? ? 74 ?
        // il2cpp_method_get_return_type
        return_type_index: (read_u32(data, entry + 8)? - 0x653E0B1D) ^ k, // v18 = (*(_DWORD *)(qword_8E5B120 + *(_DWORD *)(qword_8E5B118 + 332) - 0xC5FBD6C + 26 * v4 + 8) - 0x653E0B1D)

        // 66 0F 6F 05 ?? ?? ?? ?? 4C 89 C5
        flags: read_u16(data, entry + 0x0E)? ^ k as u16 ^ attribute_xor, // if ( (((unsigned __int16)v47 ^ *(_WORD *)(v48 + 0xE)) & 0x1000) == 0 ) attribute_xor is SIMD
        parameter_count: (data[entry + 0x18] ^ k as u8 ^ 0xA8) as usize, // BYTE6(v30->_1.this_arg) = v47 ^ *(_BYTE *)(v48 + 0x18) ^ 0xA8;
    })
}

pub fn head_block(pe: &Pe, hdr: u32) -> Result<u32> {
    Ok(pe.rd32(hdr + 0x14C)? - 0xC5FBD6C) // v43 = v37 + *(_DWORD *)(v38 + 0x14C) - 0xC5FBD6C;
}
