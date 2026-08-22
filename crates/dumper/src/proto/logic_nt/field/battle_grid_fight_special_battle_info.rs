use super::FieldLogic;

pub const BATTLE_GRID_FIGHT_SPECIAL_BATTLE_INFO_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "BattleGridFightSpecialBattleInfo",
        FieldLogic::ByNumber(&[
            (1, "cur_level_id"),
            (3, "rogue_money"),
            (9, "grid_fight_cur_level_exp"),
        ]),
    ),
    (
        "BattleGridFightTraitCoreRoleInfo",
        FieldLogic::ByNumber(&[(1, "role_id")]),
    ),
    (
        "BattleGridFigntAvatarCoreRoleInfo",
        FieldLogic::ByNumber(&[(1, "grid_fight_avatar_list")]),
    ),
    (
        "GridFightTraitEffectLevelInfo",
        FieldLogic::ByNumber(&[
            (1, "trait_effect_level_exp"),
            (2, "trait_effect_level_reward"),
        ]),
    ),
    (
        "BattleGridFightTraitEffectInfo",
        FieldLogic::ByNumber(&[(1, "effect_id")]),
    ),
    (
        "GridFightTraitInfo",
        FieldLogic::ByNumber(&[(1, "trait_id")]),
    ),
    (
        "GridFightRoleInfo",
        FieldLogic::ByNumber(&[(2, "role_star"), (10, "convert_property_to_fixpoint")]),
    ),
    (
        "GridFightNPCInfo",
        FieldLogic::ByNumber(&[(2, "npc_id"), (4, "grid_fight_equipment_list")]),
    ),
    (
        "BattleGridFightEquipInfo",
        FieldLogic::ByNumber(&[(2, "grid_fight_equipment_id")]),
    ),
    (
        "GridFightAugmentInfo",
        FieldLogic::ByNumber(&[(1, "augment_id")]),
    ),
    (
        "GridFightPortalInfo",
        FieldLogic::ByNumber(&[(1, "portal_buff_id")]),
    ),
    (
        "GridFightInfo",
        FieldLogic::ByNumber(&[
            (3, "grid_fight_lineup_hp"),
            (7, "grid_fight_trait_info"),
            (8, "grid_game_role_list"),
            (10, "sync_augment_info"),
            (14, "grid_fight_portal_buff_list"),
            (15, "is_overlock"),
            (17, "grid_game_npc_list"),
        ]),
    ),
];
