use std::{borrow::Cow, ffi::CStr};

pub mod interceptor;
pub mod mem_guard;
pub mod patch;
pub mod scanner;

pub use interceptor::Interceptor;
pub use mem_guard::disable_memprotect_guard;
pub use patch::{hook_unity_player, patch_memory_pool, patch_sign};
pub use scanner::{game_assembly_slice, scan_ga_section, scan_unity_player_section};

/// # SAFETY
#[inline]
pub unsafe fn cstr_to_str(ptr: *const i8) -> Cow<'static, str> {
    unsafe { Cow::Borrowed(CStr::from_ptr(ptr).to_str().unwrap_unchecked()) }
}
