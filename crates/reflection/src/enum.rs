use dahlah_derive::il2cpp_api;
use il2cpp::vm::{object::Il2CppObject, string::Il2CppString};

use crate::runtime_type::RuntimeType;

#[repr(transparent)]
pub struct Enum(pub usize);

#[il2cpp_api("System.Enum")]
impl Enum {
    #[method("GetUnderlyingType", 16)]
    pub fn get_underlying_type(ty: RuntimeType) -> Result<RuntimeType>;

    #[method("GetName", 19)]
    pub fn get_name(enum_type: RuntimeType, object: Il2CppObject) -> Result<Il2CppString>;
}
