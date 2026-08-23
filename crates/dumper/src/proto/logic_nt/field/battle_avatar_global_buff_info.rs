use super::FieldLogic;

pub const BATTLE_AVATAR_GLOBAL_BUFF_INFO_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "BattleAvatarGlobalBuffInfo",
        FieldLogic::ByNumber(&[(2, "maze_buff_id")]),
    ),
    (
        "BattleStatistics",
        FieldLogic::ByNumber(&[
            (1, "total_battle_turns"),
            (2, "total_auto_turns"),
            (3, "avatar_id_list"),
            (4, "ultra_cnt"),
            (5, "total_delay_cumulate"),
            (6, "cost_time"),
            (7, "battle_avatar_list"),
            (8, "monster_list"),
            (9, "round_cnt"),
            (10, "cocoon_dead_wave"),
            (11, "avatar_battle_turns"),
            (12, "monster_battle_turns"),
            (13, "custom_values"),
            (14, "challenge_score"),
            (19, "end_reason"),
        ]),
    ),
];
