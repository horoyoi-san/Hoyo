use std::{collections::HashMap, sync::OnceLock};

use super::models::StructInfo;

pub static STRUCT_OFFSET_MAP: OnceLock<HashMap<String, HashMap<usize, String>>> = OnceLock::new();

pub fn init(list: &[StructInfo]) {
    let mut map = HashMap::new();
    for si in list {
        let mut fields = HashMap::new();
        for f in si.fields.iter().chain(si.static_fields.iter()) {
            fields.insert(f.offset, f.field_name.clone());
        }
        map.insert(si.type_name.clone(), fields);
    }
    STRUCT_OFFSET_MAP.set(map).unwrap_or(());
}
