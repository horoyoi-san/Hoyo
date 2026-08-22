#![windows_subsystem = "windows"]

use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::OnceLock,
    thread,
    time::Duration,
};

use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, HINSTANCE, HWND, LPARAM};
use windows_sys::Win32::System::Environment::GetCommandLineA;
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
    SetInformationJobObject,
};
use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress, LoadLibraryW};
use windows_sys::Win32::System::Threading::{
    GetCurrentProcessId, GetStartupInfoW, STARTF_USESHOWWINDOW, STARTUPINFOW,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, ICON_BIG, ICON_SMALL, IMAGE_ICON, IsWindowVisible,
    LR_DEFAULTCOLOR, LoadImageW, SendMessageW, WM_SETICON,
};

const FRONTEND_EXE: &[u8] = include_bytes!(env!("FRONTEND_EXE_PATH"));
const APP_ICON_RESOURCE_ID: u16 = 1;
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

static FRONTEND_JOB: OnceLock<JobHandle> = OnceLock::new();

struct JobHandle(HANDLE);

unsafe impl Send for JobHandle {}
unsafe impl Sync for JobHandle {}

impl Drop for JobHandle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}

fn main() {
    version::start_in_process();

    let frontend_guard = match launch_frontend() {
        Ok(guard) => guard,
        Err(error) => {
            show_message(&format!("failed to launch hsr-frontend.exe:\n{error}"));
            None
        }
    };

    launch_unity_player(frontend_guard);
}

fn launch_frontend() -> std::io::Result<Option<TempFileGuard>> {
    if !FRONTEND_EXE.is_empty() {
        let path = frontend_path()?;
        write_frontend_if_changed(&path)?;
        spawn_frontend(&path)?;
        Ok(Some(TempFileGuard(path)))
    } else {
        let exe = std::env::current_exe()?
            .parent()
            .map(|dir| dir.join("hsr-frontend.exe"))
            .ok_or_else(|| std::io::Error::other("cannot resolve frontend directory"))?;
        spawn_frontend(&exe)?;
        Ok(None)
    }
}

fn spawn_frontend(exe: &Path) -> std::io::Result<()> {
    let child = Command::new(exe)
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()?;
    assign_frontend_to_job(child.as_raw_handle() as HANDLE)?;
    Ok(())
}

struct TempFileGuard(PathBuf);

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

fn frontend_path() -> std::io::Result<PathBuf> {
    let dir = std::env::temp_dir().join("hsr-owner-frontend");
    fs::create_dir_all(&dir)?;
    Ok(dir.join("hsr-frontend.exe"))
}

fn write_frontend_if_changed(path: &Path) -> std::io::Result<()> {
    let should_write = match fs::read(path) {
        Ok(existing) => existing != FRONTEND_EXE,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => true,
        Err(error) => return Err(error),
    };
    if should_write {
        fs::write(path, FRONTEND_EXE)?;
    }
    Ok(())
}

#[cfg(windows)]
use std::os::windows::io::AsRawHandle;

fn assign_frontend_to_job(process: HANDLE) -> std::io::Result<()> {
    if FRONTEND_JOB.get().is_none() {
        let _ = FRONTEND_JOB.set(create_kill_on_close_job()?);
    }

    let job = FRONTEND_JOB
        .get()
        .ok_or_else(|| std::io::Error::other("frontend job object is unavailable"))?;
    let ok = unsafe { AssignProcessToJobObject(job.0, process) };
    if ok == 0 {
        return Err(std::io::Error::last_os_error());
    }

    Ok(())
}

fn create_kill_on_close_job() -> std::io::Result<JobHandle> {
    let job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
    if job.is_null() {
        return Err(std::io::Error::last_os_error());
    }

    let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

    let ok = unsafe {
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const _,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        )
    };

    if ok == 0 {
        let error = std::io::Error::last_os_error();
        unsafe {
            CloseHandle(job);
        }
        return Err(error);
    }

    Ok(JobHandle(job))
}

fn launch_unity_player(frontend_guard: Option<TempFileGuard>) -> ! {
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
        Some(function) => unsafe {
            std::mem::transmute::<unsafe extern "system" fn() -> isize, FnUnityMain>(function)
        },
    };

    let exit_code =
        unsafe { unity_main(h_instance, std::ptr::null_mut(), lp_cmd_line, n_show_cmd) };
    drop(frontend_guard);
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

fn show_message(msg: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MB_ICONWARNING, MB_OK, MessageBoxW};

    let title: Vec<u16> = "HSR Owner\0".encode_utf16().collect();
    let text: Vec<u16> = msg.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONWARNING,
        );
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
