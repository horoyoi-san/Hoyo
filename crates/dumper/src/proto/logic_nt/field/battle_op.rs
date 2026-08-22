use super::FieldLogic;

pub const BATTLE_OP_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "BattleOp",
        FieldLogic::ByNumber(&[
            (1, "turn_counter"),
            (3, "action_entity_id"),
            (4, "target_entity_id"),
            (6, "skill_index"),
        ]),
    ),
    (
        "BattleRelic",
        FieldLogic::ByNumber(&[(4, "sub_affix_list"), (6, "set_id")]),
    ),
    ("AvatarSkillTree", FieldLogic::ByNumber(&[(1, "point_id")])),
    (
        "RelicAffix",
        FieldLogic::ByNumber(&[(1, "affix_id"), (2, "cnt"), (3, "step")]),
    ),
];
