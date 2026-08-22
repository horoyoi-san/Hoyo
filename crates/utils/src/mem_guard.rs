use std::ffi::c_void;

use windows::{
    Win32::System::{
        LibraryLoader::{GetModuleHandleA, GetModuleHandleW, GetProcAddress},
        Memory::{PAGE_EXECUTE_READWRITE, PAGE_PROTECTION_FLAGS, VirtualProtect},
    },
    core::{PCSTR, PCWSTR, s, w},
};

pub fn disable_memprotect_guard() {
    unsafe {
        let ntdll = w!("ntdll.dll");
        let ntdll = GetModuleHandleW(PCWSTR::from_raw(ntdll.as_ptr())).unwrap();
        let proc_addr = GetProcAddress(
            ntdll,
            PCSTR::from_raw(c"NtProtectVirtualMemory".to_bytes_with_nul().as_ptr()),
        )
        .unwrap();

        let routine = if is_wine() {
            GetProcAddress(ntdll, s!("NtPulseEvent")).unwrap()
        } else {
            GetProcAddress(ntdll, s!("NtQuerySection")).unwrap()
        } as *mut u32;

        let mut old_prot = PAGE_PROTECTION_FLAGS(0);
        VirtualProtect(
            proc_addr as *const usize as *mut c_void,
            1,
            PAGE_EXECUTE_READWRITE,
            &mut old_prot,
        )
        .unwrap();

        let routine_val = *(routine as *const usize);

        let lower_bits_mask = !(0xFFu64 << 32);
        let lower_bits = routine_val & lower_bits_mask as usize;

        let offset_val = *((routine as usize + 4) as *const u32);
        let upper_bits = ((offset_val as usize).wrapping_sub(1) as usize) << 32;

        let result = lower_bits | upper_bits;

        *(proc_addr as *mut usize) = result;

        VirtualProtect(
            proc_addr as *const usize as *mut c_void,
            1,
            old_prot,
            &mut old_prot,
        )
        .unwrap();
    }
}

fn is_wine() -> bool {
    let module = unsafe { GetModuleHandleA(s!("ntdll.dll")).unwrap() };
    unsafe { GetProcAddress(module, s!("wine_get_version")).is_some() }
}
