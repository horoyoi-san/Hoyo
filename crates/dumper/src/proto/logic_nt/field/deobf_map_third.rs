use super::FieldLogic;

pub const DEOBF_MAP3_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "AvatarPathData",
        FieldLogic::ByWireType(&[
            ("repeated AvatarPathSkillTree", "avatar_path_skill_tree"),
            ("uint32", "dressed_skin_id"),
        ]),
    ),
    (
        "ScenePropInfo",
        FieldLogic::ByWireType(&[("uint32", "prop_id")]),
    ),
];
