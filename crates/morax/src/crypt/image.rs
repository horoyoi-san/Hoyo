// Il2CppImageDefinition
// Pattern = global metadata string 55 41 57 41 56 41 55 41 54 56 57 53 48 81 EC ? ? ? ? 48 8D AC 24 80 00 00 00 44 0F 29 AD 50 03 00 00
// 4.3.0 0x3952EA0

use anyhow::Result;

use crate::pe::{Pe, read_u32};

pub const ENTRY_SIZE: usize = 40;

pub struct RawImage {
    pub name_index: u32,
    pub type_start: u32,
    pub type_count: u32,
}

// global metadata 1st The hash table exceeds its maximum size.
//  if ( dword_8E5B150 > 0 ) -- do
//  v146 = ((0x120D0703 * ((0xE07C * v145) ^ 0x7538159E)) ^ 0x6032C9D3) + 0x2EBB0085;
pub fn image_key(index: u32) -> u32 {
    let v = (index * 0xE07C) ^ 0x7538159E;
    let v = (v * 0x120D0703) ^ 0x6032C9D3;
    v + 0x2EBB0085
}

pub fn decrypt(data: &[u8], entry: usize, image_index: u32) -> Result<RawImage> {
    let k = image_key(image_index);
    Ok(RawImage {
        // 48 89 C7 4C 6B AD D0 02 00 00 ?
        // il2cpp_class_get_namespace
        name_index: read_u32(data, entry + 0x0C)? ^ k ^ 0x4D648371, // v148 = sub_392E220(v146 ^ *(_DWORD *)&v144[40 * v145 + 0xC] ^ 0x4D648371u);
        // 48 01 D1 83 F8 ?
        // under name_in at global metadata
        // v161 = qword_8E5B168 + 80 * v160 + 0x2DA57AEA1A9FE301LL;
        // this qword 3 then above method_start while is last key
        type_start: read_u32(data, entry + 0x14)? ^ k ^ 0x7BABEEA0 ^ 0x235AEAF5, // *(_DWORD *)(v147 + v149) = v146 ^ *(_DWORD *)(v159 + 0x14) ^ 0x7BABEEA0;// type_start
        type_count: read_u32(data, entry + 0x04)? ^ k ^ 0x10FEA394 ^ 0x7C06D18C, // *(_DWORD *)(v147 + v149 + 80) = v146 ^ *(_DWORD *)(v159 + 4) ^ 0x10FEA394;// type_count
    })
}

// just look the header qword
pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32, u32)> {
    // 48 C1 EA ? 89 15 ? ? ? ?
    let image_count = (pe.rd32(hdr + 0x134)? ^ 0x10210728) / 0x28; // v61 = (*(int *)(qword_8E5B118 + 0x134) ^ 0x10210728uLL) / 0x28;
    // 41 81 F7 ? ? ? ? 44 89 3D ? ? ? ?
    let assembly_count = ((pe.rd32(hdr + 0x178)? as i32) >> 4) as u32 ^ 0x05CC1AE1; // v72 = (*(int *)(qword_8E5B118 + 0x178) >> 4) ^ 0x5CC1AE1;
    // 0F 8E ? ? ? ? B9 ? ? ? ? 03 88 50 01 00 00
    // above image_key
    let images_offset = pe.rd32(hdr + 0x150)? - 0x277D9EA2; // v144 = (char *)qword_8E5B128 + *(_DWORD *)(qword_8E5B118 + 0x150) - 0x277D9EA2;
    Ok((image_count, assembly_count, images_offset))
}
