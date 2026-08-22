use super::{object::Il2CppObject, r#type::Il2CppType, value::Il2CppValue};
use dahlah_derive::il2cpp_api;
use std::{borrow::Cow, ffi::CString};

#[derive(Clone, Copy, dahlah_derive::Il2CppValue)]
#[repr(transparent)]
pub struct Il2CppString(pub usize);

#[il2cpp_api("System.Runtime.InteropServices.Marshal")]
impl Il2CppString {
    #[method("PtrToStringAnsi", 24, native)]
    pub fn ptr_to_string(str: usize) -> anyhow::Result<Il2CppString>;
}

impl Il2CppString {
    #[inline]
    pub fn as_str(&self) -> Cow<'static, str> {
        unsafe {
            let str_length = *(self.0.wrapping_add(16) as *const u32);
            let str_ptr = self.0.wrapping_add(20) as *const u16;
            let slice = std::slice::from_raw_parts(str_ptr, str_length as usize);
            String::from_utf16(slice).unwrap().into()
        }
    }
}

impl From<&str> for Il2CppString {
    #[inline]
    fn from(value: &str) -> Self {
        let cs = CString::new(value).unwrap();
        Self::ptr_to_string(cs.as_c_str().to_bytes_with_nul().as_ptr() as usize).unwrap()
    }
}

impl From<String> for Il2CppString {
    #[inline]
    fn from(value: String) -> Self {
        let cs = CString::new(value).unwrap();
        Self::ptr_to_string(cs.as_c_str().to_bytes_with_nul().as_ptr() as usize).unwrap()
    }
}
