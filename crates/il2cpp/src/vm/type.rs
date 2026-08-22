use crate::vm::value::Il2CppValue;
use crate::{api, vm::class::Il2CppClass};
use std::borrow::Cow;

#[repr(u32)]
pub enum Il2CppTypeNameFormat {
    IL = 0,
    Reflection = 1,
    FullName = 2,
    AssemblyQualified = 3,
}

#[repr(transparent)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Il2CppType(pub usize);

#[allow(unused)]
impl Il2CppType {
    #[inline]
    pub fn get_class(&self) -> Il2CppClass {
        api::il2cpp_class_from_type(*self)
    }

    #[inline]
    pub fn full_name(&self) -> Cow<'static, str> {
        self.get_name(Il2CppTypeNameFormat::FullName)
    }

    #[inline]
    pub fn il_name(&self) -> Cow<'static, str> {
        self.get_name(Il2CppTypeNameFormat::IL)
    }

    #[inline]
    /// TODO: Not actually using the formatting
    pub fn get_name(&self, format: Il2CppTypeNameFormat) -> Cow<'static, str> {
        unsafe { utils::cstr_to_str(api::il2cpp_type_get_name(*self)) }
    }
}

impl Il2CppValue for Il2CppType {
    fn is_null(&self) -> bool {
        self.0 == 0
    }

    fn as_raw(&self) -> usize {
        #[derive(Debug, Clone, Copy)]
        #[repr(C)]
        struct RuntimeTypeHandle {
            pub pointer: usize,
        }
        let boxed = Box::new(RuntimeTypeHandle { pointer: self.0 });
        let ptr = Box::into_raw(boxed);
        ptr as usize
    }
}
