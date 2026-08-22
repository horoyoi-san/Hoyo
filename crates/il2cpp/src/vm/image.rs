use std::borrow::Cow;

use crate::api;

#[derive(Clone, Copy)]
#[repr(transparent)]
pub struct Il2CppImage(pub usize);

#[allow(unused)]
impl Il2CppImage {
    #[inline]
    pub fn get_name(&self) -> Cow<'static, str> {
        unsafe { utils::cstr_to_str(api::il2cpp_image_get_name(*self)) }
    }

    #[inline]
    pub fn get_count(&self) -> u32 {
        api::il2cpp_image_get_class_count(*self) as u32
    }
}
