use reflection::{method_info::MethodInfo, runtime_type::RuntimeType};
use serde::Serialize;

#[derive(Serialize, PartialEq, Eq, Hash, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct ScriptMethod {
    #[serde(skip)]
    pub method_info: MethodInfo,
    pub address: usize,
    pub name: String,
    pub signature: String,
    pub type_signature: String,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct ScriptString {
    pub value: String,
    pub address: usize,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct ScriptMetadata {
    pub address: usize,
    pub name: String,
    pub signature: String,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct ScriptMetadataMethod {
    pub address: usize,
    pub name: String,
    pub method_address: usize,
}

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct ScriptMethodInvoker {
    pub address: usize,
    pub name: String,
    pub signature: String,
}

#[derive(Default, Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct ScriptJsonOutput {
    pub script_string: Vec<ScriptString>,
    pub script_metadata: Vec<ScriptMetadata>,
    pub script_method: Vec<ScriptMethod>,
    pub script_metadata_method: Vec<ScriptMetadataMethod>,
    pub method_invokers: Vec<ScriptMethodInvoker>,
    pub addresses: Vec<usize>,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct StringLiteralOutput {
    pub value: String,
    pub address: String,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct StructInfo {
    pub type_name: String,
    pub runtime_type: RuntimeType,
    pub is_value_type: bool,
    pub parent: Option<String>,
    pub fields: Vec<StructFieldInfo>,
    pub static_fields: Vec<StructFieldInfo>,
    pub v_table_methods: Vec<StructVTableMethod>,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct StructFieldInfo {
    pub field_name: String,
    pub field_type_name: String,
    pub offset: usize,
    pub is_value_type: bool,
    pub is_custom_type: bool,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct StructVTableMethod {
    pub method_name: String,
}

#[derive(Clone)]
pub struct StructRGCTXInfo {
    pub r#type: i32,
    pub type_name: String,
    pub class_name: String,
    pub method_name: String,
}
