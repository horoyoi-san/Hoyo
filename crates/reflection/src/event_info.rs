use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray, object::Il2CppObject, string::Il2CppString, r#type::Il2CppType,
    value::Il2CppValue,
};

use crate::{member_info::MemberInfo, method_info::MethodInfo};

#[derive(Clone, Copy, Debug, Il2CppValue)]
#[repr(transparent)]
pub struct EventInfo(pub usize);

#[il2cpp_api("System.Reflection.MonoEvent")]
impl EventInfo {
    #[method("get_Name", 6)]
    pub fn get_name(&self) -> Result<Il2CppString>;

    #[method("GetAddMethod", 1)]
    pub fn get_add_method(&self, non_public: bool) -> Result<MethodInfo>;

    #[method("GetRaiseMethod", 2)]
    pub fn get_raise_method(&self, non_public: bool) -> Result<MethodInfo>;

    #[method("GetRemoveMethod", 3)]
    pub fn get_remove_method(&self, non_public: bool) -> Result<MethodInfo>;

    #[method("GetCustomAttributes", 9, native)]
    fn get_custom_attributes_internal(&self, inherit: bool) -> Result<Il2CppArray>;
}

#[allow(unused)]
impl EventInfo {
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
