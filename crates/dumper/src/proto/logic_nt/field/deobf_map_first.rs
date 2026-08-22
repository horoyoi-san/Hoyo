use super::FieldLogic;

pub const DEOBF_MAP1_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "MusicRhythmDataCsReq",
        FieldLogic::ByWireType(&[("uint32", "player_data")]),
    ),
    (
        "SummonPetCsReq",
        FieldLogic::ByWireType(&[("uint32", "summoned_pet_id")]),
    ),
    (
        "GetRollShopInfoCsReq",
        FieldLogic::ByWireType(&[("uint32", "roll_shop_id")]),
    ),
    (
        "GetUnlockTeleportCsReq",
        FieldLogic::ByWireType(&[("repeated uint32", "entry_id_list")]),
    ),
    (
        "GetFirstTalkNpcCsReq",
        FieldLogic::ByWireType(&[("repeated uint32", "npc_id_list")]),
    ),
    (
        "GetMainMissionCustomValueCsReq",
        FieldLogic::ByWireType(&[("repeated uint32", "main_mission_id_list")]),
    ),
    (
        "RogueWorkbenchGetInfoCsReq",
        FieldLogic::ByWireType(&[("uint32", "prop_entity_id")]),
    ),
    (
        "GetFirstTalkByPerformanceNpcCsReq",
        FieldLogic::ByWireType(&[("repeated uint32", "performance_id_list")]),
    ),
    (
        "UnlockAvatarSkinScNotify",
        FieldLogic::ByWireType(&[("uint32", "skin_id")]),
    ),
    (
        "FightFestUpdateCoinNotify",
        FieldLogic::ByWireType(&[("uint32", "item_value")]),
    ),
    (
        "CancelMarkItemNotify",
        FieldLogic::ByWireType(&[("uint32", "item_id")]),
    ),
    (
        "PixAirUnlockPlaneCsReq",
        FieldLogic::ByWireType(&[("uint32", "plane_id")]),
    ),
    (
        "AcceptMainMissionCsReq",
        FieldLogic::ByWireType(&[("uint32", "main_mission_id")]),
    ),
    (
        "MainMissionAcceptNotify",
        FieldLogic::ByWireType(&[("repeated uint32", "sub_mission_id_list")]),
    ),
    (
        "FinishedMissionScNotify",
        FieldLogic::ByWireType(&[("repeated uint32", "finished_mission_id")]),
    ),
    (
        "ContentPackageInfo",
        FieldLogic::ByWireType(&[("uint32", "content_id")]),
    ),
    (
        "UnlockPamSkinScNotify",
        FieldLogic::ByWireType(&[("uint32", "pam_skin")]),
    ),
    (
        "UnlockChatBubbleScNotify",
        FieldLogic::ByWireType(&[("uint32", "bubble_id")]),
    ),
    (
        "UnlockPhoneThemeScNotify",
        FieldLogic::ByWireType(&[("uint32", "theme_id")]),
    ),
    (
        "SetGameplayBirthdayScRsp",
        FieldLogic::ByWireType(&[("uint32", "birthday")]),
    ),
    (
        "SetDisplayAvatarScRsp",
        FieldLogic::ByWireType(&[("repeated DisplayAvatarData", "display_avatar_list")]),
    ),
    (
        "SetSignatureScRsp",
        FieldLogic::ByWireType(&[("string", "signature")]),
    ),
    (
        "SyncRogueAreaUnlockScNotify",
        FieldLogic::ByWireType(&[("uint32", "area_id")]),
    ),
    (
        "SetPersonalCardScRsp",
        FieldLogic::ByWireType(&[("uint32", "current_personal_card_id")]),
    ),
    (
        "ServerAnnounceNotify",
        FieldLogic::ByWireType(&[("repeated AnnounceData", "announce_data_list")]),
    ),
    (
        "ChallengeLineupNotify",
        FieldLogic::ByWireType(&[("ExtraLineupType", "extra_lineup_type")]),
    ),
    (
        "EnterTrialActivityStageScRsp",
        FieldLogic::ByWireType(&[("SceneBattleInfo", "battle_info")]),
    ),
    (
        "GetArchiveDataScRsp",
        FieldLogic::ByWireType(&[("ArchiveData", "archive_data")]),
    ),
    (
        "AvatarExpUpScRsp",
        FieldLogic::ByWireType(&[("repeated PileItem", "return_item_list")]),
    ),
    (
        "TakePromotionRewardScRsp",
        FieldLogic::ByWireType(&[("ItemList", "reward_list")]),
    ),
    (
        "GetPlayerDetailInfoScRsp",
        FieldLogic::ByWireType(&[("PlayerDetailInfo", "detail_info")]),
    ),
    (
        "SetHeadIconScRsp",
        FieldLogic::ByWireType(&[("uint32", "current_head_icon_id")]),
    ),
    (
        "SceneCastSkillCostMpScRsp",
        FieldLogic::ByWireType(&[("uint32", "cast_entity_id")]),
    ),
    (
        "GetUnlockTeleportScRsp",
        FieldLogic::ByWireType(&[("repeated uint32", "unlocked_teleport_list")]),
    ),
    (
        "AddBlacklistScRsp",
        FieldLogic::ByWireType(&[("PlayerSimpleInfo", "black_info")]),
    ),
    (
        "MazeKillDirectScRsp",
        FieldLogic::ByWireType(&[("repeated uint32", "entity_list")]),
    ),
    (
        "TakeAllRewardScRsp",
        FieldLogic::ByWireType(&[("ItemList", "reward")]),
    ),
    (
        "RestartChallengePhaseScRsp",
        FieldLogic::ByWireType(&[("SceneInfo", "scene")]),
    ),
    (
        "FinishFirstTalkNpcScRsp",
        FieldLogic::ByWireType(&[("uint32", "npc_id")]),
    ),
    (
        "OpenChestScNotify",
        FieldLogic::ByWireType(&[("uint32", "chest_id")]),
    ),
    (
        "RogueShopBeginBattleCsReq",
        FieldLogic::ByWireType(&[("uint32", "interacted_prop_entity_id")]),
    ),
    (
        "SetGroupCustomSaveDataScRsp",
        FieldLogic::ByWireType(&[("uint32", "entry_id")]),
    ),
    (
        "SceneEntityTeleportScRsp",
        FieldLogic::ByWireType(&[("uint32", "client_pos_version")]),
    ),
    (
        "SwordTrainingStartGameCsReq",
        FieldLogic::ByWireType(&[("uint32", "game_story_line_id")]),
    ),
    (
        "SceneEntityMoveCsReq",
        FieldLogic::ByWireType(&[("repeated EntityMotion", "entity_motion_list")]),
    ),
    (
        "GetChessRogueStoryAeonTalkInfoScRsp",
        FieldLogic::ByWireType(&[("uint32", "chess_rogue_story_talk_id")]),
    ),
    (
        "SceneGroupRefreshScNotify",
        FieldLogic::ByWireType(&[("uint32", "dimension_id")]),
    ),
    (
        "FinishRogueCommonDialogueScRsp",
        FieldLogic::ByWireType(&[("uint32", "regue_common_id")]),
    ),
    (
        "EntityMotion",
        FieldLogic::ByWireType(&[("MotionInfo", "motion"), ("uint32", "map_layer")]),
    ),
    (
        "SceneEntityMoveScRsp",
        FieldLogic::ByWireType(&[("ClientDownloadData", "download_data")]),
    ),
    (
        "StartAetherDivideSceneBattleCsReq",
        FieldLogic::ByWireType(&[("repeated uint32", "assist_monster_entity_id_list")]),
    ),
    (
        "CocoonSweepCsReq",
        FieldLogic::ByWireType(&[("uint32", "cocoon_id")]),
    ),
    (
        "GrowthTargetAvatarChangedScNotify",
        FieldLogic::ByWireType(&[("uint32", "growth_target_specific_path_id")]),
    ),
    (
        "DressAvatarCsReq",
        FieldLogic::ByWireType(&[("uint32", "equipment_unique_id")]),
    ),
    (
        "SceneEntityGroupInfo",
        FieldLogic::ByWireType(&[
            ("repeated SceneEntityInfo", "entity_list"),
            ("map<string, int32>", "additional_properties"),
        ]),
    ),
    (
        "GetPlatformPlayerInfoScRsp",
        FieldLogic::ByWireType(&[("repeated PlayerSimpleInfo", "friend_recommend_list")]),
    ),
    (
        "PlayerGetTokenScRsp",
        FieldLogic::ByWireType(&[("uint64", "secret_key_seed"), ("string", "authkey")]),
    ),
    (
        "PlayerLoginScRsp",
        FieldLogic::ByWireType(&[("uint64", "server_timestamp_ms"), ("int32", "cur_timezone")]),
    ),
    (
        "GetAllLineupDataScRsp",
        FieldLogic::ByWireType(&[
            ("repeated LineupInfo", "lineup_list"),
            ("uint32", "cur_index"),
        ]),
    ),
    (
        "LineupAvatar",
        FieldLogic::ByWireType(&[("uint32", "satiety")]),
    ),
    (
        "PlayerSyncScNotify",
        FieldLogic::ByWireType(&[
            ("repeated WaitDelResource", "wait_del_resource_list"),
            ("repeated Quest", "quest_list"),
            ("uint32", "total_achievement_exp"),
        ]),
    ),
    (
        "SceneCastSkillScRsp",
        FieldLogic::ByWireType(&[("BattleEndStatus", "end_status")]),
    ),
    (
        "PVEBattleResultScRsp",
        FieldLogic::ByWireType(&[("repeated HitMonsterBattleInfo", "monster_battle_info")]),
    ),
    (
        "ChangeTimeRewindInfoReq",
        FieldLogic::ByWireType(&[("bool", "is_close_map")]),
    ),
    (
        "BigDataAllRecommendCSReq",
        FieldLogic::ByWireType(&[("bool", "big_data_recommend_type")]),
    ),
    (
        "PlayerHeartBeatCsReq",
        FieldLogic::ByWireType(&[("uint64", "client_time_ms")]),
    ),
    (
        "GetEnteredSceneScRsp",
        FieldLogic::ByWireType(&[("repeated EnteredSceneInfo", "entered_scene_info_list")]),
    ),
    (
        "FriendHistoryInfo",
        FieldLogic::ByWireType(&[("uint32", "contact_side"), ("int64", "last_send_time")]),
    ),
    (
        "TakeQuestRewardCsReq",
        FieldLogic::ByWireType(&[("repeated uint32", "take_reward_list")]),
    ),
    (
        "PlanetFesTakeQuestRewardCsReq",
        FieldLogic::ByWireType(&[("uint32", "quest_id")]),
    ),
    (
        "UpdateGroupPropertyCsReq",
        FieldLogic::ByWireType(&[("int32", "gp_value")]),
    ),
];
