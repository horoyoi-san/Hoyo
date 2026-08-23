use std::collections::{HashMap, HashSet};

use crate::proto::output::ProtoItem;

pub const SCENE_INFO_FIELD_MAP: &[(&str, super::FieldLogic)] = &[];

pub fn full_deobf_scene_info(
    items: &[std::rc::Rc<std::cell::RefCell<ProtoItem>>],
    nt_map: &mut indexmap::IndexMap<String, String>,
    global_field_map: &mut HashMap<String, String>,
) {
    let scene_info_fields = items
        .iter()
        .find_map(|item| {
            let item_ref = item.borrow();
            if let ProtoItem::Message(m) = &*item_ref {
                let deobf_name = nt_map.get(&m.name)?;
                (deobf_name == "SceneInfo").then(|| {
                    m.fields
                        .iter()
                        .filter(|f| f.kind == "uint32" && !global_field_map.contains_key(&f.name))
                        .map(|f| f.name.clone())
                        .collect::<Vec<_>>()
                })
            } else {
                None
            }
        })
        .unwrap_or_default();

    if scene_info_fields.len() != 2 {
        return;
    }

    let mut xref_names: HashSet<String> = HashSet::new();
    for item in items {
        let item_ref = item.borrow();
        if let ProtoItem::Message(m) = &*item_ref {
            let deobf_name = nt_map.get(&m.name).map(std::string::String::as_str);
            if deobf_name == Some("SceneInfo") {
                continue;
            }
            for f in &m.fields {
                if f.kind == "uint32" {
                    xref_names.insert(f.name.clone());
                }
            }
        }
    }

    let (game_mode_field, world_field) = if xref_names.contains(&scene_info_fields[0]) {
        (&scene_info_fields[0], &scene_info_fields[1])
    } else {
        (&scene_info_fields[1], &scene_info_fields[0])
    };

    global_field_map.insert(game_mode_field.clone(), "game_mode_type".to_string());
    nt_map.insert(game_mode_field.clone(), "game_mode_type".to_string());

    global_field_map.insert(world_field.clone(), "world_id".to_string());
    nt_map.insert(world_field.clone(), "world_id".to_string());
}
