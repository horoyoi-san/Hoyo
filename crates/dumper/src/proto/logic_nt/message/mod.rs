use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

pub mod avatar;
pub mod avatar_property;
pub mod battle_avatar;
pub mod battle_op;
pub mod challenge_boss_relic_info;
pub mod chat_data;
pub mod entered_scene;
pub mod message_type;
pub mod player_heart_beat;
pub mod playerbasic;
pub mod region;
pub mod scene_battle_info;
pub mod scene_buff_info;
pub mod scene_cast_skill;
pub mod scene_entity_info;

use self::message_type::{CATEGORIES, Category};
use super::super::output::{ProtoItem, short_name};

pub fn deobf_messages(
    items: &[Rc<RefCell<ProtoItem>>],
    method_nt_map: &HashMap<String, String>,
    nt_map: &mut indexmap::IndexMap<String, String>,
) {
    let mut current_cat: Option<&Category> = None;
    let mut pending_enums = Vec::new();
    let mut pending_items = Vec::new();

    let flush_category =
        |cat: &Category,
         enums: &mut Vec<String>,
         p_items: &mut Vec<Rc<RefCell<ProtoItem>>>,
         nt_map: &mut indexmap::IndexMap<String, String>| {
            if enums.len() == cat.enums.len() {
                for (idx, obf_name) in enums.iter().enumerate() {
                    if cat.enums[idx] != "Obf" {
                        nt_map.insert(obf_name.clone(), cat.enums[idx].to_string());
                    }
                }
            } else {
                log::debug!(
                    "[logic_nt] category trigger={} enums mismatch: expected {} got {} ({} → {})",
                    cat.trigger,
                    cat.enums.len(),
                    enums.len(),
                    cat.enums.join(", "),
                    enums.join(", "),
                );
            }
            if p_items.len() == cat.messages.len() {
                for (idx, item) in p_items.iter().enumerate() {
                    let item_ref = item.borrow();
                    let obf_name = match &*item_ref {
                        ProtoItem::Message(m) => &m.name,
                        ProtoItem::Enum(e) => &e.name,
                    };
                    if cat.messages[idx] != "Obf" {
                        nt_map.insert(obf_name.clone(), cat.messages[idx].to_string());
                    }
                }
            } else {
                log::debug!(
                    "[logic_nt] category trigger={} messages mismatch: expected {} got {} ({} → {})",
                    cat.trigger,
                    cat.messages.len(),
                    p_items.len(),
                    cat.messages.join(", "),
                    p_items
                        .iter()
                        .map(|i| match &*i.borrow() {
                            ProtoItem::Message(m) => m.name.clone(),
                            ProtoItem::Enum(e) => e.name.clone(),
                        })
                        .collect::<Vec<_>>()
                        .join(", "),
                );
            }
            enums.clear();
            p_items.clear();
        };

    for item in items {
        let item_ref = item.borrow();
        let (name, deobf_name_field) = match &*item_ref {
            ProtoItem::Message(m) => (&m.name, &m.deobfuscated_name),
            ProtoItem::Enum(e) => (&e.name, &e.deobfuscated_name),
        };

        let deobf_name = deobf_name_field
            .clone()
            .or_else(|| method_nt_map.get(name).cloned());

        let short_deobf = deobf_name.as_deref().map(short_name);

        if let Some(next_cat) =
            short_deobf.and_then(|sd| CATEGORIES.iter().find(|c| c.trigger == sd))
        {
            if let Some(dn) = deobf_name.as_ref() {
                nt_map.insert(name.clone(), dn.clone());
            }
            if let Some(prev_cat) = current_cat {
                flush_category(prev_cat, &mut pending_enums, &mut pending_items, nt_map);
            }
            current_cat = Some(next_cat);
            continue;
        }

        if let Some(cat) = current_cat.filter(|c| short_deobf == Some(c.target)) {
            if let Some(dn) = deobf_name.as_ref() {
                nt_map.insert(name.clone(), dn.clone());
            }
            flush_category(cat, &mut pending_enums, &mut pending_items, nt_map);
            current_cat = None;
        }

        if current_cat.is_some() {
            match &*item_ref {
                ProtoItem::Enum(e) if !e.name.contains('.') => pending_enums.push(e.name.clone()),
                ProtoItem::Message(_) => pending_items.push(item.clone()),
                _ => {}
            }
        }
    }

    if let Some(cat) = current_cat {
        flush_category(cat, &mut pending_enums, &mut pending_items, nt_map);
    }
}
