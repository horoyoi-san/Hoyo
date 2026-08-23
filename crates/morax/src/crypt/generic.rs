// Il2CppGenericClass
// System_Reflection_MonoMethod__GetGenericArguments
// PATTERN = E8 ? ? ? ? 48 85 C0 0F 84 ? ? ? ? 48 8B 40 18 49 8B 4F 18

use anyhow::Result;

use crate::pe::{Pe, read_u16, read_u32};

pub struct GenericParameter {
    pub name_index: u32,
    pub owner_index: u16,
    pub num: u16,
}

pub const CLASS_ENTRY_SIZE: usize = 8; // Il2CppGenericClass (startup blob; plaintext)
pub const CONTAINER_ENTRY_SIZE: usize = 16;
pub const INST_ENTRY_SIZE: usize = 0x10; // Il2CppGenericInst {argc, argv} (binary; plaintext)
pub const PARAMETER_ENTRY_SIZE: usize = 14;

// v9 = (0x2C9A0EA3 * ((0x770E3FE8 * ((unsigned __int64)(0x3D6913E0AF40LL * v7 + 0xA64CAD60FA052C0LL) >> 0x17)) >> 0xB)) >> 0x17;
pub fn container_key(index: u64) -> u32 {
    let v = 0xA64CAD60FA052C0 + (0x3D6913E0AF40 * index);
    let v = (v >> 0x17) * 0x770E3FE8;
    let v = (v >> 0x0B) * 0x2C9A0EA3;
    let v = v >> 0x17;
    v as u32
}

// v13 = (0x4AADBD4B * ((((0x617FE3CC452CLL * (unsigned __int64)v16 + 0x9DC5DB71F0EB440LL) >> 9) + 0x2AD8C631) ^ 0x5278374D)) >> 0xF;
pub fn parameter_key(index: u64) -> u32 {
    let v = 0x09DC5DB71F0EB440 + (0x617FE3CC452C * index);
    let v = (v >> 9) + 0x2AD8C631;
    let v = v ^ 0x5278374D;
    ((v * 0x4AADBD4B) >> 0x0F) as u32
}

pub fn decrypt_container(data: &[u8], entry: usize, container_index: u32) -> Result<(u32, u32)> {
    let k = container_key(container_index as u64);
    let parameter_count = (read_u32(data, entry)? - 0xCCEBB89) ^ k; // v10 = (unsigned int)v9 ^ (*(_DWORD *)v8 - 0xCCEBB89);
    // for ( j = 0; j != v10; ++j )
    let parameter_start = (read_u32(data, entry + 0x0C)? + 0xF12AF1B1) ^ k; // v16 = (v9 ^ (*(_DWORD *)(v8 + 0xC) - 0xED50E4F)) + (unsigned __int16)j;
    Ok((parameter_count, parameter_start))
}

// System_RuntimeTypeHandle__GetGenericParameterInfo_0
// il2cpp_class_get_namespace E8 ? ? ? ? 48 89 46 08 41 0F B7 4F 08
pub fn decrypt_parameter(
    data: &[u8],
    entry: usize,
    parameter_index: u32,
) -> Result<GenericParameter> {
    let key = parameter_key(parameter_index as u64) as i64;
    Ok(GenericParameter {
        name_index: (read_u32(data, entry)? as i64 - key - 0x44888123) as u32, // *((_QWORD *)v18 + 1) = sub_392E220(*(_DWORD *)v5 - (int)v4 - 0x44888123);
        owner_index: ((read_u16(data, entry + 8)? ^ 0x7526) as i64 - key) as u16, // v18[8] = (*(_WORD *)(v5 + 12) ^ 0x7AF7) - v4;
        num: ((read_u16(data, entry + 10)? ^ 0xBD3B) as i64 - key) as u16, // *((_DWORD *)v18 + 5) = (unsigned __int16)((*(_WORD *)(v5 + 10) ^ 0xBD3B) - v4);
    })
}

pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32, u32, u32)> {
    // global metadata init count first Il2CppGlobalMetadataHeader +
    let generic_classes_count = (((pe.rd32(hdr + 0xBC)? as i32) >> 3) ^ 0x79FC2EC) as u32; // v84 = (*(int *)(qword_8E5B118 + 0xBC) >> 3) ^ 0x79FC2EC;// generic_classes_count
    // offset is startup-metadata.dat
    let generic_classes_offset = pe.rd32(hdr + 0x164)? ^ 0x7F5C5934; //  v606 = (__int64)qword_8E5B128 + (*(int *)(v83 + 0x164) ^ 0x7F5C5934LL);// generic_classes_offset
    // this part on MonoMethod__GetGenericArguments_0
    let generic_containers_offset = pe.rd32(hdr + 0xF0)? - 0x62B76DF1; // v8 = (_DWORD *)(*(_DWORD *)(qword_8E5B118 + 0xF0) - 0x62B76DF1 + qword_8E5B120 + 16 * v7);
    let generic_parameters_offset = pe.rd32(hdr + 0x140)? - 0x25538CF7; // v14 = qword_8E5B120 + *(_DWORD *)(qword_8E5B118 + 0x140) - 0x25538CF7 + 14LL * v16;
    Ok((
        generic_classes_offset,
        generic_classes_count,
        generic_containers_offset,
        generic_parameters_offset,
    ))
}
