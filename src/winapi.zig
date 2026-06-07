pub const HANDLE = windows.HANDLE;
pub const HMODULE = windows.HMODULE;
pub const HINSTANCE = windows.HINSTANCE;
pub const LPVOID = windows.LPVOID;
pub const DWORD = windows.DWORD;
pub const BOOL = windows.BOOL;
pub const LARGE_INTEGER = windows.LARGE_INTEGER;

pub extern "kernel32" fn AllocConsole() callconv(.winapi) void;

pub extern "kernel32" fn LoadLibraryA(lib_file_name: [*:0]const u8) callconv(.winapi) ?windows.HMODULE;

pub extern "kernel32" fn GetModuleHandleA(module_name: [*:0]const u8) callconv(.winapi) ?windows.HMODULE;

pub extern "kernel32" fn GetProcAddress(
    module: windows.HMODULE,
    proc_name: [*:0]const u8,
) callconv(.winapi) usize;

pub extern "kernel32" fn CreateRemoteThread(
    windows.HANDLE,
    ?*anyopaque,
    windows.SIZE_T,
    usize,
    windows.LPVOID,
    windows.DWORD,
    *windows.DWORD,
) callconv(.winapi) windows.HANDLE;

pub extern "kernel32" fn VirtualAllocEx(
    windows.HANDLE,
    ?*anyopaque,
    windows.SIZE_T,
    windows.MEM.ALLOCATE,
    windows.PAGE,
) callconv(.winapi) windows.LPVOID;

pub extern "kernel32" fn VirtualFreeEx(
    windows.HANDLE,
    windows.LPVOID,
    windows.SIZE_T,
    windows.MEM.FREE,
) callconv(.winapi) windows.BOOL;

pub extern "kernel32" fn ResumeThread(*anyopaque) callconv(.winapi) void;

pub const lpfnMessageBoxA = *const fn (
    ?windows.HWND,
    ?windows.LPCSTR,
    ?windows.LPCSTR,
    windows.UINT,
) callconv(.winapi) windows.INT;

const windows = @import("std").os.windows;
