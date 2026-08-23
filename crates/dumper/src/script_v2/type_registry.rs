use std::collections::{HashMap, HashSet};

use reflection::runtime_type::RuntimeType;

use crate::script_v2::naming_utils;

#[derive(Default)]
pub struct TypeRegistry {
    by_type: HashMap<RuntimeType, String>,
    by_runtime_name: HashMap<String, String>,
    pub runtime_types: Vec<RuntimeType>,
    struct_name_hash_set: HashSet<String>,
}

impl TypeRegistry {
    pub fn register_struct_name(&mut self, type_def: RuntimeType) {
        let type_name = type_def.format_type_name_with_namespace(false, false);
        let type_struct_name = naming_utils::fix_name(type_name.to_string());

        let unique_name = self.get_unique_name(&type_struct_name);
        // let unique_name = unique_name.strip_prefix("_").unwrap_or(&unique_name);

        if self
            .by_type
            .insert(type_def, unique_name.to_string())
            .is_none()
        {
            self.runtime_types.push(type_def);
        }

        self.by_runtime_name
            .insert(type_name.to_string(), unique_name.to_string());
    }

    fn get_unique_name(&mut self, name: &str) -> String {
        let mut fix_name = name.to_string();
        let mut i = 1;

        while !self.struct_name_hash_set.insert(fix_name.clone()) {
            fix_name = format!("{name}_{i}");
            i += 1;
        }

        fix_name
    }

    pub fn get_by_rt(&self, t: RuntimeType) -> Option<&str> {
        self.by_type.get(&t).map(std::string::String::as_str)
    }

    pub fn get_by_name(&self, name: &str) -> Option<&str> {
        self.by_runtime_name.get(name).map(std::string::String::as_str)
    }
}
