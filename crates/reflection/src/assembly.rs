use std::borrow::Cow;

use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray, object::Il2CppObject, string::Il2CppString, r#type::Il2CppType,
    value::Il2CppValue,
};

use crate::runtime_type::RuntimeType;

#[derive(Debug, Clone, Copy, Il2CppValue)]
#[repr(transparent)]
pub struct Assembly(pub usize);

#[il2cpp_api("System.AppDomain")]
impl Assembly {
    #[method("GetAssemblies", 5)]
    fn get_assemblies_internal() -> Result<Il2CppArray>;
}

#[il2cpp_api("System.Reflection.Assembly")]
impl Assembly {
    #[method("GetTypes", 22)]
    fn get_types_internal(&self) -> Result<Il2CppArray>;

    #[method("get_FullName", 7)]
    pub fn get_full_name(&self) -> Result<Il2CppString>;

    #[method("GetName", 29)]
    pub fn get_assembly_name(&self) -> Result<usize>;
}

#[inline]
pub fn get_assemblies() -> Vec<Assembly> {
    Assembly::get_assemblies_internal().unwrap().to_vec::<Assembly>()
}

impl Assembly {
    #[inline]
    pub fn get_types(&self) -> Vec<RuntimeType> {
        self.get_types_internal().unwrap().to_vec()
    }

    #[inline]
    pub fn get_name(&self) -> Cow<'static, str> {
        unsafe {
            let ptr = self.get_assembly_name().unwrap();
            if ptr != 0 {
                return (*((ptr + 0x10) as *const Il2CppString)).as_str();
            }
        }
        Default::default()
    }
}
