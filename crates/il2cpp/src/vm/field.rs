use crate::{api, vm::value::Il2CppValue};

#[derive(Debug, Clone, Copy)]
#[repr(transparent)]
pub struct Il2CppField(pub usize);

#[allow(unused)]
impl Il2CppField {
    #[inline]
    pub fn offset(&self) -> usize {
        api::il2cpp_field_get_offset(*self)
    }
}

impl Il2CppValue for Il2CppField {
    fn as_raw(&self) -> usize {
        #[derive(Debug, Clone, Copy)]
        #[repr(C)]
        struct RuntimeFieldInfo {
            pub pointer: usize,
        }
        let boxed = Box::new(RuntimeFieldInfo { pointer: self.0 });
        let ptr = Box::into_raw(boxed);
        ptr as usize
    }
}
