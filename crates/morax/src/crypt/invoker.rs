// Il2CppMethodDefinition
// PATTERN = 66 0F 6F 05 ?? ?? ?? ?? 4C 89 C5

use crate::pe::Pe;
use anyhow::Result;

pub const CODE_REGISTRATION_INVOKER_POINTERS_OFF: u32 = 0x00;
pub const INVOKER_INDEX_NONE: u16 = 0xFFFF;

// E8 ? ? ? ? 48 89 47 18 48 8B 85 80 00 00 00
pub fn pointer_count(pe: &Pe, code_registration: u32) -> Result<u32> {
    Ok(pe.rd32(code_registration + 0x70)? ^ 0x274245BD) // if ( (*(_DWORD *)(qword_8E5B0F8 + 0x70) ^ 0x274245BDu) <= (unsigned int)v43 )// invoker count
}

pub fn head_block(pe: &Pe, hdr: u32) -> Result<u32> {
    Ok(pe.rd32(hdr + 0x13C)? ^ 0x46C8010F) // v50 = *(unsigned __int16 *)(v37 + (*(int *)(v38 + 0x13C) ^ 0x46C8010FLL) + 2 * v42);
}
