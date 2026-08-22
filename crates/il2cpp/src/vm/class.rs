use super::{field::Il2CppField, image::Il2CppImage, method::Il2CppMethod, r#type::Il2CppType};
use crate::{api, vm::object::Il2CppObject};
use std::{borrow::Cow, ptr};

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq, PartialOrd, Ord)]
#[repr(transparent)]
pub struct Il2CppClass(pub usize);

#[allow(unused)]
impl Il2CppClass {
    #[inline]
    pub fn byval_arg(&self) -> Il2CppType {
        api::il2cpp_class_get_type(*self)
    }

    #[inline]
    pub fn get_image(&self) -> Il2CppImage {
        unsafe { Il2CppImage(*((self.0) as *const usize)) }
    }

    #[inline]
    pub fn get_namespace(&self) -> Cow<'static, str> {
        unsafe { utils::cstr_to_str(api::il2cpp_class_get_namespace(*self)) }
    }

    #[inline]
    pub fn get_array_class(&self, rank: u32) -> Il2CppClass {
        api::il2cpp_array_class_get(*self, rank)
    }

    pub fn get_fields(&self) -> Vec<Il2CppField> {
        let field_iter = ptr::null();
        let mut out: Vec<Il2CppField> = vec![];
        loop {
            unsafe {
                let field = api::il2cpp_class_get_fields(*self, &field_iter);

                if field.0 == 0 {
                    break;
                }

                out.push(field);
            }
        }
        out
    }

    pub fn get_methods(&self) -> Vec<Il2CppMethod> {
        let iter = ptr::null();
        let mut out: Vec<Il2CppMethod> = vec![];
        loop {
            unsafe {
                let method = api::il2cpp_class_get_methods(*self, &iter);

                if method.0 == 0 {
                    break;
                }

                out.push(method);
            }
        }
        out
    }
}

impl Il2CppClass {
    #[inline(always)]
    pub fn create_instance(&self) -> Il2CppObject {
        Il2CppObject::new_object(*self)
    }
}
