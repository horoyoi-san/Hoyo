use std::{path::PathBuf, sync::OnceLock};

use windows::Win32::{
    Foundation::{HINSTANCE, HMODULE},
    System::LibraryLoader::GetModuleFileNameW,
};

static DLL_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn remember_dll_dir(instance: HINSTANCE) {
    let mut buffer = [0u16; 1024];
    let len = unsafe { GetModuleFileNameW(Some(HMODULE(instance.0)), &mut buffer) } as usize;
    if len == 0 {
        return;
    }

    let path = PathBuf::from(String::from_utf16_lossy(&buffer[..len]));
    if let Some(parent) = path.parent() {
        let _ = DLL_DIR.set(parent.to_path_buf());
    }
}

pub fn launch() {
    let Some(dir) = DLL_DIR.get() else {
        println!("[UI] skipped frontend launch: dll dir is unknown");
        return;
    };

    let candidates = [
        dir.join("hsr-frontend.exe"),
        dir.join("target").join("debug").join("hsr-frontend.exe"),
        dir.join("target").join("release").join("hsr-frontend.exe"),
    ];

    for exe in candidates {
        if exe.is_file() {
            match std::process::Command::new(&exe).spawn() {
                Ok(_) => println!("[UI] launched {}", exe.display()),
                Err(error) => println!("[UI] failed to launch {}: {error}", exe.display()),
            }
            return;
        }
    }

    println!("[UI] hsr-frontend.exe not found near {}", dir.display());
}
