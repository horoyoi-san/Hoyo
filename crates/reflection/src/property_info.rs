use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray, boxed_value::BoxedBool, object::Il2CppObject, string::Il2CppString,
    r#type::Il2CppType, value::Il2CppValue,
};

use crate::{member_info::MemberInfo, method_info::MethodInfo, runtime_type::RuntimeType};

#[derive(Clone, Copy, Debug, Il2CppValue)]
#[repr(transparent)]
pub struct PropertyInfo(pub usize);

#[il2cpp_api("System.Reflection.MonoProperty")]
impl PropertyInfo {
    #[method("get_CanRead", 3)]
    pub fn get_can_read(&self) -> Result<BoxedBool>;

    #[method("get_PropertyType", 5)]
    pub fn get_property_type(&self) -> Result<RuntimeType>;

    #[method("get_Name", 8)]
    pub fn get_name(&self) -> Result<Il2CppString>;

    #[method("GetGetMethod", 10)]
    pub fn get_get_method(&self, non_public: bool) -> Result<MethodInfo>;

    #[method("GetSetMethod", 12)]
    pub fn get_set_method(&self, non_public: bool) -> Result<MethodInfo>;

    #[method("GetCustomAttributes", 16, native)]
    fn get_custom_attributes_internal(&self, inherit: bool) -> Result<Il2CppArray>;
}

#[il2cpp_api("System.Reflection.PropertyInfo")]
impl PropertyInfo {
    #[method("GetValue", 15)]
    pub fn get_value(&self, obj: Il2CppObject) -> Result<Il2CppObject>;
}

#[allow(unused)]
impl PropertyInfo {
    #[inline]
    pub fn get_custom_attributes(&self) -> Vec<Il2CppObject> {
        unsafe {
            self.get_custom_attributes_internal(true)
                .map(il2cpp::api::Il2CppArray::to_vec)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_metadata_token(&self) -> i32 {
        unsafe { MemberInfo(self.0).get_metadata_token().unwrap().unbox() }
    }
}
