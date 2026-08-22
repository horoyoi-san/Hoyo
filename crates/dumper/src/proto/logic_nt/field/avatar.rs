use super::FieldLogic;

pub const AVATAR_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "AvatarPathChangedNotify",
        FieldLogic::ByWireType(&[
            ("MultiPathAvatarType", "cur_multi_path_avatar_type"),
            ("uint32", "base_avatar_id"),
        ]),
    ),
    (
        "UnlockAvatarPathScRsp",
        FieldLogic::ByWireType(&[("repeated uint32", "basic_type_id_list")]),
    ),
    (
        "SetGrowthTargetAvatarScRsp",
        FieldLogic::ByWireType(&[("uint32", "growth_avatar_id")]),
    ),
    (
        "UnlockSkilltreeCsReq",
        FieldLogic::ByWireType(&[("repeated ItemCost", "item_list")]),
    ),
    (
        "AddAvatarScNotify",
        FieldLogic::ByWireType(&[("bool", "is_new")]),
    ),
];
