use anyhow::Result;

use crate::vm::{object::Il2CppObject, r#type::Il2CppType};

pub trait Il2CppValue {
    fn as_raw(&self) -> usize;

    fn is_null(&self) -> bool {
        unimplemented!()
    }

    fn as_il2cpp_object(&self) -> Il2CppObject {
        unimplemented!()
    }

    fn get_type(&self) -> Result<Il2CppType> {
        unimplemented!()
    }
}

#[derive(Debug)]
pub struct Void;

impl Il2CppValue for Void {
    fn as_raw(&self) -> usize {
        0
    }
}

impl From<usize> for Void {
    fn from(_: usize) -> Self {
        Self
    }
}

macro_rules! impl_primitive {
    ($($t:ty),*) => {
        $(
            impl Il2CppValue for $t {
                fn as_raw(&self) -> usize {
                    self as *const $t as usize
                }
            }
        )*
    };
}

impl_primitive!(i8, u8, i16, u16, i32, u32, i64, u64, f32, f64, bool, char, usize, isize);
