#![windows_subsystem = "windows"]

use std::{
    thread,
    time::Duration,
};

use windows_sys::Win32::Foundation::{HINSTANCE, HWND, LPARAM};
use windows_sys::Win32::System::Environment::GetCommandLineA;
use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress, LoadLibraryW};
use windows_sys::Win32::System::Threading::{
    GetCurrentProcessId, GetStartupInfoW, STARTF_USESHOWWINDOW, STARTUPINFOW,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, ICON_BIG, ICON_SMALL, IMAGE_ICON, IsWindowVisible,
    LR_DEFAULTCOLOR, LoadImageW, SendMessageW, WM_SETICON,
};

const APP_ICON_RESOURCE_ID: u16 = 1;
// Exported GPU driver hints: NVIDIA Optimus / AMD PowerXpress pick the
// discrete GPU for this process when these symbols are present in the EXE.
#[unsafe(no_mangle)]
#[used]
pub static NvOptimusEnablement: u32 = 1;
#[unsafe(no_mangle)]
#[used]
pub static AmdPowerXpressRequestHighPerformance: u32 = 1;

type FnUnityMain = unsafe extern "system" fn(
    h_instance: HINSTANCE,
    h_prev_instance: HINSTANCE,
    lp_cmd_line: *mut u8,
    n_show_cmd: i32,
) -> i32;

fn main() {
    version::start_in_process();
    launch_unity_player();
}

fn launch_unity_player() -> ! {
    start_taskbar_icon_patcher();

    let h_instance = unsafe { GetModuleHandleW(std::ptr::null()) } as HINSTANCE;

    let n_show_cmd: i32 = unsafe {
        let mut startup_info: STARTUPINFOW = std::mem::zeroed();
        startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        GetStartupInfoW(&mut startup_info);
        if startup_info.dwFlags & STARTF_USESHOWWINDOW != 0 {
            startup_info.wShowWindow as i32
        } else {
            1
        }
    };

    let lp_cmd_line = unsafe {
        let full = GetCommandLineA() as *mut u8;
        skip_exe_token(full)
    };

    let dll_name: Vec<u16> = "UnityPlayer.dll\0".encode_utf16().collect();
    let hmodule = unsafe { LoadLibraryW(dll_name.as_ptr()) };
    if hmodule.is_null() {
        fatal("UnityPlayer.dll not found next to StarRail.exe.");
    }

    let proc_name = b"UnityMain\0";
    let fn_ptr = unsafe { GetProcAddress(hmodule, proc_name.as_ptr()) };
    let unity_main: FnUnityMain = match fn_ptr {
        None => fatal("UnityMain not found in UnityPlayer.dll."),
        // SAFETY: `UnityMain` has the documented Unity player entry signature
        // (HINSTANCE, HINSTANCE, LPSTR, int); transmuting the far-proc pointer
        // to that exact signature keeps the ABI identical.
        Some(function) => unsafe {
            std::mem::transmute::<unsafe extern "system" fn() -> isize, FnUnityMain>(function)
        },
    };

    let exit_code =
        unsafe { unity_main(h_instance, std::ptr::null_mut(), lp_cmd_line, n_show_cmd) };
    std::process::exit(exit_code);
}

fn start_taskbar_icon_patcher() {
    thread::spawn(|| {
        for _ in 0..100 {
            set_current_process_window_icons();
            thread::sleep(Duration::from_millis(100));
        }
    });
}

fn set_current_process_window_icons() {
    unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> i32 {
        let target_pid = lparam as u32;
        let mut window_pid = 0;
        unsafe {
            GetWindowThreadProcessId(hwnd, &mut window_pid);
            if window_pid == target_pid && IsWindowVisible(hwnd) != 0 {
                set_window_icon(hwnd);
            }
        }
        1
    }

    let pid = unsafe { GetCurrentProcessId() };
    unsafe {
        EnumWindows(Some(enum_windows_proc), pid as LPARAM);
    }
}

unsafe fn set_window_icon(hwnd: HWND) {
    let h_instance = unsafe { GetModuleHandleW(std::ptr::null()) } as HINSTANCE;
    let icon_name = APP_ICON_RESOURCE_ID as usize as *const u16;

    let big_icon =
        unsafe { LoadImageW(h_instance, icon_name, IMAGE_ICON, 256, 256, LR_DEFAULTCOLOR) };
    let small_icon =
        unsafe { LoadImageW(h_instance, icon_name, IMAGE_ICON, 32, 32, LR_DEFAULTCOLOR) };

    if !big_icon.is_null() {
        unsafe {
            SendMessageW(hwnd, WM_SETICON, ICON_BIG as usize, big_icon as isize);
        }
    }

    if !small_icon.is_null() {
        unsafe {
            SendMessageW(hwnd, WM_SETICON, ICON_SMALL as usize, small_icon as isize);
        }
    }
}

fn fatal(msg: &str) -> ! {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MB_ICONERROR, MB_OK, MessageBoxW};

    let title: Vec<u16> = "StarRail Launcher\0".encode_utf16().collect();
    let text: Vec<u16> = msg.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
    std::process::exit(1);
}

unsafe fn skip_exe_token(cmdline: *mut u8) -> *mut u8 {
    if cmdline.is_null() {
        static EMPTY: u8 = 0;
        return &EMPTY as *const u8 as *mut u8;
    }

    let mut p = cmdline;

    unsafe {
        if *p == b'"' {
            p = p.add(1);
            while *p != 0 && *p != b'"' {
                p = p.add(1);
            }
            if *p == b'"' {
                p = p.add(1);
            }
        } else {
            while *p != 0 && *p != b' ' && *p != b'\t' {
                p = p.add(1);
            }
        }

        while *p == b' ' || *p == b'\t' {
            p = p.add(1);
        }
    }

    p
}
