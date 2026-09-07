#![allow(warnings)]
include!("../out/_.rs");

pub use prost::DecodeError as ProtobufDecodeError;
pub use prost::Message as Protobuf;

pub trait CmdID {
    const CMD_ID: u16;

    fn get_cmd_id(&self) -> u16 {
        Self::CMD_ID
    }
}

#[derive(proto_derive::CmdID)]
#[cmdid(1442)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SceneEntityMoveScNotify {
    #[prost(message, optional, tag = "2")]
    pub motion: ::core::option::Option<MotionInfo>,
    #[prost(uint32, tag = "3")]
    pub client_pos_version: u32,
    #[prost(uint32, tag = "8")]
    pub entity_id: u32,
    #[prost(uint32, tag = "11")]
    pub entry_id: u32,
}

// Avatar Path & Skin Messages
#[derive(proto_derive::CmdID)]
#[cmdid(396)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetAvatarPathCsReq {
    #[prost(enumeration = "MultiPathAvatarType", tag = "4")]
    pub avatar_id: i32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(347)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetAvatarPathScRsp {
    #[prost(enumeration = "MultiPathAvatarType", tag = "11")]
    pub avatar_id: i32,
    #[prost(uint32, tag = "14")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(378)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct DressAvatarSkinCsReq {
    #[prost(uint32, tag = "3")]
    pub skin_id: u32,
    #[prost(uint32, tag = "11")]
    pub avatar_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(304)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct DressAvatarSkinScRsp {
    #[prost(uint32, tag = "14")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(319)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct TakeOffAvatarSkinCsReq {
    #[prost(uint32, tag = "1")]
    pub avatar_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(385)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct TakeOffAvatarSkinScRsp {
    #[prost(uint32, tag = "13")]
    pub retcode: u32,
}

// Challenge Peak (Anomaly Arbitration)
#[derive(proto_derive::CmdID)]
#[cmdid(8920)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StartChallengePeakCsReq {
    #[prost(uint32, repeated, tag = "5")]
    pub peak_avatar_id_list: ::prost::alloc::vec::Vec<u32>,
    #[prost(uint32, tag = "7")]
    pub boss_buff_id: u32,
    #[prost(uint32, tag = "13")]
    pub peak_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8931)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct StartChallengePeakScRsp {
    #[prost(uint32, tag = "11")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8940)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetChallengePeakBossHardModeCsReq {
    #[prost(bool, tag = "4")]
    pub is_hard_mode: bool,
    #[prost(uint32, tag = "13")]
    pub peak_group_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8908)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetChallengePeakBossHardModeScRsp {
    #[prost(uint32, tag = "4")]
    pub peak_group_id: u32,
    #[prost(uint32, tag = "11")]
    pub retcode: u32,
    #[prost(bool, tag = "15")]
    pub is_hard_mode: bool,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ChallengePeakLineup {
    #[prost(uint32, repeated, tag = "3")]
    pub peak_avatar_id_list: ::prost::alloc::vec::Vec<u32>,
    #[prost(uint32, tag = "12")]
    pub peak_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8918)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SetChallengePeakMobLineupAvatarCsReq {
    #[prost(message, repeated, tag = "9")]
    pub lineup_list: ::prost::alloc::vec::Vec<ChallengePeakLineup>,
    #[prost(uint32, tag = "13")]
    pub peak_group_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8938)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetChallengePeakMobLineupAvatarScRsp {
    #[prost(uint32, tag = "7")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8911)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ChallengePeakGroupDataUpdateScNotify {
    #[prost(message, optional, tag = "7")]
    pub challenge_peak_group: ::core::option::Option<ChallengePeakGroup>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8947)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct ReStartChallengePeakCsReq {}

#[derive(proto_derive::CmdID)]
#[cmdid(8925)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct ReStartChallengePeakScRsp {
    #[prost(uint32, tag = "6")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8926)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TakeChallengePeakRewardCsReq {
    #[prost(uint32, repeated, tag = "7")]
    pub normal_reward_id_list: ::prost::alloc::vec::Vec<u32>,
    #[prost(uint32, tag = "12")]
    pub peak_group_id: u32,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ChallengePeakRewardGroup {
    #[prost(uint32, tag = "9")]
    pub reward_id: u32,
    #[prost(message, optional, tag = "13")]
    pub reward: ::core::option::Option<ItemList>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8904)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TakeChallengePeakRewardScRsp {
    #[prost(uint32, tag = "2")]
    pub retcode: u32,
    #[prost(uint32, tag = "4")]
    pub peak_group_id: u32,
    #[prost(message, repeated, tag = "14")]
    pub peak_reward_group_list: ::prost::alloc::vec::Vec<ChallengePeakRewardGroup>,
}

// Challenge Tierce (Starward Mode)
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct AvatarIdentifier {
    #[prost(uint32, tag = "3")]
    pub assist_uid: u32,
    #[prost(uint32, tag = "7")]
    pub id: u32,
    #[prost(enumeration = "AvatarType", tag = "13")]
    pub avatar_type: i32,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ChallengeTierceStageLineupInfo {
    #[prost(message, repeated, tag = "4")]
    pub lineup: ::prost::alloc::vec::Vec<AvatarIdentifier>,
    #[prost(uint32, tag = "6")]
    pub buff_id: u32,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ChallengeTierceChallengeInfo {
    #[prost(uint32, tag = "4")]
    pub stage_index: u32,
    #[prost(uint32, tag = "6")]
    pub challenge_id: u32,
    #[prost(bool, tag = "14")]
    pub is_single_stage: bool,
    #[prost(message, repeated, tag = "15")]
    pub lineup_list: ::prost::alloc::vec::Vec<LineupInfo>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8983)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StartChallengeTierceCsReq {
    #[prost(bool, tag = "5")]
    pub is_single_stage: bool,
    #[prost(uint32, tag = "10")]
    pub stage_index: u32,
    #[prost(message, repeated, tag = "12")]
    pub stage_info_list: ::prost::alloc::vec::Vec<ChallengeTierceStageLineupInfo>,
    #[prost(uint32, tag = "15")]
    pub challenge_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8973)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StartChallengeTierceScRsp {
    #[prost(message, optional, tag = "4")]
    pub challenge_tierce_info: ::core::option::Option<ChallengeTierceChallengeInfo>,
    #[prost(message, optional, tag = "9")]
    pub scene: ::core::option::Option<SceneInfo>,
    #[prost(uint32, tag = "12")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8978)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SetChallengeTierceLineupCsReq {
    #[prost(uint32, tag = "1")]
    pub challenge_id: u32,
    #[prost(message, repeated, tag = "15")]
    pub stage_info_list: ::prost::alloc::vec::Vec<ChallengeTierceStageLineupInfo>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8999)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetChallengeTierceLineupScRsp {
    #[prost(uint32, tag = "1")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8990)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct RestartChallengeTierceCsReq {}

#[derive(proto_derive::CmdID)]
#[cmdid(8977)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct RestartChallengeTierceScRsp {
    #[prost(uint32, tag = "8")]
    pub retcode: u32,
    #[prost(message, optional, tag = "15")]
    pub scene: ::core::option::Option<SceneInfo>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(8974)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct StartNextChallengeTierceCsReq {}

#[derive(proto_derive::CmdID)]
#[cmdid(8980)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StartNextChallengeTierceScRsp {
    #[prost(uint32, tag = "1")]
    pub retcode: u32,
    #[prost(message, optional, tag = "9")]
    pub scene: ::core::option::Option<SceneInfo>,
    #[prost(message, optional, tag = "13")]
    pub challenge_tierce_info: ::core::option::Option<ChallengeTierceChallengeInfo>,
}

// Challenge Reward Claiming
#[derive(proto_derive::CmdID)]
#[cmdid(1768)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct TakeChallengeRewardCsReq {
    #[prost(uint32, tag = "9")]
    pub group_id: u32,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TakenChallengeRewardInfo {
    #[prost(uint32, tag = "9")]
    pub star_count: u32,
    #[prost(message, optional, tag = "11")]
    pub reward: ::core::option::Option<ItemList>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(1764)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TakeChallengeRewardScRsp {
    #[prost(uint32, tag = "2")]
    pub group_id: u32,
    #[prost(uint32, tag = "13")]
    pub retcode: u32,
    #[prost(message, repeated, tag = "15")]
    pub taken_reward_list: ::prost::alloc::vec::Vec<TakenChallengeRewardInfo>,
}

// Client Pause & Prefs
#[derive(proto_derive::CmdID)]
#[cmdid(1441)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetClientPausedCsReq {
    #[prost(bool, tag = "8")]
    pub paused: bool,
}

#[derive(proto_derive::CmdID)]
#[cmdid(1430)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SetClientPausedScRsp {
    #[prost(uint32, tag = "1")]
    pub retcode: u32,
    #[prost(bool, tag = "15")]
    pub paused: bool,
}

#[derive(proto_derive::CmdID)]
#[cmdid(6160)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct UpdateServerPrefsCsReq {}

#[derive(proto_derive::CmdID)]
#[cmdid(6116)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct UpdateServerPrefsScRsp {
    #[prost(uint32, tag = "2")]
    pub server_prefs_id: u32,
    #[prost(uint32, tag = "9")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(183)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct QuitBattleScNotify {}

// NPC First Talk & Rewards
#[derive(proto_derive::CmdID)]
#[cmdid(2158)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct FinishFirstTalkNpcCsReq {
    #[prost(uint32, tag = "4")]
    pub npc_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2156)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct FinishFirstTalkNpcScRsp {
    #[prost(uint32, tag = "2")]
    pub npc_id: u32,
    #[prost(uint32, tag = "10")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2161)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct FinishFirstTalkByPerformanceNpcCsReq {
    #[prost(uint32, tag = "13")]
    pub performance_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2108)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct FinishFirstTalkByPerformanceNpcScRsp {
    #[prost(uint32, tag = "6")]
    pub retcode: u32,
    #[prost(uint32, tag = "10")]
    pub performance_id: u32,
    #[prost(message, optional, tag = "11")]
    pub reward: ::core::option::Option<ItemList>,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2183)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SelectInclinationTextCsReq {
    #[prost(uint32, tag = "4")]
    pub talk_sentence_id: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2115)]
#[derive(Clone, Copy, PartialEq, Eq, Hash, ::prost::Message)]
pub struct SelectInclinationTextScRsp {
    #[prost(uint32, tag = "11")]
    pub talk_sentence_id: u32,
    #[prost(uint32, tag = "15")]
    pub retcode: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2105)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TakeTalkRewardCsReq {
    #[prost(message, optional, tag = "7")]
    pub jakebegajna: ::core::option::Option<Vector>,
    #[prost(uint32, tag = "10")]
    pub mjalboeakme: u32,
}

#[derive(proto_derive::CmdID)]
#[cmdid(2175)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TakeTalkRewardScRsp {
    #[prost(uint32, tag = "12")]
    pub retcode: u32,
    #[prost(message, optional, tag = "13")]
    pub reward: ::core::option::Option<ItemList>,
    #[prost(uint32, tag = "15")]
    pub mjalboeakme: u32,
}





