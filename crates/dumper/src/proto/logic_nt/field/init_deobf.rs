use super::FieldLogic;

pub const INIT_DEOBF_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "GetGachaCeilingScRsp",
        FieldLogic::ByWireType(&[("uint32", "gacha_type")]),
    ),
    (
        "TrainVisitorBehaviorFinishScRsp",
        FieldLogic::ByWireType(&[("uint32", "visitor_id")]),
    ),
    (
        "FinishFirstTalkByPerformanceNpcScRsp",
        FieldLogic::ByWireType(&[("uint32", "performance_id")]),
    ),
    (
        "SetAssistAvatarScRsp",
        FieldLogic::ByWireType(&[("repeated uint32", "avatar_id_list")]),
    ),
    (
        "StartBoxingClubBattleScRsp",
        FieldLogic::ByWireType(&[("uint32", "challenge_id")]),
    ),
    (
        "HandleFriendScRsp",
        FieldLogic::ByWireType(&[("bool", "is_accept")]),
    ),
    (
        "SetNicknameScRsp",
        FieldLogic::ByWireType(&[("bool", "is_modify"), ("int64", "set_time")]),
    ),
    (
        "SceneInfo",
        FieldLogic::ByWireType(&[
            ("repeated BuffInfo", "scene_buff_info_list"),
            ("MissionStatusBySceneInfo", "scene_mission_info"),
            ("map<string, int32>", "floor_saved_data"),
            ("SceneIdentifier", "scene_identifier"),
            ("repeated SceneEntityGroupInfo", "entity_group_list"),
            ("repeated SceneGroupState", "group_state_list"),
            ("repeated CustomSaveData", "custom_data_list"),
            ("UpdateMazeCrossFloorCondition", "maze_cross_floor"),
            ("repeated uint32", "opened_chests_list"),
        ]),
    ),
    ("Vector", FieldLogic::ByWireType(&[("sint32", "z")])),
    (
        "DeleteSummonUnitCsReq",
        FieldLogic::ByWireType(&[
            ("repeated uint32", "entity_id_list"),
            ("uint64", "interact_id"),
        ]),
    ),
    (
        "SceneBattleInfo",
        FieldLogic::ByWireType(&[("repeated BattleEventBattleInfo", "battle_event")]),
    ),
    (
        "MissionStatusBySceneInfo",
        FieldLogic::ByWireType(&[
            ("repeated MainMissionCustomValue", "mcv_by_scene_info"),
            ("repeated Mission", "unfinished_main_mission_id_list"),
        ]),
    ),
    (
        "PlayerLoginCsReq",
        FieldLogic::ByWireType(&[("uint64", "login_random")]),
    ),
];
