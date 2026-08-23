use std::fmt::{Debug, Write};

use crate::vm::{
    object::Il2CppObject, string::Il2CppString, r#type::Il2CppType, value::Il2CppValue,
};
use dahlah_derive::il2cpp_api;

#[derive(Clone, Copy, dahlah_derive::Il2CppValue)]
#[repr(transparent)]
pub struct Il2CppException(pub usize);

#[il2cpp_api("System.Exception")]
impl Il2CppException {
    #[method("get_Message", 6, native)]
    pub fn get_message(&self) -> anyhow::Result<Il2CppString>;

    #[method("get_StackTrace", 14, native)]
    pub fn get_stacktrace(&self) -> anyhow::Result<Il2CppString>;
}

impl Debug for Il2CppException {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Il2CppException:\n")?;
        f.write_str(&self.get_message().unwrap().as_str())?;
        f.write_char('\n')?;
        f.write_str(&self.get_stacktrace().unwrap().as_str())?;
        Ok(())
    }
}

impl From<Il2CppException> for anyhow::Error {
    fn from(val: Il2CppException) -> Self {
        anyhow::format_err!("Il2CppException: {}", val.get_message().unwrap().as_str())
    }
}
