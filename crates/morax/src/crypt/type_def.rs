use anyhow::Result;

use crate::crypt::{event, field, method, property};
use crate::pe::{Pe, read_u16, read_u32};

pub const ENTRY_SIZE: usize = 0x46;
pub const NESTED_TYPE_ENTRY_SIZE: usize = 4;
pub const INTERFACE_TYPE_ENTRY_SIZE: usize = 4;

// Mutations
pub const PARENT_NONE: u32 = 0x48F95546;
pub const PARENT_BIAS: u32 = 0x48F95547;

pub struct RawType {
    pub namespace_index: u32,
    pub name_index: u32,
    pub field_start: u32,
    pub field_count: usize,
    pub method_start: u32,
    pub method_count: usize,
    pub property_start: u32,
    pub property_count: usize,
    pub event_start: u32,
    pub event_count: usize,
    pub flags: u32,
    pub raw_base_type: u32,
    pub bitfield: u32,
    pub generic_container: u16,
    pub interfaces_start: usize,
    pub interfaces_count: usize,
}

pub fn decrypt(data: &[u8], entry: usize) -> Result<RawType> {
    let (field_start, field_count) = field::type_block(data, entry)?;
    let (method_start, method_count) = method::type_block(data, entry)?;
    let (property_start, property_count) = property::type_block(data, entry)?;
    let (event_start, event_count) = event::type_block(data, entry)?;
    Ok(RawType {
        // E8 ? ? ? ? FF C7 8B 46 50
        namespace_index: read_u32(data, entry + 0x24)? - 0xE2CD277, // v7 = *(_DWORD *)(v2 + 0x24) - 0xE2CD277;
        name_index: read_u32(data, entry + 0x28)? - 0x16029708, // v8 = *(_DWORD *)(v2 + 0x28) - 0x16029708;

        field_start,
        field_count,
        method_start,
        method_count,
        property_start,
        property_count,
        event_start,
        event_count,

        // all at Mutations
        // il2cpp_image_get_class
        flags: read_u32(data, entry + 0x14)? - 0x1127390, // LODWORD(declaring_type->static_fields) = *(_DWORD *)(v38 + 0x14) - 0x1127390;
        raw_base_type: read_u32(data, entry + 0x04)?, // if ( *(_DWORD *)(v38 + 4) != 0x48F95546 )
        bitfield: read_u32(data, entry + 0x38)?,

        // E8 ? ? ? ? 48 89 C1 31 D2 E8 ? ? ? ? 40 F6 C7 ? 74 ?
        generic_container: read_u16(data, entry + 0x3C)? + 0x5404, // v17 = (unsigned int)(__int16)(*(_WORD *)(*(_QWORD *)(v44 + 112) + 0x3CLL) + 0x5404);

        // E8 ? ? ? ? 48 8B 0D ? ? ? ? FF 15 ? ? ? ? 48 8B 5D F8 System_RuntimeType__GetInterfaces
        // v29 = *(int *)(qword_8E5B120 + (*(int *)(qword_8E5B118 + 0x1C8) ^ 0x42F9275LL) + 4LL * (unsigned __int16)(v26 + (*(_WORD *)(*(_QWORD *)(a1 + 112) + 0x36LL) ^ 0xC28C)));// interfaces_start
        interfaces_start: (read_u16(data, entry + 0x36)? ^ 0xC28C) as usize,
        interfaces_count: (data[entry + 0x44] ^ 0xC7) as usize, // v19 = *(unsigned __int8 *)(*(_QWORD *)(a1 + 112) + 68LL) ^ 0xC7LL;// interfaces_count
    })
}

// E8 ? ? ? ? 4C 8B 73 ? 4D 85 ? 0F 84 ? ? ? ? ?
// il2cpp_class_get_nested_types
pub fn decrypt_nested(data: &[u8], entry: usize) -> Result<(usize, usize)> {
    let count = (data[entry + 0x43] + 4) as usize; // v2 = *(_BYTE *)(a1[14] + 0x43LL) + 4;
    let start = (read_u16(data, entry + 0x3A)? ^ 0xB2C0) as usize; // + (*(__int16 *)(a1[14] + 0x3ALL) ^ 0x3FFFFFFFFFFFB2C0LL))));// start

    Ok((start, count))
}

pub fn decode_parent_index(raw_base_type: u32) -> Option<u32> {
    if raw_base_type == PARENT_NONE {
        return None;
    }
    Some(raw_base_type - PARENT_BIAS)
}

// Global-metadata header fields locating the typedef / nested-type / interface tables. decode_header calls this.
pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32, u32)> {
    // E8 ? ? ? ? 48 8B 4F 28 EB ?
    // System_RuntimeTypeHandle__GetMetadataToken
    let type_definitions_offset = pe.rd32(hdr + 0x84)? ^ 0x68531D3F; // * (unsigned int)((*(_QWORD *)(v4 + 112) - (qword_8E5B120 + (*(int *)(qword_8E5B118 + 132) ^ 0x68531D3FuLL))) >> 1));
    // E8 ? ? ? ? 4C 8B 73 ? 4D 85 ? 0F 84 ? ? ? ? ?
    // il2cpp_class_get_nested_types
    let nested_types_offset = pe.rd32(hdr + 0x12C)? ^ 0x26F0FC20; // + (*(int *)(qword_8E5B118 + 0x12C) ^ 0x26F0FC20LL)
    // E8 ? ? ? ? 48 8B 0D ? ? ? ? FF 15 ? ? ? ? 48 8B 5D F8
    // System_RuntimeType__GetInterfaces_0
    let interfaces_offset = pe.rd32(hdr + 0x1C8)? ^ 0x42F9275; // + (*(int *)(qword_8E5B118 + 0x1C8) ^ 0x42F9275LL)
    Ok((
        type_definitions_offset,
        nested_types_offset,
        interfaces_offset,
    ))
}
