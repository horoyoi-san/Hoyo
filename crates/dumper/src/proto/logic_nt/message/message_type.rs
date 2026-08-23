use crate::proto::logic_nt::message::chat_data;
use crate::proto::logic_nt::message::entered_scene;
use crate::proto::logic_nt::message::player_heart_beat;
use crate::proto::logic_nt::message::scene_cast_skill;

use super::avatar;
use super::avatar_property;
use super::battle_avatar;
use super::battle_op;
use super::challenge_boss_relic_info;
use super::playerbasic;
use super::region;
use super::scene_battle_info;
use super::scene_buff_info;
use super::scene_entity_info;

pub struct Category {
    pub trigger: &'static str,
    pub target: &'static str,
    pub enums: &'static [&'static str],
    pub messages: &'static [&'static str],
}

pub const CATEGORIES: &[Category] = &[
    Category {
        trigger: "CmdAvatarType",
        target: "CmdBattleType",
        enums: avatar::AVATAR_ENUMS,
        messages: avatar::AVATAR_MESSAGES,
    },
    Category {
        trigger: "PlayerBasicInfo",
        target: "PunkLordMonsterBasicInfo",
        enums: &[],
        messages: playerbasic::PLAYER_MESSAGES,
    },
    Category {
        trigger: "TryDownLoadReplay",
        target: "Vector",
        enums: &[],
        messages: region::REGION_MESSAGES,
    },
    Category {
        trigger: "ChallengeBossEquipmentInfo",
        target: "ChallengeBossAvatarRelicInfo",
        enums: &[],
        messages: challenge_boss_relic_info::CBRI_MESSAGES,
    },
    Category {
        trigger: "BattleOp",
        target: "RelicAffix",
        enums: &[],
        messages: battle_op::BATTLEPOP_MESSAGES,
    },
    Category {
        trigger: "BattleAvatar",
        target: "AvatarProperty",
        enums: &[],
        messages: battle_avatar::BATTLEAVATAR_MESSAGES,
    },
    Category {
        trigger: "AvatarProperty",
        target: "AvatarBattleInfo",
        enums: &[],
        messages: avatar_property::AP_MESSAGES,
    },
    Category {
        trigger: "Relic",
        target: "SceneMonsterReward",
        enums: &[],
        messages: scene_battle_info::SBI_MESSAGES,
    },
    Category {
        trigger: "CmdSceneType",
        target: "ScenePropInfo",
        enums: scene_entity_info::SEI_ENUMS,
        messages: scene_entity_info::SEI_MESSAGES,
    },
    Category {
        trigger: "BuffInfo",
        target: "SceneInfo",
        enums: &[],
        messages: scene_buff_info::SBUI_MESSAGES,
    },
    Category {
        trigger: "ChangeTimeRewindInfoRsp",
        target: "SceneCastSkillScRsp",
        enums: &[],
        messages: scene_cast_skill::SCKI_MESSAGES,
    },
    Category {
        trigger: "SetGameplayBirthdayScRsp",
        target: "FeatureSwitchClosedScNotify",
        enums: &[],
        messages: player_heart_beat::HEARTBEAT_MESSAGES,
    },
    Category {
        trigger: "GroupStateChangeScRsp",
        target: "GetEnteredSceneScRsp",
        enums: &[],
        messages: entered_scene::ETS_MESSAGES,
    },
    Category {
        trigger: "ChatData",
        target: "VirtualItemType",
        enums: chat_data::CHATD_ENUMS,
        messages: chat_data::CHATD_MESSAGES,
    },
    Category {
        trigger: "GetPrivateChatHistoryScRsp",
        target: "GetChatFriendHistoryScRsp",
        enums: &[],
        messages: chat_data::CHATH_MESSAGES,
    },
];
