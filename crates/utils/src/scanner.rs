use std::sync::OnceLock;

use patternscan::scan_first_match;
use windows::{
    Win32::System::{
        LibraryLoader::GetModuleHandleA,
        ProcessStatus::{GetModuleInformation, MODULEINFO},
        Threading::GetCurrentProcess,
    },
    core::s,
};

pub fn game_assembly_slice() -> &'static [u8] {
    static SLICE: OnceLock<&[u8]> = OnceLock::new();
    unsafe {
        SLICE.get_or_init(|| {
            let module = GetModuleHandleA(s!("GameAssembly.dll")).unwrap();
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

pub fn scan_ga_section(pat: &str) -> Option<usize> {
    let mut slice = game_assembly_slice();
    scan_first_match(&mut slice, pat).unwrap().map(|address| {
        let slice = game_assembly_slice();
        match slice.get(address) {
            Some(&0xE8) => {
                let offset =
                    i32::from_le_bytes(slice[address + 1..address + 5].try_into().unwrap());
                address + 5 + offset as usize
            }
            Some(&0x48) if slice.get(address + 1) == Some(&0x8B) => {
                let offset =
                    i32::from_le_bytes(slice[address + 3..address + 7].try_into().unwrap());
                address + 7 + offset as usize
            }
            _ => address,
        }
    })
}

pub fn unity_player_slice() -> &'static [u8] {
    static SLICE: OnceLock<&[u8]> = OnceLock::new();
    unsafe {
        SLICE.get_or_init(|| {
            let module = GetModuleHandleA(s!("UnityPlayer.dll")).unwrap();
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

pub fn scan_unity_player_section(pat: &str) -> Option<usize> {
    let mut slice = unity_player_slice();
    scan_first_match(&mut slice, pat).unwrap().map(|address| {
        let slice = unity_player_slice();
        match slice.get(address) {
            Some(&0xE8) => {
                let offset =
                    i32::from_le_bytes(slice[address + 1..address + 5].try_into().unwrap());
                address + 5 + offset as usize
            }
            Some(&0x48) if slice.get(address + 1) == Some(&0x8B) => {
                let offset =
                    i32::from_le_bytes(slice[address + 3..address + 7].try_into().unwrap());
                address + 7 + offset as usize
            }
            _ => address,
        }
    })
}

pub fn xluau_bytes() -> &'static [u8] {
    static SLICE: OnceLock<&[u8]> = OnceLock::new();

    unsafe {
        SLICE.get_or_init(|| {
            let module = GetModuleHandleA(s!("xluau.dll")).unwrap();
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

pub fn scan_by_pattern(pat: &str) -> Option<usize> {
    scan_first_match(&mut xluau_bytes(), pat)
        .unwrap()
        .map(|address| {
            let xluau_bytes = xluau_bytes();
            match xluau_bytes.get(address) {
                // jmp sub_xxxxxxx
                Some(&0xE8) => {
                    let offset = i32::from_le_bytes(
                        xluau_bytes[address + 1..address + 5].try_into().unwrap(),
                    );
                    address + 5 + offset as usize
                }
                // mov REGISTER, [rip + offset] (0x48 0x8B 0x0D XXXXXXXX)
                Some(&0x48) if xluau_bytes.get(address + 1) == Some(&0x8B) => {
                    let offset = i32::from_le_bytes(
                        xluau_bytes[address + 3..address + 7].try_into().unwrap(),
                    );
                    address + 7 + offset as usize
                }
                _ => address,
            }
        })
}
