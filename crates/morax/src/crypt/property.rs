// PATTERN = E8 ? ? ? ? 48 85 C0 0F 84 ? ? ? ? 48 89 C5 89 D8 il2cpp_vm_class_get_properties
// call cs:__imp_EnterCriticalSection call Class::SetupProperties

use anyhow::Result;

use crate::pe::{Pe, read_u16, read_u32};

pub struct RawProperty {
    pub name_index: u32,
    pub get_local: u16,
    pub set_local: u16,
}

// v36 = qword_8E5B120 + (*(int *)(qword_8E5B118 + 0x40) ^ 0x3C685CDBLL);  // header
pub fn head_block(pe: &Pe, hdr: u32) -> Result<u32> {
    Ok(pe.rd32(hdr + 0x40)? ^ 0x3C685CDB) // v36 = qword_8E5B120 + (*(int *)(qword_8E5B118 + 0x40) ^ 0x3C685CDBLL);  // header
}

// v36 = qword_8E5B120 + (*(int *)(qword_8E5B118 + 0x40) ^ 0x3C685CDB); // properties table base
// each property base = v36 + 10 * v33 , v33 global property index
// *(_DWORD *)(v36 + 10LL * v33)          name   @ +0  (u32, 4)
// *(_WORD  *)(v36 + 10LL * v33 + 6)      // getter @ +6  (u16, 2)
// v38 = v36 + 10LL * v33;
// *(_WORD  *)(v38 + 4)                    // setter @ +4  (u16, 2)
// *(_WORD  *)(v38 + 8)                    // attrs/token @ +8 (u16, 2)
// ++v33;                                  // index +1
// 4 + 2 + 2 + 2 + 2 = 10
pub const ENTRY_SIZE: usize = 10;
pub const ACCESSOR_NONE: u16 = 0xFFFF;

// v37 = ((((0x6D28A1EF * ((6035LL * v33) ^ 0x280E7A20uLL)) >> 17) ^ 0x727EFF5B) + 0x633C43D6) ^ 0x4ADBD505;// property_key
pub fn property_key(index: u64) -> u32 {
    let a = (6035_u64 * index) ^ 0x280E7A20;
    let c = (0x6D28A1EF * a) >> 17;
    (((c as u32) ^ 0x727EFF5B) + 0x633C43D6) ^ 0x4ADBD505
}

// entry part pub const ENTRY_SIZE: usize = 10;
pub fn decrypt(data: &[u8], entry: usize, global_index: usize) -> Result<RawProperty> {
    let k = property_key(global_index as u64);
    Ok(RawProperty {
        name_index: (read_u32(data, entry)? ^ 0x6199063C) - k,
        set_local: (read_u16(data, entry + 0x4)? ^ 0x4B8F) - k as u16,
        get_local: (read_u16(data, entry + 0x6)? ^ 0xFA36) - k as u16,
    })
}

// v32 = *(_DWORD *)(*(_QWORD *)(v3 + 0x70) + 0x1CLL);
//       v41 = v32 + v24 - 0x39D706EF;             // type PROPERTY START
pub fn type_block(data: &[u8], entry: usize) -> Result<(u32, usize)> {
    let property_start = read_u32(data, entry + 0x1C)? - 0x39D706EF;
    let property_count = (data[entry + 0x41] + 0x1F) as usize; // v7 = 40LL * (unsigned __int8)(*(_BYTE *)(*(_QWORD *)(v39 + 0x70) + 0x41LL) + 0x1F);// type PROPERTY COUNT
    Ok((property_start, property_count))
}
