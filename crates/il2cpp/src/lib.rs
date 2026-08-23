extern crate self as il2cpp;
use crate::vm::{class::Il2CppClass, method::Il2CppMethod};
use indexmap::IndexMap;
use std::collections::HashMap;
use std::{
    borrow::Cow,
    sync::{LazyLock, Mutex, OnceLock, atomic::AtomicU32},
};
use windows::{Win32::System::LibraryLoader::GetModuleHandleW, core::w};
pub mod api;
pub mod api_table;
pub mod vm;

mod api_init;

pub use api_init::init_il2cpp;

pub static GA_BASE: LazyLock<usize> = LazyLock::new(|| unsafe {
    GetModuleHandleW(w!("GameAssembly"))
        .expect("GameAssembly not loaded yet")
        .0 as usize
});
pub static UP_BASE: LazyLock<usize> = LazyLock::new(|| unsafe {
    GetModuleHandleW(w!("UnityPlayer"))
        .expect("UnityPlayer not loaded yet")
        .0 as usize
});
pub static API_BASE_PTR: LazyLock<usize> = LazyLock::new(|| {
    if let Some(addr) = utils::scan_unity_player_section("48 8B 05 ? ? ? ? 48 8D 0D ? ? ? ? FF D0")
    {
        log::debug!("[Il2Cpp Init] found il2cpp api base at relative address: 0x{addr:X}");
        addr
    } else {
        log::debug!("[Il2Cpp Init] failed to find il2cpp api base pointer!");
        std::thread::sleep(std::time::Duration::from_millis(u64::MAX));
        0
    }
});
// Type-index bounds, filled once by `init_il2cpp` before any reader runs.
// Relaxed ordering is sufficient: initialization completes (and reader threads
// are spawned) before these are read, which establishes the happens-before.
pub static MAX_TYPEDEFINDEX: AtomicU32 = AtomicU32::new(0);
pub static RPG_NETWORK_PROTO_START: AtomicU32 = AtomicU32::new(0);
pub static RPG_NETWORK_PROTO_END: AtomicU32 = AtomicU32::new(0);
pub static ASSEMBLY_CSHARP_START: AtomicU32 = AtomicU32::new(0);
pub static FUNCTIONS_TABLE: OnceLock<IndexMap<String, Il2CppMethod>> = OnceLock::new();
pub static FUNCTIONS_TABLE_REFLECTION: OnceLock<IndexMap<String, Il2CppMethod>> = OnceLock::new();
pub static CLASS_TABLE: OnceLock<IndexMap<Cow<'static, str>, Il2CppClass>> = OnceLock::new();
pub static CLASS_TABLE_VEC: OnceLock<Vec<Il2CppClass>> = OnceLock::new();

#[macro_export]
macro_rules! native_method {
    ($vis:vis $func_name:ident, $ret_type:ty, ($($arg_name:ident: $arg_type:ty),*), $fn_sig:literal, self) => {
        #[allow(clippy::wrong_self_convention)]
        #[inline]
        $vis fn $func_name(&self, $($arg_name: $arg_type),*) -> anyhow::Result<$ret_type> {
            #[allow(clippy::macro_metavars_in_unsafe)]
            unsafe {
                let func: extern "C" fn(usize, $($arg_type),*) -> $ret_type = std::mem::transmute($crate::get_native_method($fn_sig).unwrap().va());
                let result = microseh::try_seh(|| func(self.0, $($arg_name),*));
                result.map_err(|e| anyhow::anyhow!("failed to invoke {}. {:?}", stringify!($func_name), e))
            }
        }
    };

    ($vis:vis $func_name:ident, $ret_type:ty, ($($arg_name:ident: $arg_type:ty),*), $fn_sig:literal) => {
        #[inline]
        $vis fn $func_name($($arg_name: $arg_type),*) -> anyhow::Result<$ret_type> {
            #[allow(clippy::macro_metavars_in_unsafe)]
            unsafe {
                let func: extern "C" fn($($arg_type),*) -> $ret_type = std::mem::transmute($crate::get_native_method($fn_sig).unwrap().va());
                let result = microseh::try_seh(|| func($($arg_name),*));
                result.map_err(|e| anyhow::anyhow!("failed to invoke {}. {:?}", stringify!($func_name), e))
            }
        }
    };

    // Generic
    (
        $vis:vis $func_name:ident,
        $ret_type:ty,
        < $($generic:ident : $bound:tt),+ > ($($arg_name:ident: $arg_type:ty),*),
        $fn_sig:literal,
        self
    ) => {
        #[inline]
        $vis  $func_name < $($generic : $bound),+ > (&self, $($arg_name: $arg_type),*) -> anyhow::Result<$ret_type> {
            let func: extern "fastcall" fn(usize, $($arg_type),*) -> $ret_type = std::mem::transmute($crate::get_native_method($fn_sig).unwrap().va());
            let result = microseh::try_seh(|| func(self.0, $($arg_name),*));
            Ok(result.map_err(|e| anyhow::anyhow!("failed to invoke {}. {:?}", stringify!($func_name), e))?)
        }
    };

    (runtime $vis:vis $func_name:ident, $ret_type:ty, ($($arg_name:ident: $arg_type:ty),*), $fn_sig:literal, self) => {
        #[allow(clippy::wrong_self_convention)]
        #[inline]
        $vis fn $func_name(&self, $($arg_name: $arg_type),*) -> anyhow::Result<$ret_type> {
            #[allow(clippy::macro_metavars_in_unsafe)]
            unsafe {
                let result = $crate::get_native_method($fn_sig).unwrap().invoke(Il2CppObject(self.0), &[$($arg_name),*]);
                result.map_err(|e| anyhow::anyhow!("failed to invoke {}. {:?}", stringify!($func_name), e))
            }
        }
    };
}

#[inline]
pub fn get_cached_class(name: &str) -> Option<Il2CppClass> {
    CLASS_TABLE.get().unwrap().get(name).copied()
}

pub static FIX_METHOD_INDEX_MAP: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

pub static LAST_NATIVE_SIGS: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[inline]
pub fn recent_native_sigs() -> Vec<String> {
    LAST_NATIVE_SIGS.lock().unwrap().clone()
}

#[inline]
pub fn clear_native_sigs() {
    LAST_NATIVE_SIGS.lock().unwrap().clear();
}

#[inline]
pub fn get_native_method(signature: &str) -> Option<Il2CppMethod> {
    LAST_NATIVE_SIGS.lock().unwrap().push(signature.to_string());

    let corrected = FIX_METHOD_INDEX_MAP
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .get(signature)
        .cloned();

    let lookup_sig = corrected.as_deref().unwrap_or(signature);

    FUNCTIONS_TABLE
        .get()
        .and_then(|map| map.get(lookup_sig).copied())
        .or_else(|| {
            FUNCTIONS_TABLE_REFLECTION
                .get()
                .and_then(|map| map.get(lookup_sig).copied())
        })
}

#[inline]
pub fn try_adjust_signature(signature: &str, offset: i32) -> Option<String> {
    let (prefix, trailing_digits) = split_trailing_digits(signature);
    let base_num: i32 = trailing_digits.parse().unwrap_or(0);
    let new_num = base_num + offset;
    if new_num < 0 {
        return None;
    }
    let mut new_sig = String::with_capacity(signature.len() + 4);
    new_sig.push_str(prefix);
    use std::fmt::Write;
    let width = trailing_digits.len();
    if width > 0 {
        write!(&mut new_sig, "{new_num:0width$}").ok()?;
    } else {
        write!(&mut new_sig, "{new_num}").ok()?;
    }
    Some(new_sig)
}

#[inline]
pub fn current_fix_offset(signature: &str) -> i32 {
    let map = FIX_METHOD_INDEX_MAP
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    map.get(signature)
        .and_then(|corrected| {
            let (prefix, digits) = split_trailing_digits(signature);
            let base: i32 = digits.parse().unwrap_or(0);
            let num = corrected.strip_prefix(prefix)?;
            let corrected_num: i32 = num.parse().ok()?;
            Some(corrected_num - base)
        })
        .unwrap_or(0)
}

#[inline]
pub fn insert_fix(sig: &str, new_sig: String) {
    FIX_METHOD_INDEX_MAP
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .insert(sig.to_string(), new_sig);
}

#[inline]
pub fn clear_fix_map() {
    FIX_METHOD_INDEX_MAP
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clear();
}

#[inline]
pub fn split_trailing_digits(s: &str) -> (&str, &str) {
    let bytes = s.as_bytes();
    let mut digit_end = bytes.len();
    while digit_end > 0 && bytes[digit_end - 1].is_ascii_digit() {
        digit_end -= 1;
    }
    // Scanning stopped on an ASCII digit boundary, so `digit_end` always
    // lands on a char boundary and `split_at` cannot panic.
    s.split_at(digit_end)
}

#[cfg(test)]
mod tests {
    use super::split_trailing_digits;

    #[test]
    fn splits_trailing_digits() {
        assert_eq!(split_trailing_digits("PlayerLv11"), ("PlayerLv", "11"));
        assert_eq!(split_trailing_digits("Stage"), ("Stage", ""));
        assert_eq!(split_trailing_digits("42"), ("", "42"));
        assert_eq!(split_trailing_digits(""), ("", ""));
    }

    #[test]
    fn keeps_non_ascii_tail_intact() {
        assert_eq!(split_trailing_digits("关卡3"), ("关卡", "3"));
    }
}
