mod authentication;
mod avatar;
mod battle;
mod chat;
mod gacha;
mod inventory;
mod lineup;
mod mail;
mod mission;
mod player;
mod scene;
mod jukebox;
mod activity;
mod challenge;
pub mod game_data;

use anyhow::Result;
use paste::paste;
use proto::*;

use super::PlayerSession;
use crate::net::NetPacket;

pub use authentication::*;
pub use avatar::*;
pub use battle::*;
pub use game_data::*;
pub use chat::*;
pub use gacha::*;
pub use inventory::*;
pub use lineup::*;
pub use mail::*;
pub use mission::*;
pub use player::*;
pub use scene::*;
pub use jukebox::*;
pub use activity::*;
pub use challenge::*;

macro_rules! dummy {
    ($($cmd:ident),* $(,)*) => {
        paste! {
            impl PlayerSession {
                pub const fn should_send_dummy_rsp(cmd_id: u16) -> bool {
                    match cmd_id {
                        $(
                            x if x == <proto::[<$cmd CsReq>] as proto::CmdID>::CMD_ID => true,
                        )*
                        _ => false,
                    }
                }

                pub async fn send_dummy_response(&mut self, req_id: u16) -> Result<()> {
                    let cmd_type = match req_id {
                        $(
                            x if x == <proto::[<$cmd CsReq>] as proto::CmdID>::CMD_ID => {
                                <proto::[<$cmd ScRsp>] as proto::CmdID>::CMD_ID
                            },
                        )*
                        _ => return Err(anyhow::anyhow!("Invalid request id {req_id:?}")),
                    };

                    self.send_raw(NetPacket {
                        cmd_type,
                        head: Vec::new(),
                        body: Vec::new(),
                    }).await?;

                    Ok(())
                }
            }
        }
    };
}

dummy! {
    GetPhoneData,
    QueryProductInfo,
    GetQuestData,
    GetQuestRecord,
    GetCurAssist,
    GetFightActivityData,
    GetMissionData,
    SyncClientResVersion,
    GetRaidInfo,
    GetNpcStatus,
    GetSecretKeyInfo,
    GetVideoVersionKey,
    GetCurBattleInfo,
    InteractProp,
    FinishTalkMission,
    GetRechargeGiftInfo,
    GetPreAvatarGrowthInfo,
    GetPreAvatarActivityList,
    GetFriendAssistList,
    B51RacingGetData,
    GetChallengeTierceData,
    GetChallengeTierceController,
    GetChallengePeakData,
    GetCurChallengePeak,
    SetPlayerInfo,
    GetActiveActivityData,
    GetActivityHotData,
    GetMaterialSubmitActivityData,
    GetMultipleDropInfo,
    GetPlayerReturnMultiDropInfo,
    GetAlleyInfo,
    GetStrongChallengeActivityData,
    ClockParkGetInfo,
    MusicRhythmData,
    GetTrackPhotoActivityData,
    GetSwordTrainingData,
    GetFightFestData,
    ChimeraGetData,
    ChimeraDuelGetData,
    ChenLingGetData,
    MarbleGetData,
    DiceCombatGetSystemData,
    GetHipplenData,
    FateRinGetData,
    ChooseDeliveryGetData,
    SpaceZooData,
    TravelBrochureGetData,
    GetMuseumInfo,
    GetTelevisionActivityData,
    GetBoxingClubInfo,
    GetFeverTimeActivityData,
    GetSummonActivityData,
    LimaoNewsGetData,
    TeamTowersGetData,
    VoracityInvasionGetData,
    GetDrinkMakerData,
    MatchThreeGetData,
    GetAetherDivideInfo,
    GetAetherDivideChallengeInfo,
    GetTreasureDungeonActivityData,
    HeliobusActivityData,
    GetStarFightData,
    EvolveBuildQueryInfo,
    GetHeartDialInfo,
    GetBattleCollegeData
}
