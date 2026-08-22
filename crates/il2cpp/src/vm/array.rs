use core::slice;
use std::ops::Add as _;

use dahlah_derive::Il2CppValue;

use crate::{
    api,
    vm::{object::Il2CppObject, r#type::Il2CppType, value::Il2CppValue},
};

use super::class::Il2CppClass;

#[derive(Debug, Clone, Copy, Il2CppValue)]
#[repr(transparent)]
pub struct Il2CppArray(pub usize);

impl Il2CppArray {
    #[inline]
    fn new_specific(array_class: Il2CppClass, size: usize) -> Il2CppArray {
        api::il2cpp_array_new_specific(array_class, size)
    }

    #[inline]
    pub fn new(array_class: Il2CppClass, len: usize) -> Self {
        Self::new_specific(array_class, len)
    }

    #[inline]
    pub fn class(&self) -> Il2CppClass {
        unsafe { Il2CppClass(*(self.0 as *const usize)) }
    }

    #[inline]
    pub fn monitor(&self) -> usize {
        unsafe { *((self.0 + 8) as *const usize) }
    }

    #[inline]
    pub fn bounds(&self) -> usize {
        unsafe { *((self.0 + 16) as *const usize) }
    }

    #[inline]
    pub fn len(&self) -> usize {
        unsafe { *((self.0 + 24) as *const usize) }
    }

    #[inline]
    pub fn first_item_ptr(&self) -> usize {
        self.0 + 32
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    #[inline]
    pub fn get<T>(&self, i: usize) -> &T {
        let size = std::mem::size_of::<T>();
        unsafe { &*((self.first_item_ptr().add(i * size)) as *const T) }
    }

    #[inline]
    pub fn get_mut<T>(&mut self, i: usize) -> &mut T {
        let size = std::mem::size_of::<T>();
        unsafe { &mut *((self.first_item_ptr().add(i * size)) as *mut T) }
    }

    #[inline]
    pub fn to_vec<T: Clone>(self) -> Vec<T> {
        unsafe { slice::from_raw_parts(self.first_item_ptr() as *const T, self.len()).to_vec() }
    }

    pub fn as_mut_slice<T>(&mut self) -> &mut [T] {
        unsafe {
            std::slice::from_raw_parts_mut(
                std::mem::transmute::<*const u8, *mut T>(self.first_item_ptr() as *const u8),
                self.len(),
            )
        }
    }
}
