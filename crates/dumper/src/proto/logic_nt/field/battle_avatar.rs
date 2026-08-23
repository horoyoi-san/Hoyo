use super::FieldLogic;

pub const BATTLE_AVATAR_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "BattleAvatar",
        FieldLogic::ByNumber(&[
            (6, "skilltree_list"),
            (7, "equipment_list"),
            (11, "relic_list"),
            (13, "assist_uid"),
            (16, "sp_bar"),
        ]),
    ),
    (
        "BattleMonsterParam",
        FieldLogic::ByNumber(&[(1, "hard_level_group"), (3, "elite_group")]),
    ),
    (
        "BattleMonster",
        FieldLogic::ByNumber(&[(1, "monster_id"), (2, "cur_hp"), (4, "extra_info")]),
    ),
    (
        "BattleMonsterWave",
        FieldLogic::ByNumber(&[
            (1, "monster_list"),
            (2, "monster_param"),
            (3, "battle_stage_id"),
            (4, "battle_wave_id"),
        ]),
    ),
    (
        "BattleBuff",
        FieldLogic::ByNumber(&[
            (3, "owner_index"),
            (4, "wave_flag"),
            (5, "target_index_list"),
        ]),
    ),
    (
        "BattleTarget",
        FieldLogic::ByNumber(&[(3, "total_progress")]),
    ),
    (
        "BattleTargetList",
        FieldLogic::ByNumber(&[(1, "battle_target_list")]),
    ),
    ("SceneDebugInfo", FieldLogic::ByNumber(&[(6, "floor_id")])),
];
