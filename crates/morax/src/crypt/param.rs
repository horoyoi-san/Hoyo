// Il2CppParameterDefinition
// PATTERN = E8 ? ? ? ? 49 8B 56 28 0F B6 5A 2E
// il2cpp_method_get_param

use anyhow::Result;

use crate::pe::{Pe, read_u32};

pub const ENTRY_SIZE: usize = 8;

// v30 = 0x58B870A2 * ((unsigned __int64)(0x72E1D74B12BLL * v28 + 0x1911D05AFF5LL) >> 0xB) - 0x7C3084BC;
pub fn parameter_key(index: u64) -> u32 {
    let v = (index * 0x72E1D74B12B + 0x1911D05AFF5) >> 0x0B;
    (v as u32) * 0x58B870A2 - 0x7C3084BC
}

// v31 = (*(_DWORD *)(v29 + 8 * v28) ^ 0x67E90DC5) - v30;
pub fn decrypt_type_index(data: &[u8], entry: usize, parameter_index: usize) -> Result<u32> {
    Ok((read_u32(data, entry)? ^ 0x67E90DC5) - parameter_key(parameter_index as u64))
}

// v26->_1.image = sub_392E220((*(_DWORD *)(v29 + 8 * v28 + 4) ^ 0x7103092Eu) - v30);// parameter name
pub fn decrypt_name_index(data: &[u8], entry: usize, parameter_index: usize) -> Result<u32> {
    Ok((read_u32(data, entry + 4)? ^ 0x7103092E) - parameter_key(parameter_index as u64))
}

// v29 = qword_8E5B120 + *(_DWORD *)(qword_8E5B118 + 0x30) - 0x230A0242;
pub fn head_block(pe: &Pe, hdr: u32) -> Result<u32> {
    Ok(pe.rd32(hdr + 0x30)? - 0x230A0242) // v29 = qword_8E5B120 + *(_DWORD *)(qword_8E5B118 + 0x30) - 0x230A0242;
}
