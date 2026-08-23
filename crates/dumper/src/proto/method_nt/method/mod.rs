use std::collections::{HashMap, HashSet};

pub mod avatar;
pub mod battle;
pub mod challenge;
pub mod nt_expected;
pub mod scene;

pub fn get_method_nt_entries() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.extend(avatar::get_avatar_nt());
    map.extend(avatar::get_level_up_avatar_nt());
    map.extend(avatar::get_unlock_skill_tree_nt());
    map.extend(avatar::get_promote_avatar_nt());
    map.extend(avatar::get_dress_avatar_nt());
    map.extend(avatar::get_take_off_equiment_nt());
    map.extend(avatar::get_rank_up_avatar_nt());
    map.extend(avatar::get_dress_relic_avatar_nt());
    map.extend(avatar::get_take_off_relic_nt());
    map.extend(avatar::get_take_promotion_reward_nt());
    map.extend(avatar::get_dress_avatar_skin_nt());
    map.extend(avatar::get_take_off_avatar_skin_nt());
    map.extend(avatar::get_set_mult_avatar_path_nt());
    map.extend(avatar::get_set_growth_target_avatar_nt());
    map.extend(avatar::get_mark_avatar_nt());
    map.extend(avatar::get_unlock_avatar_path_nt());
    map.extend(challenge::get_challenge_history_nt());
    map.extend(challenge::get_challengepeak_nt());
    map.extend(challenge::get_challenge_peak_group_nt());
    map.extend(challenge::get_challenge_tierce_handler_nt());
    map.extend(challenge::get_cur_tierce_challenge_nt());
    map.extend(battle::get_battle_send_nt());
    map.extend(battle::get_compare_repeated_nt());
    map.extend(battle::get_battle_grid_fight_equip_nt());
    map.extend(battle::get_grid_fight_statistics_nt());
    map.extend(scene::get_scene_prop_info_nt());
    map.extend(scene::get_maze_prop_state_nt());
    map.extend(scene::get_scene_monster_wave_nt());

    let deobf_set: HashSet<&str> = map.values().map(std::string::String::as_str).collect();
    let missing: Vec<&&str> = nt_expected::EXPECTED_NT
        .iter()
        .filter(|e| !deobf_set.contains(*e))
        .collect();
    if !missing.is_empty() {
        log::debug!("[Method NT] missing: {missing:?}");
    }

    map
}
