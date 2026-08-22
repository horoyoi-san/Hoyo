use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

pub mod avatar;
pub mod avatar_battle_info;
pub mod avatar_property;
pub mod battle_avatar;
pub mod battle_avatar_global_buff_info;
pub mod battle_grid_fight_special_battle_info;
pub mod battle_op;
pub mod challenge_boss_relic_info;
pub mod chat_data;
pub mod deobf_map_first;
pub mod deobf_map_second;
pub mod deobf_map_third;
pub mod init_deobf;
pub mod playerbasic;
pub mod region_info;
pub mod scene_info;

use super::super::output::{ProtoItem, remove_namespace};

pub enum FieldLogic {
    ByNumber(&'static [(u32, &'static str)]),
    ByWireType(&'static [(&'static str, &'static str)]),
}

pub fn deobf_fields(
    items: &[Rc<RefCell<ProtoItem>>],
    nt_map: &mut indexmap::IndexMap<String, String>,
    global_field_map: &mut HashMap<String, String>,
) {
    let field_configs = [
        challenge_boss_relic_info::CHALLENGE_BOSS_RELIC_INFO_FIELD_MAP,
        chat_data::CHATDATA_FIELD_MAP,
        playerbasic::PLAYER_FIELD_MAP,
        region_info::REGION_INFO_FIELD_MAP,
        battle_op::BATTLE_OP_FIELD_MAP,
        battle_avatar::BATTLE_AVATAR_FIELD_MAP,
        avatar_property::AVATAR_PROPERTY_FIELD_MAP,
        avatar_battle_info::AVATAR_BATTLE_INFO_FIELD_MAP,
        battle_grid_fight_special_battle_info::BATTLE_GRID_FIGHT_SPECIAL_BATTLE_INFO_FIELD_MAP,
        battle_avatar_global_buff_info::BATTLE_AVATAR_GLOBAL_BUFF_INFO_FIELD_MAP,
        init_deobf::INIT_DEOBF_FIELD_MAP,
        deobf_map_first::DEOBF_MAP1_FIELD_MAP,
        avatar::AVATAR_FIELD_MAP,
        deobf_map_second::DEOBF_MAP_SECOND_FIELD_MAP,
        deobf_map_third::DEOBF_MAP3_FIELD_MAP,
        scene_info::SCENE_INFO_FIELD_MAP,
    ];

    loop {
        let prev_map_size = global_field_map.len();

        for item in items {
            let item_ref = item.borrow();
            if let ProtoItem::Message(m) = &*item_ref {
                let Some(deobf_msg_name) = nt_map.get(&m.name) else {
                    continue;
                };

                let logic = field_configs
                    .iter()
                    .flat_map(|maps| maps.iter())
                    .find(|(name, _)| *name == deobf_msg_name)
                    .map(|(_, l)| l);

                if let Some(logic) = logic {
                    match logic {
                        FieldLogic::ByNumber(mappings) => {
                            for field in &m.fields {
                                if let Some((_, deobf_f)) = mappings.iter().find(|(n, _)| {
                                    *n == field.number
                                        && !global_field_map.contains_key(&field.name)
                                }) {
                                    let deobf_name = deobf_f.to_string();
                                    global_field_map.insert(field.name.clone(), deobf_name.clone());
                                    nt_map.insert(field.name.clone(), deobf_name);
                                }
                            }
                        }
                        FieldLogic::ByWireType(mappings) => {
                            let mut unsolved_fields: Vec<_> = m.fields.iter().collect();
                            let mut unused_mappings: Vec<_> = mappings.iter().collect();

                            unsolved_fields.retain(|f| {
                                if let Some(deobf_name) = global_field_map.get(&f.name) {
                                    let kind = remove_namespace(&deobf_kind(&f.kind, nt_map));
                                    if let Some(pos) = unused_mappings
                                        .iter()
                                        .position(|(wt, dn)| *wt == kind && *dn == deobf_name)
                                    {
                                        unused_mappings.remove(pos);
                                        if !nt_map.contains_key(&f.name) {
                                            nt_map.insert(f.name.clone(), deobf_name.clone());
                                        }
                                    }
                                    return false;
                                }
                                true
                            });

                            let wire_types: HashSet<_> =
                                unused_mappings.iter().map(|(wt, _)| *wt).collect();

                            for wt in wire_types {
                                let fields_of_type: Vec<_> = unsolved_fields
                                    .iter()
                                    .filter(|f| {
                                        remove_namespace(&deobf_kind(&f.kind, nt_map)) == wt
                                    })
                                    .collect();
                                let names_of_type: Vec<_> = unused_mappings
                                    .iter()
                                    .filter(|(mwt, _)| *mwt == wt)
                                    .collect();

                                if fields_of_type.len() == names_of_type.len()
                                    && !fields_of_type.is_empty()
                                {
                                    for (f, (_, deobf_name)) in
                                        fields_of_type.iter().zip(names_of_type)
                                    {
                                        let deobf_s = deobf_name.to_string();
                                        global_field_map.insert(f.name.clone(), deobf_s.clone());
                                        nt_map.insert(f.name.clone(), deobf_s);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if global_field_map.len() == prev_map_size {
            break;
        }
    }

    scene_info::full_deobf_scene_info(items, nt_map, global_field_map);
}

fn deobf_kind(kind: &str, nt_map: &indexmap::IndexMap<String, String>) -> String {
    let mut result = kind.to_string();
    for (obf, deobf) in nt_map {
        if obf.len() == 11 && obf.chars().all(|c| c.is_ascii_uppercase()) {
            result = result.replace(obf.as_str(), deobf.as_str());
        }
    }
    result
}
