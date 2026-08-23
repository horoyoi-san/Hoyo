// Il2CppFieldDefaultValue
// fields = il2cpp_class_get_fields(v5, v26);
//     if ( !fields )
//       return v21 & 1;
//     v13 = (_QWORD *)fields;
//     v14 = (const char *)(*(_QWORD *)(fields + 16) - 0x72916D972C0FE1BFLL);
//     if ( strcmp("value__", v14) ) // this string
//     {
//       v15 = *v25;
//       v16 = strlen(v14);
//       *(_QWORD *)(v15 + 8 * v22 + 32) = sub_3944DE0(v14, v16);
//       v17 = strlen((const char *)(v13[2] - 0x72916D972C0FE1BFLL));
//       *(_QWORD *)(v15 + 8 * v22 + 32) = sub_3944DE0(v13[2] - 0x72916D972C0FE1BFLL, v17);
//       v11 = sub_39393D0(v5, v13); // here
use std::collections::HashMap;

use crate::crypt::header;
use crate::pe::{Pe, read_i32};
use anyhow::Result;

pub const ENTRY_SIZE: usize = 12;

pub struct RawFieldDefaultValue {
    pub type_index: i32,
    pub data_index: i32,
    pub field_index: i32,
}

pub fn decrypt(data: &[u8], entry: usize) -> Result<RawFieldDefaultValue> {
    Ok(RawFieldDefaultValue {
        type_index: read_i32(data, entry)?,
        data_index: read_i32(data, entry + 4)?,
        field_index: read_i32(data, entry + 8)?,
    })
}

pub fn load(
    pe: &Pe,
    metadata_registration_rva: u32,
    global_data: &[u8],
    payload_offset: u32,
    field_default_values_offset: u32,
) -> Result<HashMap<usize, (u32, u32)>> {
    let type_info_count = pe
        .rd32(metadata_registration_rva + header::METADATA_REGISTRATION_COUNT_OFF)?
        - header::METADATA_REGISTRATION_COUNT_ADD;

    let base = payload_offset as usize + field_default_values_offset as usize;

    let mut map = HashMap::new();
    let mut index = 0usize;
    loop {
        let entry = base + index * ENTRY_SIZE;
        if entry + ENTRY_SIZE > global_data.len() {
            break;
        }
        let raw = decrypt(global_data, entry)?;
        if raw.field_index < 0 || raw.field_index > 10_000_000 {
            break;
        }
        if raw.type_index < 0 || raw.type_index as u32 > type_info_count {
            break;
        }
        map.insert(
            raw.field_index as usize,
            (raw.type_index as u32, raw.data_index as u32),
        );
        index += 1;
    }
    Ok(map)
}

pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32)> {
    let field_default_values_offset = pe.rd32(hdr + 0x1FC)? ^ 0x6238CDB0; // *(_QWORD *)&v5 = qword_8E5B120 + (*(int *)(qword_8E5B118 + 0x1FC) ^ 0x6238CDB0LL);
    let field_and_parameter_default_value_data_offset = pe.rd32(hdr + 0x3C)? - 0x6874185B; // v5 = (__int16 *)(v12 + *(_DWORD *)(qword_8E5B118 + 0x3C) - 0x6874185B + qword_8E5B120);
    Ok((
        field_default_values_offset,
        field_and_parameter_default_value_data_offset,
    ))
}
