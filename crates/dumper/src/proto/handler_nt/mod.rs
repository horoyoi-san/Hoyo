use std::collections::HashMap;
use std::sync::OnceLock;

use crate::proto::output::TypeToItemMap;

pub mod handler;

static CACHED_HANDLER_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();
pub static CS_HANDLER_TABLE: OnceLock<Vec<(String, String, usize)>> = OnceLock::new();
// pub static SC_HANDLER_TABLE: OnceLock<Vec<(String, String, usize)>> = OnceLock::new();

pub fn get_handler_nt_map(type_to_item: &TypeToItemMap) -> HashMap<String, String> {
    if let Some(cached) = CACHED_HANDLER_MAP.get() {
        return cached.clone();
    }

    let mut map = HashMap::new();
    map.extend(handler::avatar_path_equipment::process(type_to_item));
    map.extend(handler::equipment::process(type_to_item));
    map.extend(handler::relic::process(type_to_item));
    map.extend(handler::quest::process(type_to_item));
    map.extend(handler::challengepeak_notify::process(type_to_item));
    map.extend(handler::scene_battle_info::process(type_to_item));
    map.extend(handler::scene_info::process_player(type_to_item));
    map.extend(handler::scene_info::process_light(type_to_item));
    map.extend(handler::lineup_info::process(type_to_item));
    map.extend(handler::friend_login_info::process(type_to_item));
    map.extend(handler::cs_player_get_token::process(type_to_item));
    map.extend(handler::player_sync_sc_notify::process(type_to_item));
    map.extend(handler::gate_server::process_all(type_to_item));
    let _ = CACHED_HANDLER_MAP.set(map.clone());

    map
}
