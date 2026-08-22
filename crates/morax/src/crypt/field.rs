// Il2CppFieldDefinition
// PATTERN = E8 ? ? ? ? 49 8B 47 38 48 85 C0 0F 84 ? ? ? ? 8B 08
use crate::pe::{Pe, read_u16, read_u32};
use anyhow::Result;

pub const ENTRY_SIZE: usize = 8;
pub const OFFSET_MASK: u32 = 0xFFFFFF;

pub struct RawField {
    pub name_index: u32,
    pub type_index: u32,
}

pub fn type_block(data: &[u8], entry: usize) -> Result<(u32, usize)> {
    let field_start = read_u32(data, entry + 0x20)? - 0x74853864; // v34 = *(_DWORD *)(v33 + 0x20); v35 = v34 - 0x74853864;
    let field_count = (read_u16(data, entry + 0x32)? + 0x444D) as usize; // v23 = *(_WORD *)(*(_QWORD *)(v3 + 112) + 0x32LL) + 0x444D;
    Ok((field_start, field_count))
}

pub fn field_key(raw_field_start: u32, local_index: u32) -> u32 {
    0xAD416BB9 - (raw_field_start * 0x2C5DCB00) + (local_index * 0xD3A23500) // v38 = 0xAD416BB9 - 0x2C5DCB00 * v34;
}

pub fn decrypt(data: &[u8], entry: usize, field_start: u32, local_index: u32) -> Result<RawField> {
    let raw_field_start = field_start + 0x74853864;
    let k = field_key(raw_field_start, local_index);
    Ok(RawField {
        name_index: read_u32(data, entry)? + k + 0x2AAFC785, // *(_QWORD *)(p_namespaze - 8) = sub_392E220(v38 + *(_DWORD *)(v44 + 8 * v43) + 0x2AAFC785) + 0x72916D972C0FE1BFLL;
        type_index: read_u32(data, entry + 4)? + k,
    })
}

pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32, u32, u32)> {
    let fields_offset = pe.rd32(hdr + 0x20)? - 0x4D031E77; // v44 = v37 + *(_DWORD *)(v36 + 0x20) - 0x4D031E77; // field offset
    let field_offset_map_offset = pe.rd32(hdr + 0x180)? - 0x1B24189D; // + *(_DWORD *)(qword_8E5B118 + 0x180) - 0x1B24189D // map
    let field_offset_group_offset = pe.rd32(hdr + 0x9C)? - 0x43813629; //  + *(_DWORD *)(qword_8E5B118 + 0x9C) - 0x43813629  // group
    let field_offset_offset = pe.rd32(hdr + 0x148)? ^ 0x329E1172; // + (*(int *)(qword_8E5B118 + 0x148) ^ 0x329E1172LL) // header
    Ok((
        fields_offset,
        field_offset_map_offset,
        field_offset_group_offset,
        field_offset_offset,
    ))
}
