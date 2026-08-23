use std::collections::{HashMap, HashSet};

use crate::script_v2::{
    models::{
        ScriptJsonOutput, ScriptMethod, ScriptMethodInvoker, StringLiteralOutput, StructInfo,
    },
    naming_utils::FieldNameReserver,
};

#[derive(Default)]
pub struct Context {
    pub script_output: ScriptJsonOutput,
    pub string_literals: Vec<StringLiteralOutput>,

    pub method_cache: HashMap<(usize, i32), HashSet<ScriptMethod>>,
    pub script_method_invokers: HashMap<usize, ScriptMethodInvoker>,
    pub struct_array_info_list: HashMap<String, String>,
    pub rgctx_added_list: Vec<String>,

    pub struct_info_list: Vec<StructInfo>,
    pub struct_info_with_struct_name: HashMap<String, StructInfo>,

    pub method_info_header: String,
    pub struct_cache: HashSet<StructInfo>,
    pub wrote_cache: HashSet<String>,
    pub processed_method_infos: HashSet<usize>,

    pub method_name_cache: HashMap<usize, (String, String)>,

    pub field_name_reserver: FieldNameReserver,
}
