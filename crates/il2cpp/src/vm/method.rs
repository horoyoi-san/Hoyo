use crate::api;

use super::{
    class::Il2CppClass, exception::Il2CppException, object::Il2CppObject, value::Il2CppValue,
};
use std::{borrow::Cow, sync::OnceLock};

#[derive(Debug, Clone, Copy)]
#[repr(transparent)]
pub struct Il2CppMethod(pub usize);

impl Il2CppMethod {
    fn get_class_va_offset_pair(&self) -> (usize, usize) {
        unsafe {
            static CACHE: OnceLock<(usize, usize)> = OnceLock::new();
            let &(class, va) = CACHE.get_or_init(|| {
                let ptr = *(self.0 as *const usize);
                let possible_rva = ptr.wrapping_sub(*crate::GA_BASE);

                // RVA gonna be small for sure
                let possibilities = if possible_rva < *crate::GA_BASE || ptr == 0 {
                    (8, 0)
                } else {
                    (0, 8)
                };

                println!("va magic: {}", possibilities.1);

                possibilities
            });

            (class, va)
        }
    }

    #[inline]
    pub fn class(&self) -> Il2CppClass {
        api::il2cpp_method_get_class(*self)
    }

    #[inline]
    pub fn va(&self) -> usize {
        let (_, va) = self.get_class_va_offset_pair();
        unsafe { *((self.0 + va) as *const usize) }
    }

    #[inline]
    pub fn rva(&self) -> usize {
        let va = self.va();
        if va == 0 {
            return 0;
        }
        self.va() - *crate::GA_BASE
    }

    #[inline]
    pub fn get_name(&self) -> Cow<'static, str> {
        unsafe { utils::cstr_to_str(api::il2cpp_method_get_name(*self)) }
    }

    pub fn invoke<T: From<usize>>(
        &self,
        instance: Il2CppObject,
        args: &[&dyn Il2CppValue],
    ) -> Result<T, Il2CppException> {
        let args = args.iter().map(|arg| arg.as_raw()).collect::<Vec<_>>();

        let mut exception = 0;
        let ret = api::il2cpp_runtime_invoke(*self, instance, args.as_ptr(), &mut exception);

        (exception == 0)
            .then_some(T::from(ret))
            .ok_or(Il2CppException(exception))
    }

    /// every args' item is a pointer (if it's a ValueType, pointer to the ValueType, otherwise just Il2CppObject pointer)
    pub fn invoke2<T: From<usize>>(
        &self,
        instance: Il2CppObject,
        args: Vec<usize>,
    ) -> Result<T, Il2CppException> {
        let mut exception = 0;
        let ret = api::il2cpp_runtime_invoke(*self, instance, args.as_ptr(), &mut exception);

        (exception == 0)
            .then_some(T::from(ret))
            .ok_or(Il2CppException(exception))
    }
}

impl Il2CppMethod {
    pub fn signature(&self, index_in_class: usize) -> String {
        let name: Cow<'static, str> = self.get_name();
        format!("{}{}", name.as_ref(), index_in_class)
    }
}

impl Il2CppValue for Il2CppMethod {
    fn as_raw(&self) -> usize {
        #[derive(Debug, Clone, Copy)]
        #[repr(C)]
        struct RuntimeMethodInfo {
            pub pointer: usize,
        }
        let boxed = Box::new(RuntimeMethodInfo { pointer: self.0 });
        let ptr = Box::into_raw(boxed);
        ptr as usize
    }
}
