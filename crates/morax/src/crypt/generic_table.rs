// Il2CppGenericMethodFunctionsDefinitions { specIndex: i32, fallbackIndex: i32, methodIndex: u16 }
// PATTERN = E8 ? ? ? ? 48 8B 4F 28 EB ?

use anyhow::Result;

use crate::pe::Pe;

pub const ENTRY_SIZE: usize = 12;
pub const FALLBACK_INDEX_OFF: usize = 0x4;
pub const METHOD_INDEX_OFF: usize = 0x8;
pub const SHARED_METHOD_INDEX: u16 = 0xFFFF;

// qword_8E5B0F8 = Il2CppCodeRegistration (off_3FD82F0):
//   v43 = *(unsigned __int16 *)(entry + 8);                            // methodIndex
//   if ( v43 != 0xFFFF )
//       return *(*(qword_8E5B0F8 + 0x10)  + 8 * v43);                    // genericMethodPointers
//   v43 = *(int *)(entry + 4);                                         // fallbackIndex
//   return *(*(qword_8E5B0F8 + 0x98) + 8 * v43);                        // shared/secondary table
pub const CODE_REGISTRATION_GENERIC_METHOD_POINTERS_OFF: u32 = 0x10;
pub const CODE_REGISTRATION_SECONDARY_POINTERS_OFF: u32 = 0x98;

// global metadata init under method_count hdr = Il2CppGlobalMetadataHeader
pub fn head_block(pe: &Pe, hdr: u32) -> Result<(u32, u32)> {
    let offset = pe.rd32(hdr + 0xEC)? ^ 0x67F701BA; // v626 = qword_8E5B120 + (*(int *)(qword_8E5B118 + 0xEC) ^ 0x67F701BALL);// generic table offset
    let count = (pe.rd32(hdr + 0x1E4)? ^ 0x720FEF70) / ENTRY_SIZE as u32; // v628 = (*(int *)(qword_8E5B118 + 484) ^ 0x720FEF70uLL) / 0xC;// generic table count
    Ok((offset, count))
}
