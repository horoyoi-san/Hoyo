use std::time::{Duration, Instant};
use windows::{
    Win32::{
        Foundation::HINSTANCE,
        System::{LibraryLoader::GetModuleHandleW, SystemServices::DLL_PROCESS_ATTACH},
    },
    core::w,
};

mod apc_thread;
mod csharp;
mod ipc;
mod logging;
mod parser_data;
mod proto;
mod res;
mod runtime;
mod script;
mod script_v2;
mod version;
mod xluau;

pub fn start_in_process() {
    std::thread::spawn(|| thread_entry(false));
}

fn run_backend(launch_frontend: bool) {
    unsafe {
        let log_rx = logging::init();
        ipc::start_log_stream(log_rx);
        if launch_frontend {
            ipc::frontend::launch();
        }

        let base;

        loop {
            if let (Ok(module), Ok(module_up)) = (
                GetModuleHandleW(w!("GameAssembly.dll")),
                GetModuleHandleW(w!("UnityPlayer.dll")),
            ) {
                base = module.0 as usize;
                log::debug!("GameAssembly.dll: 0x{base:X}");
                log::debug!("UnityPlayer.dll: 0x{:X}", module_up.0 as usize);
                break;
            }
            std::thread::sleep(Duration::from_millis(100));
        }

        if let Err(e) = utils::patch_memory_pool() {
            log::warn!("Failed to patch memory pool: {e}");
        }

        log::debug!("Sleeping for 4 seconds");
        std::thread::sleep(Duration::from_secs(4));
        log::debug!("Base: 0x{base:X}");

        ipc::actions::ensure_dump_folder().unwrap();

        let start = Instant::now();

        runtime::init_default();
        apc_thread::init_apc_thread();
        let _ = xluau::xlua::init();
        sniffer::hook();
        ipc::start_packet_stream();
        ipc::start_server();

        log::debug!("dump done in {} seconds", start.elapsed().as_secs());

        std::thread::sleep(Duration::from_secs(u64::MAX));
    }
}

fn thread_entry(launch_frontend: bool) {
    unsafe {
        std::env::set_var("GC_IGNORE_GCJ_INFO", "1");
        std::env::set_var("GC_DONT_GC", "1");
    }

    run_backend(launch_frontend);
}

unsafe extern "system" fn dumper_thread(_: *mut std::ffi::c_void) -> u32 {
    thread_entry(true);
    0
}

#[unsafe(no_mangle)]
unsafe extern "system" fn DllMain(instance: HINSTANCE, call_reason: u32, _: *mut ()) -> bool {
    if call_reason == DLL_PROCESS_ATTACH {
        ipc::frontend::remember_dll_dir(instance);

        let skip = std::env::current_exe()
            .ok()
            .as_ref()
            .and_then(|p| p.file_name())
            .is_some_and(|n| {
                let name = n.to_string_lossy().to_ascii_lowercase();
                name == "unitycrashhandler64.exe" || name == "hsr-frontend.exe"
            });

        if skip {
            return true;
        }

        use windows::Win32::System::Threading::{CreateThread, THREAD_CREATION_FLAGS};
        unsafe {
            let _ = CreateThread(
                None,
                0,
                Some(dumper_thread),
                None,
                THREAD_CREATION_FLAGS(0),
                None,
            );
        }
    }

    true
}
