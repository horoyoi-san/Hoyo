use crate::modules::{HkrpgModule, HkrpgModuleContext};
use ilhook::x64::Registers;
use std::ffi::CStr;
use windows::{
    Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress},
    core::s,
};

pub struct Misc;

impl HkrpgModule for HkrpgModuleContext<Misc> {
    unsafe fn init(&mut self) -> Result<(), ilhook::HookError> {
        unsafe {
            let ws32 = GetModuleHandleA(s!("Ws2_32.dll")).unwrap();
            let get_addr_info = GetProcAddress(ws32, s!("getaddrinfo")).unwrap();
            self.interceptor
                .attach(get_addr_info as usize, Misc::on_get_addr_info)?;

            println!("[misc::init] initialized")
        }

        Ok(())
    }
}

impl Misc {
    pub unsafe extern "win64" fn on_get_addr_info(reg: *mut Registers, _: usize) {
        unsafe {
            let host = CStr::from_ptr((*reg).rcx as *const i8).to_string_lossy();

            if host.contains("globaldp-")
                && (host.contains("bhsr.com") || host.contains("starrails.com"))
            {
                println!("[*] [on_get_addr_info] {host} -> 0.0.0.0");
                std::ptr::copy_nonoverlapping(c"0.0.0.0".as_ptr(), (*reg).rcx as *mut i8, 9);
                // println!("[*] [on_get_addr_info] {host} -> 127.0.0.1");
                // std::ptr::copy_nonoverlapping(c"127.0.0.1".as_ptr(), (*reg).rcx as *mut i8, 9);
            }
        }
    }
}
