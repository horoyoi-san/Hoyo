use super::FieldLogic;

pub const DEOBF_MAP_SECOND_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "SceneCastSkillCostMpCsReq",
        FieldLogic::ByWireType(&[("uint32", "attacked_by_entity_id")]),
    ),
    (
        "HitMonsterBattleInfo",
        FieldLogic::ByWireType(&[
            ("MonsterBattleType", "monster_battle_type"),
            ("uint32", "target_monster_entity_id"),
        ]),
    ),
    (
        "SceneCastSkillCsReq",
        FieldLogic::ByWireType(&[
            (
                "repeated AssistMonsterEntityInfo",
                "assist_monster_entity_info",
            ),
            ("repeated uint32", "hit_target_entity_id_list"),
            ("string", "maze_ability_str"),
            ("repeated SkillExtraTag", "skill_extra_tags"),
            ("MotionInfo", "target_motion"),
        ]),
    ),
    (
        "SceneCastSkillMpUpdateScNotify",
        FieldLogic::ByWireType(&[("uint32", "mp")]),
    ),
    (
        "EnterSectionCsReq",
        FieldLogic::ByWireType(&[("uint32", "section_id")]),
    ),
    (
        "SetClientPausedScRsp",
        FieldLogic::ByWireType(&[("bool", "paused")]),
    ),
    (
        "SetGroupCustomSaveDataCsReq",
        FieldLogic::ByWireType(&[("string", "save_data")]),
    ),
    (
        "SceneEntityTeleportCsReq",
        FieldLogic::ByWireType(&[("EntityMotion", "entity_motion")]),
    ),
    (
        "SceneGroupState",
        FieldLogic::ByWireType(&[("bool", "is_default")]),
    ),
    (
        "SceneSummonUnitInfo",
        FieldLogic::ByWireType(&[("uint64", "create_time_ms"), ("int32", "life_time_ms")]),
    ),
    (
        "InteractPropScRsp",
        FieldLogic::ByWireType(&[("uint32", "prop_state")]),
    ),
    (
        "SetAvatarEnhancedIdScRsp",
        FieldLogic::ByWireType(&[("uint32", "unk_enhanced_id")]),
    ),
    (
        "Avatar",
        FieldLogic::ByWireType(&[
            ("uint32", "equipment_unique_id"),
            ("repeated uint32", "has_taken_promotion_reward_list"),
            ("bool", "is_marked"),
            ("uint64", "first_met_time_stamp"),
        ]),
    ),
    (
        "GetAvatarDataScRsp",
        FieldLogic::ByWireType(&[
            ("repeated uint32", "skin_list"),
            ("bool", "is_get_all"),
            ("repeated AvatarPathData", "avatar_path_data_info_list"),
            ("repeated KVP", "kvp"),
            ("repeated Avatar", "avatar_list"),
        ]),
    ),
    (
        "LineupInfo",
        FieldLogic::ByWireType(&[("uint32", "leader_slot")]),
    ),
    (
        "EnterSceneScRsp",
        FieldLogic::ByWireType(&[("bool", "is_over_map")]),
    ),
    (
        "PlayerHeartBeatScRsp",
        FieldLogic::ByWireType(&[
            ("ClientDownloadData", "download_data"),
            ("uint64", "server_time_ms"),
        ]),
    ),
    (
        "GetPrivateChatHistoryScRsp",
        FieldLogic::ByWireType(&[
            ("repeated ChatMessageData", "chat_message_list"),
            ("uint32", "target_side"),
        ]),
    ),
];
