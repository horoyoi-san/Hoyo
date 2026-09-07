use std::{thread, time::Duration};

use modules::{
    HkrpgModuleManager, apn::ApnPatch, censorship_patch::CensorshipPatch, crypto::Crypto,
    hk_check::HkCheck, misc::Misc, network::Network,
};
use windows::{
    Win32::Foundation::HINSTANCE,
    Win32::System::SystemServices::DLL_PROCESS_ATTACH,
    Win32::System::{Console, LibraryLoader::GetModuleHandleA},
    core::s,
};

mod addr;
mod il2cpp_string;
mod interceptor;
mod modules;
mod util;

#[allow(non_snake_case)]
#[no_mangle]
pub unsafe extern "system" fn DllMain(_: HINSTANCE, call_reason: u32, _: *mut ()) -> i32 {
    if call_reason == DLL_PROCESS_ATTACH {
        std::thread::spawn(main);
    }
    1
}

pub fn hkrpg_log(tag: &str, msg: impl std::fmt::Display) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let hours = (now / 3600) % 24;
    let minutes = (now / 60) % 60;
    let seconds = now % 60;
    println!("[{:02}:{:02}:{:02}] [HKRPG] [{tag}] {msg}", hours, minutes, seconds);
}

pub fn main() {
    unsafe {
        let _ = Console::AllocConsole();
        let _ = Console::SetConsoleTitleA(windows::core::s!("AstralOS | HKRPG Direct Hook Engine 2026"));

        hkrpg_log("INIT", "Autonomous Direct Redirection & Hook Engine Started");

        while GetModuleHandleA(s!("GameAssembly.dll")).is_err() {
            thread::sleep(Duration::from_millis(200));
        }

        hkrpg_log("INIT", "GameAssembly.dll attached, initializing modules...");

        let mut mm1 = HkrpgModuleManager::default();
        mm1.add::<Misc>();
        mm1.init()
            .expect("[hkrpg::main] failed to initialize module (Misc)");

        addr::init_rvas();

        let mut module_manager = HkrpgModuleManager::default();
        module_manager.add::<ApnPatch>();
        module_manager.add::<HkCheck>();
        module_manager.add::<Network>();
        module_manager.add::<Crypto>();
        module_manager.add::<CensorshipPatch>();
        module_manager
            .init()
            .expect("[hkrpg::main] failed to initialize modules");

        hkrpg_log("OK", "All modules initialized successfully! Ready for private server traffic.");

        thread::sleep(Duration::from_secs(u64::MAX));
    }
}
