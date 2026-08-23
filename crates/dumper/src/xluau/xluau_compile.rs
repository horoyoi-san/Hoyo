use std::sync::OnceLock;
use utils::scanner::scan_by_pattern;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;

type LuauCompile = unsafe extern "system" fn(
    source: *const std::ffi::c_char,
    size: usize,
    options: *const std::ffi::c_void,
    outsize: *mut usize,
) -> *const std::ffi::c_char;

static LUAU_COMPILE_ADDR: OnceLock<usize> = OnceLock::new();

pub unsafe fn compile(script: String) -> &'static [u8] {
    let addr = get_luau_compile();
    if addr == 0 {
        return &[];
    }
    let luau_compile: LuauCompile = unsafe { std::mem::transmute(addr) };
    let mut bytecode_size = 0;
    let bytecode = unsafe {
        luau_compile(
            script.as_bytes().as_ptr() as *const i8,
            script.len(),
            std::ptr::null(),
            &mut bytecode_size,
        )
    };
    if bytecode.is_null() || bytecode_size == 0 {
        return &[];
    }
    unsafe { std::slice::from_raw_parts(bytecode as *const u8, bytecode_size) }
}

fn xluau_base() -> usize {
    static BASE: OnceLock<usize> = OnceLock::new();
    *BASE.get_or_init(|| {
        unsafe { GetModuleHandleW(windows::core::w!("xluau.dll")) }
            .map_or(0, |h| h.0 as usize)
    })
}

fn get_luau_compile() -> usize {
    *LUAU_COMPILE_ADDR.get_or_init(|| {
        let rva = scan_by_pattern("E8 ? ? ? ? 4C 8B 8C 24 ? ? ? ? 4C 8B C0").unwrap_or(0);
        if rva == 0 {
            return 0;
        }
        xluau_base() + rva
    })
}
