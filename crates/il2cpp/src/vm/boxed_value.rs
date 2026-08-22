use crate::vm::{object::Il2CppObject, r#type::Il2CppType, value::Il2CppValue};

macro_rules! impl_primitive {
    (
        $(
            ($type:ty, $name:ident)
        ),* $(,)?
    ) => {
        $(
            paste::paste! {
                #[derive(Clone, Copy, Debug)]
                #[repr(transparent)]
                pub struct [<Boxed $name>](pub usize);

                impl [<Boxed $name>] {
                    pub fn unbox(&self) -> $type {
                        self.as_il2cpp_object().unbox::<$type>()
                    }
                }

                impl Il2CppValue for [<Boxed $name>] {
                    fn get_type(&self) -> anyhow::Result<Il2CppType> {
                        if self.is_null() {
                            return Err(anyhow::anyhow!("object reference not set to an instance of an object"));
                        }
                        Ok(self.as_il2cpp_object().get_class().byval_arg())
                    }

                    fn is_null(&self) -> bool {
                        self.0 == 0
                    }

                    fn as_il2cpp_object(&self) -> Il2CppObject {
                        Il2CppObject(self.0)
                    }

                    fn as_raw(&self) -> usize {
                        self.0 + 16
                    }
                }

                impl From<usize> for [<Boxed $name>] {
                    fn from(ptr: usize) -> Self {
                        Self(ptr)
                    }
                }
            }
        )*
    };
}

impl_primitive! {
    (bool, Bool),
    (char, Char),
    (u8, Byte),
    (i8, SByte),
    (i16, Short),
    (u16, UShort),
    (i32, Int),
    (u32, UInt),
    (i64, Long),
    (u64, ULong),
    (f32, Float),
    (f64, Double),
    (isize, IntPtr),
    (usize, UIntPtr),
}

#[derive(Clone, Copy, Debug)]
pub struct BoxedValue<T: Copy>(pub usize, std::marker::PhantomData<T>);

impl<T: Copy> BoxedValue<T> {
    pub fn unbox(&self) -> T {
        self.as_il2cpp_object().unbox::<T>()
    }
}

impl<T: Copy> Il2CppValue for BoxedValue<T> {
    fn get_type(&self) -> anyhow::Result<Il2CppType> {
        if self.is_null() {
            return Err(anyhow::anyhow!(
                "object reference not set to an instance of an object"
            ));
        }
        Ok(self.as_il2cpp_object().get_class().byval_arg())
    }

    fn is_null(&self) -> bool {
        self.0 == 0
    }

    fn as_il2cpp_object(&self) -> Il2CppObject {
        Il2CppObject(self.0)
    }

    fn as_raw(&self) -> usize {
        self.0 + 16
    }
}

impl<T: Copy> From<usize> for BoxedValue<T> {
    fn from(ptr: usize) -> Self {
        Self(ptr, std::marker::PhantomData)
    }
}
