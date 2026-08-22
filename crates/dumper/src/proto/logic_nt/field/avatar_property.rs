use super::FieldLogic;

pub const AVATAR_PROPERTY_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "AvatarProperty",
        FieldLogic::ByNumber(&[(5, "left_hp"), (6, "left_sp"), (7, "max_sp")]),
    ),
    (
        "AttackDamageProperty",
        FieldLogic::ByNumber(&[(2, "damage")]),
    ),
    (
        "SkillUseProperty",
        FieldLogic::ByNumber(&[(3, "skill_level")]),
    ),
    ("SpAddSource", FieldLogic::ByNumber(&[(2, "sp_add")])),
];
