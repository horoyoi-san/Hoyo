use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray, boxed_value::BoxedBool, object::Il2CppObject, string::Il2CppString,
    r#type::Il2CppType, value::Il2CppValue,
};

use crate::runtime_type::RuntimeType;

#[derive(Debug, Clone, Copy, Il2CppValue)]
#[repr(transparent)]
pub struct RuntimeParameterInfo(pub usize);

#[il2cpp_api("System.Reflection.ParameterInfo")]
impl RuntimeParameterInfo {
    #[method("get_ParameterType", 3)]
    pub fn get_parameter_type(&self) -> Result<RuntimeType>;

    #[method("get_IsOut", 7)]
    pub fn get_is_out(&self) -> Result<BoxedBool>;

    #[method("get_Name", 10)]
    pub fn get_name(&self) -> Result<Il2CppString>;

    #[method("GetCustomAttributes", 16, native)]
    pub fn get_custom_attributes_internal(&self, inherit: bool) -> Result<Il2CppArray>;
}

#[allow(unused)]
impl RuntimeParameterInfo {
    pub fn format_to_csharp(&self) -> String {
        let para_type = self.get_parameter_type().unwrap();
        let para_name = self.get_name().unwrap().as_str();
        let modifier = if self.get_is_out().unwrap().unbox() {
            "out "
        } else if para_type.get_isbyref().unwrap().unbox() {
            "ref "
        } else {
            ""
        };
        let para_type = para_type.format_type_name(true);
        let default_value = "";

        // let default_value = self.get_default_value();
        // let default_value = if let Ok(default_value) = default_value {
        //     &format!(" = {}", serialized.to_string())
        // } else {
        //     ""
        // };

        format!("{modifier}{para_type} {para_name}{default_value}")
    }
}
