use std::ffi::c_void;

use windows::{
    Win32::System::{
        LibraryLoader::{GetModuleHandleA, GetProcAddress},
        Memory,
    },
    core::s,
};

#[inline]
pub fn read_csharp_string(ptr: *const u8) -> String {
    if !ptr.is_null() {
        let str_slice = unsafe {
            std::slice::from_raw_parts(
                ptr.byte_offset(20).cast::<u16>(),
                *ptr.byte_offset(16).cast::<u32>() as usize,
            )
        };

        String::from_utf16_lossy(str_slice)
    } else {
        String::new()
    }
}

pub fn disable_memory_protection() {
    unsafe {
        let ntdll = GetModuleHandleA(s!("ntdll.dll")).unwrap();
        let proc_addr = GetProcAddress(ntdll, s!("NtProtectVirtualMemory")).unwrap();

        let nt_func = if GetProcAddress(ntdll, s!("wine_get_version")).is_some() {
            GetProcAddress(ntdll, s!("NtPulseEvent")).unwrap()
        } else {
            GetProcAddress(ntdll, s!("NtQuerySection")).unwrap()
        };

        let mut prot = Memory::PAGE_EXECUTE_READWRITE;
        Memory::VirtualProtect(proc_addr as *const usize as *mut c_void, 1, prot, &mut prot)
            .unwrap();

        let routine = nt_func as *mut u32;
        let routine_val = *(routine as *const usize);

        let lower_bits_mask = !(0xFFu64 << 32);
        let lower_bits = routine_val & lower_bits_mask as usize;

        let offset_val = *((routine as usize + 4) as *const u32);
        let upper_bits = ((offset_val as usize).wrapping_sub(1) as usize) << 32;

        let result = lower_bits | upper_bits;

        *(proc_addr as *mut usize) = result;
        Memory::VirtualProtect(proc_addr as *const usize as *mut c_void, 1, prot, &mut prot)
            .unwrap();
    }
}
