use super::FieldLogic;

pub const REGION_INFO_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "RegionInfo",
        FieldLogic::ByNumber(&[
            (3, "dispatch_url"),
            (4, "env_type"),
            (7, "sub_dispatch_url"),
        ]),
    ),
    (
        "Dispatch",
        FieldLogic::ByNumber(&[(3, "top_sever_region_name"), (4, "region_list")]),
    ),
];
