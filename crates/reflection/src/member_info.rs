use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::boxed_value::BoxedInt;
use il2cpp::vm::{object::Il2CppObject, r#type::Il2CppType, value::Il2CppValue};

use crate::runtime_type::RuntimeType;

#[derive(Clone, Copy, Debug, Il2CppValue)]
#[repr(transparent)]
pub struct MemberInfo(pub usize);

#[il2cpp_api("System.Reflection.MemberInfo")]
impl MemberInfo {
    #[method("get_MetadataToken", 9)]
    pub fn get_metadata_token(&self) -> Result<BoxedInt>;
}

#[il2cpp_api("System.Attribute")]
impl MemberInfo {
    #[method("GetCustomAttribute", 11, native)]
    pub fn get_custom_attribute(&self, attribute_type: RuntimeType) -> Result<Il2CppObject>;
}
