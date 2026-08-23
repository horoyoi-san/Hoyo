use super::FieldLogic;

pub const PLAYER_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "PlayerBasicInfo",
        FieldLogic::ByNumber(&[
            (1, "nickname"),
            (2, "level"),
            (3, "exp"),
            (4, "stamina"),
            (5, "mcoin"),
            (6, "hcoin"),
            (7, "scoin"),
            (8, "world_level"),
        ]),
    ),
    (
        "AvatarOutfit",
        FieldLogic::ByNumber(&[(1, "remote_player_avatar_id")]),
    ),
    (
        "SpBarInfo",
        FieldLogic::ByNumber(&[(1, "cur_sp"), (2, "max_sp")]),
    ),
    (
        "BlackInfo",
        FieldLogic::ByNumber(&[
            (1, "begin_time"),
            (2, "end_time"),
            (3, "limit_level"),
            (4, "ban_type"),
        ]),
    ),
    (
        "FeverTimeAvatar",
        FieldLogic::ByNumber(&[(1, "avatar_type"), (2, "id")]),
    ),
    ("FeverTimeAvatarInfo", FieldLogic::ByNumber(&[(4, "index")])),
    (
        "VersionCount",
        FieldLogic::ByNumber(&[(1, "version"), (2, "count")]),
    ),
    (
        "ClientDownloadData",
        FieldLogic::ByNumber(&[(2, "time"), (3, "data")]),
    ),
    (
        "ClientObjDownloadData",
        FieldLogic::ByNumber(&[
            (1, "sc_info"),
            (2, "client_obj_download_data"),
            (3, "dyn_code"),
        ]),
    ),
    (
        "ClientUploadData",
        FieldLogic::ByNumber(&[(1, "tag"), (2, "value")]),
    ),
    (
        "FeatureSwitchParam",
        FieldLogic::ByNumber(&[(1, "switch_list")]),
    ),
    ("FeatureSwitchInfo", FieldLogic::ByNumber(&[(1, "type")])),
    (
        "ReplayInfo",
        FieldLogic::ByNumber(&[
            (2, "replay_type"),
            (3, "stage_id"),
            (4, "uid"),
            (5, "nickname"),
            (6, "head_icon"),
            (7, "replay_name"),
            (8, "create_time"),
        ]),
    ),
    (
        "PunkLordBattleAvatarList",
        FieldLogic::ByNumber(&[(1, "avatar_id"), (2, "avatar_level")]),
    ),
    (
        "PunkLordBattleRecordListData",
        FieldLogic::ByNumber(&[(6, "avatar_list")]),
    ),
    (
        "PunkLordBattleRecordList",
        FieldLogic::ByNumber(&[(1, "battle_record_list")]),
    ),
    (
        "PunkLordMonsterKey",
        FieldLogic::ByNumber(&[(2, "monster_id")]),
    ),
    (
        "PunkLordMonsterBasicInfo",
        FieldLogic::ByNumber(&[
            (3, "config_id"),
            (4, "world_level"),
            (6, "left_hp"),
            (7, "attacker_num"),
            (8, "share_type"),
        ]),
    ),
];
