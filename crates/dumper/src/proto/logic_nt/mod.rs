use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

pub mod field;
pub mod message;

use super::output::ProtoItem;

pub fn run_logic_nt(
    items: &[Rc<RefCell<ProtoItem>>],
    message_nt_map: &HashMap<String, String>,
    predeobf_map: &HashMap<String, String>,
) {
    let mut nt_map: indexmap::IndexMap<String, String> = indexmap::IndexMap::new();
    let mut global_field_map: HashMap<String, String> = predeobf_map.clone();

    for (k, v) in predeobf_map {
        nt_map.entry(k.clone()).or_insert(v.clone());
    }

    for (obf_name, deobf_name) in message_nt_map {
        nt_map.insert(obf_name.clone(), deobf_name.clone());
    }

    message::deobf_messages(items, message_nt_map, &mut nt_map);
    field::deobf_fields(items, &mut nt_map, &mut global_field_map);

    if !nt_map.is_empty() {
        let output_content: String = nt_map
            .iter()
            .map(|(k, v)| format!("{k} {v}"))
            .collect::<Vec<_>>()
            .join("\n");
        std::fs::write("./DUMP/nt.txt", output_content).expect("failed to write nt.txt");
    }
}
