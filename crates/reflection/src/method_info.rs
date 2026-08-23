use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray,
    boxed_value::{BoxedBool, BoxedValue},
    method::Il2CppMethod,
    object::Il2CppObject,
    string::Il2CppString,
    r#type::Il2CppType,
    value::Il2CppValue,
};

use crate::{
    attributes::MethodAttributes, member_info::MemberInfo, parameter_info::RuntimeParameterInfo,
    runtime_type::RuntimeType,
};

#[derive(Clone, Copy, Debug, Il2CppValue, PartialEq, Eq, Hash)]
#[repr(transparent)]
pub struct MethodInfo(pub usize);

#[il2cpp_api("System.Reflection.MonoMethod")]
impl MethodInfo {
    #[method("get_ReturnType", 6)]
    pub fn get_return_type(&self) -> Result<RuntimeType>;

    #[method("GetParameters", 9)]
    fn get_parameters_internal(&self) -> Result<Il2CppArray>;

    #[method("get_Attributes", 16)]
    pub fn get_attributes(&self) -> Result<BoxedValue<MethodAttributes>>;

    #[method("get_DeclaringType", 19)]
    pub fn get_declaring_type(&self) -> Result<RuntimeType>;

    #[method("get_Name", 20)]
    pub fn get_name(&self) -> Result<Il2CppString>;

    #[method("GetCustomAttributes", 22, native)]
    fn get_custom_attributes_internal(&self, inherit: bool) -> Result<Il2CppArray>;

    #[method("GetGenericArguments", 28)]
    fn get_generic_arguments_internal(&self) -> Result<Il2CppArray>;

    #[method("GetGenericMethodDefinition_impl", 29)]
    pub fn get_generic_method_definition_impl(&self) -> Result<MethodInfo>;

    #[method("get_IsGenericMethod", 32)]
    pub fn get_is_generic_method(&self) -> Result<BoxedBool>;
}

#[il2cpp_api("System.Reflection.MethodBase")]
impl MethodInfo {
    #[method("GetMethodFromHandleNoGenericCheck", 33)]
    pub fn from_handle(handle: Il2CppMethod) -> Result<Self>;

    #[method("GetMethodFromHandleInternalType_native", 38)]
    pub fn from_handle_internal_type_native(
        handle: Il2CppMethod,
        r#type: Il2CppType,
        check_generic: bool,
    ) -> Result<Self>;
}

#[allow(unused)]
impl MethodInfo {
    #[inline]
    pub fn get_generic_arguments(&self) -> Vec<RuntimeType> {
        unsafe {
            self.get_generic_arguments_internal()
                .map(il2cpp::api::Il2CppArray::to_vec::<RuntimeType>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_custom_attributes(&self) -> Vec<Il2CppObject> {
        self.get_custom_attributes_internal(true)
            .map(il2cpp::api::Il2CppArray::to_vec)
            .unwrap_or_default()
    }

    #[inline]
    pub fn get_parameters(&self) -> Vec<RuntimeParameterInfo> {
        unsafe {
            self.get_parameters_internal()
                .map(il2cpp::api::Il2CppArray::to_vec::<RuntimeParameterInfo>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_il2cpp_method(&self) -> Il2CppMethod {
        unsafe { Il2CppMethod(*((self.0 + 0x10) as *const usize)) }
    }

    #[inline]
    pub fn get_metadata_token(&self) -> i32 {
        unsafe { MemberInfo(self.0).get_metadata_token().unwrap().unbox() }
    }
}

impl MethodInfo {
    pub fn signature(&self) -> String {
        use std::fmt::Write;
        let params = self.get_parameters();
        let name = self.get_name().unwrap().as_str();
        let mut out = String::new();

        let _ = write!(out, "{name}(");
        for (param_index, param) in params.iter().enumerate() {
            let _ = write!(out, "{}", param.get_parameter_type().unwrap().il_name());
            if param_index + 1 < params.len() {
                let _ = write!(out, ",");
            }
        }
        let _ = write!(out, ")");
        out
    }

    pub fn is_static(&self) -> bool {
        self.get_attributes()
            .unwrap()
            .unbox()
            .contains(MethodAttributes::Static)
    }
}
