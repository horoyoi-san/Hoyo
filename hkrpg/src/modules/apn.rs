use dashmap::DashMap;
use ilhook::x64::Registers;
use patternscan::scan_first_match;
use std::{
    borrow::Cow,
    ffi::{CStr, CString},
    path::Path,
    sync::{LazyLock, OnceLock},
};
use windows::{
    Win32::System::{
        LibraryLoader::{GetModuleHandleW, LoadLibraryW},
        ProcessStatus::{GetModuleInformation, MODULEINFO},
        Threading::GetCurrentProcess,
    },
    core::{PCWSTR, w},
};

use crate::modules::{HkrpgModule, HkrpgModuleContext};

pub struct ApnPatch;

impl HkrpgModule for HkrpgModuleContext<ApnPatch> {
    unsafe fn init(&mut self) -> Result<(), ilhook::HookError> {
        if !load_apn_dll() {
            return Ok(());
        };

        let base;
        loop {
            if let Ok(module) = unsafe { GetModuleHandleW(w!("AccountPlatNative.dll")) } {
                base = module.0 as usize;
                println!("AccountPlatNative.dll: 0x{base:X}");
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        let Some(string_alloc_rva) = scan_apn("E8 ? ? ? ? 41 89 BF") else {
            println!("[AccountPlatNative] failed to scan string_alloc rva. patch disabled");
            return Ok(());
        };

        self.interceptor
            .attach(base + string_alloc_rva, on_string_alloc)
            .expect("Failed to hook AccountPlatNative string alloc");

        println!("[AccountPlatNative] patch enabled");
        Ok(())
    }
}

extern "win64" fn on_string_alloc(reg: *mut Registers, _: usize) {
    const SDK_PUBLIC_KEY: &str = include_str!("../../sdk_public_key.pem");
    static STRING_CACHE_MAP: LazyLock<DashMap<Cow<'static, str>, CString>> =
        LazyLock::new(DashMap::new);

    unsafe {
        let content = CStr::from_ptr((*reg).rdx as *const i8).to_string_lossy();
        let size = (*reg).r8;

        if let Some(cstring) = STRING_CACHE_MAP.get(&content) {
            (*reg).rdx = cstring.as_ptr() as u64;
            (*reg).r8 = cstring.count_bytes() as u64;
            return;
        }

        // URL string alloc
        if content.starts_with("https://") && content.contains(".mihoyo.com") {
            let mut new_url = String::from("http://127.0.0.1:21000");
            content.split('/').skip(3).for_each(|s| {
                new_url.push('/');
                new_url.push_str(s);
            });

            let cstring = STRING_CACHE_MAP
                .entry(content.clone())
                .or_insert_with(|| CString::new(&*new_url).expect("Failed to create CString"));

            (*reg).rdx = cstring.as_ptr() as u64;
            (*reg).r8 = new_url.len() as u64;

            println!("[AccountPlatNative] url {content} replaced to {new_url}");
        }
        // RSA public key string alloc
        else if size == 268 && content.starts_with("-----BEGIN PUBLIC KEY-----") {
            let cstring = STRING_CACHE_MAP
                .entry(content.clone())
                .or_insert_with(|| CString::new(SDK_PUBLIC_KEY).expect("Failed to create CString"));

            (*reg).rdx = cstring.as_ptr() as u64;
            (*reg).r8 = SDK_PUBLIC_KEY.len() as u64;
            println!("[AccountPlatNative] sdk public key replaced! ");
        }
    }
}

fn load_apn_dll() -> bool {
    let dll_path = "./StarRail_Data/Plugins/x86_64/AccountPlatNative.dll";

    if !Path::new(dll_path).exists() {
        return false;
    }

    let wide_dll_path: Vec<u16> = dll_path.encode_utf16().chain(std::iter::once(0)).collect();
    let ptr = wide_dll_path.as_ptr();

    if let Err(err) = unsafe { LoadLibraryW(PCWSTR::from_raw(ptr)) } {
        println!("[AccountPlatNative] Failed to inject {dll_path}. Error: {err:#?}",);
    };

    true
}

pub fn scan_apn(pat: &str) -> Option<usize> {
    let mut slice = apn_slice();
    scan_first_match(&mut slice, pat).unwrap().map(|address| {
        let slice = apn_slice();
        match slice.get(address) {
            // jmp sub_xxxxxxx
            Some(&0xE8) => {
                let offset =
                    i32::from_le_bytes(slice[address + 1..address + 5].try_into().unwrap());
                address + 5 + offset as usize
            }
            // mov REGISTER, [rip + offset] (0x48 0x8B 0x0D XXXXXXXX)
            Some(&0x48) if slice.get(address + 1) == Some(&0x8B) => {
                let offset =
                    i32::from_le_bytes(slice[address + 3..address + 7].try_into().unwrap());
                address + 7 + offset as usize
            }
            _ => address,
        }
    })
}

fn apn_slice() -> &'static [u8] {
    static SLICE: OnceLock<&[u8]> = OnceLock::new();
    unsafe {
        SLICE.get_or_init(|| {
            let module = GetModuleHandleW(w!("AccountPlatNative.dll")).unwrap();
            let mut module_info = MODULEINFO {
                lpBaseOfDll: std::ptr::null_mut(),
                SizeOfImage: 0,
                EntryPoint: std::ptr::null_mut(),
            };
            GetModuleInformation(
                GetCurrentProcess(),
                module,
                &mut module_info,
                std::mem::size_of::<MODULEINFO>() as u32,
            )
            .unwrap();
            std::slice::from_raw_parts(
                module.0 as *const u8,
                module_info.SizeOfImage.try_into().unwrap(),
            )
        })
    }
}
