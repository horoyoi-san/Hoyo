use std::{borrow::Cow, ffi::CStr};

pub mod hdiff;
pub mod interceptor;
pub mod lang_patcher;
pub mod mem_guard;
pub mod patch;
pub mod scanner;

pub use hdiff::{HDiffPatcher, HDiffResult};
pub use interceptor::Interceptor;
pub use lang_patcher::{GameLanguageState, LanguageInfo, LanguagePatchResult, StarRailLangPatcher};
pub use mem_guard::disable_memprotect_guard;
pub use patch::patch_memory_pool;
pub use scanner::{game_assembly_slice, scan_ga_section, scan_unity_player_section};

/// # SAFETY
#[inline]
pub unsafe fn cstr_to_str(ptr: *const i8) -> Cow<'static, str> {
    unsafe { Cow::Borrowed(CStr::from_ptr(ptr).to_str().unwrap_unchecked()) }
}
