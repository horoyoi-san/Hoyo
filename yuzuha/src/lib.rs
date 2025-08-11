use std::{sync::OnceLock, thread, time::Duration};

use interceptor::Interceptor;
use windows::{
    Win32::{
        Foundation::HINSTANCE,
        System::{Console, LibraryLoader::GetModuleHandleA, SystemServices::DLL_PROCESS_ATTACH},
    },
    core::s,
};

mod censorship_patch;
mod crypto;
mod hoyopass;
mod interceptor;
mod network;
mod util;

type PtrToStringAnsi = extern "C" fn(chars: *const u8) -> u64;
static BASE: OnceLock<usize> = OnceLock::new();

fn on_attach() {
    // SAFETY: fuck off
    unsafe {
        let _ = Console::FreeConsole();
        let _ = Console::AllocConsole();
    }

    println!("yuzuha-patch (2.2.4 BETA) is initializing");
    println!(
        "to work with orphie-zs: https://git.xeondev.com/orphie-zs/orphie-zs/"
    );

    let base = loop {
        unsafe {
            match GetModuleHandleA(s!("GameAssembly.dll")) {
                Ok(handle) => break handle.0 as usize,
                Err(_) => thread::sleep(Duration::from_millis(200)),
            }
        }
    };

    thread::sleep(Duration::from_secs(5));
    util::disable_memory_protection();

    let _ = BASE.set(base);
    let mut interceptor = Interceptor::new(base);

    network::hook_make_initial_url(&mut interceptor);
    network::hook_web_request_create(&mut interceptor);
    crypto::patch_encryption(&mut interceptor);
    hoyopass::disable_hoyopass(&mut interceptor);
    censorship_patch::init(&mut interceptor);

    std::thread::sleep(Duration::from_secs(u64::MAX));
}

#[unsafe(no_mangle)]
#[allow(non_snake_case)]
unsafe extern "system" fn DllMain(_: HINSTANCE, call_reason: u32, _: *mut ()) -> bool {
    if call_reason == DLL_PROCESS_ATTACH {
        thread::spawn(on_attach);
    }

    true
}
