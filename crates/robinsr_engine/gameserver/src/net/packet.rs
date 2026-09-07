use anyhow::Result;
use paste::paste;
use tracing::Instrument;

use proto::*;

use super::PlayerSession;
use super::handlers::*;
use super::handlers::challenge;

const HEAD_MAGIC: u32 = 0x9D74C714;
const TAIL_MAGIC: u32 = 0xD7A152C8;

#[derive(Debug)]
pub struct NetOperation {
    pub head: u32,
    pub param1: u32,
    pub param2: u32,
    pub data: u32,
    pub tail: u32,
}

#[derive(Debug)]
pub struct NetPacket {
    pub cmd_type: u16,
    pub head: Vec<u8>,
    pub body: Vec<u8>,
}

impl From<NetPacket> for Vec<u8> {
    fn from(value: NetPacket) -> Self {
        let mut out = Self::new();

        out.extend(HEAD_MAGIC.to_be_bytes());
        out.extend(value.cmd_type.to_be_bytes());
        out.extend((value.head.len() as u16).to_be_bytes());
        out.extend((value.body.len() as u32).to_be_bytes());
        out.extend(value.head);
        out.extend(value.body);
        out.extend(TAIL_MAGIC.to_be_bytes());
        out
    }
}

impl From<&[u8]> for NetPacket {
    fn from(value: &[u8]) -> Self {
        assert_eq!(
            u32::from_be_bytes(value[0..4].try_into().unwrap()),
            HEAD_MAGIC
        );

        let cmd_type = u16::from_be_bytes(value[4..6].try_into().unwrap());

        let head_length = usize::from(u16::from_be_bytes(value[6..8].try_into().unwrap()));

        let body_length = u32::from_be_bytes(value[8..12].try_into().unwrap()) as usize;

        let head_start = 12;
        let head_end = head_start + head_length;
        let head = value[head_start..head_end].to_vec();

        let body_start = head_end;
        let body_end = body_start + body_length;
        let body = value[body_start..body_end].to_vec();

        assert_eq!(
            u32::from_be_bytes(value[body_end..body_end + 4].try_into().unwrap()),
            TAIL_MAGIC
        );

        Self {
            cmd_type,
            head,
            body,
        }
    }
}

impl From<&[u8]> for NetOperation {
    fn from(value: &[u8]) -> Self {
        Self {
            head: u32::from_be_bytes(value[..4].try_into().unwrap()),
            param1: u32::from_be_bytes(value[4..8].try_into().unwrap()),
            param2: u32::from_be_bytes(value[8..12].try_into().unwrap()),
            data: u32::from_be_bytes(value[12..16].try_into().unwrap()),
            tail: u32::from_be_bytes(value[16..20].try_into().unwrap()),
        }
    }
}

impl From<NetOperation> for Vec<u8> {
    fn from(value: NetOperation) -> Self {
        let mut buf = Self::with_capacity(20);
        buf.extend(value.head.to_be_bytes());
        buf.extend(value.param1.to_be_bytes());
        buf.extend(value.param2.to_be_bytes());
        buf.extend(value.data.to_be_bytes());
        buf.extend(value.tail.to_be_bytes());

        buf
    }
}

use std::collections::HashMap;
use std::sync::OnceLock;

static DYNAMIC_REQ_TO_RSP: OnceLock<HashMap<u16, u16>> = OnceLock::new();

pub fn get_dynamic_rsp_id(req_id: u16) -> Option<u16> {
    let map = DYNAMIC_REQ_TO_RSP.get_or_init(|| {
        let mut req_to_rsp = HashMap::new();

        // 1. Compiled CmdId.json from proto
        const CMD_ID_JSON: &str = include_str!("../../../proto/CmdId.json");
        if let Ok(val) = serde_json::from_str::<HashMap<String, u16>>(CMD_ID_JSON) {
            let mut name_to_id = HashMap::new();
            for (name, id) in &val {
                name_to_id.insert(name.clone(), *id);
            }
            for (name, req_id) in &val {
                if name.ends_with("CsReq") {
                    let base_name = &name[..name.len() - 5];
                    let rsp_name = format!("{base_name}ScRsp");
                    if let Some(&rsp_id) = name_to_id.get(&rsp_name) {
                        req_to_rsp.insert(*req_id, rsp_id);
                    }
                }
            }
        }

        // 2. Special prefixes & client queries
        req_to_rsp.insert(8110, 8116); // SwitchHandDataCsReq -> GetSwitchHandDataScRsp
        req_to_rsp.insert(1481, 1404); // EnterSectionCsReq -> EnterSectionScRsp

        // 3. Complete pearl-sr DummyCmdList
        let pearl_pairs: &[(u16, u16)] = &[
            (510, 520),   // GetBag
            (523, 568),   // GetMarkItemList
            (2905, 2975), // GetPlayerBoardData
            (2914, 2981), // GetCurAssist
            (705, 775),   // GetAllLineupData
            (6105, 6175), // GetAllServerPrefsData
            // (1205, 1275) -> FinishTalkMission handled explicitly
            (1805, 1875), // GetRogueInfo
            (5603, 5674), // GetRogueEndlessActivityData
            (5488, 5410), // ChessRogueQuery
            (6011, 6081), // RogueTournQuery
            (4005, 4075), // DailyFirstMeetPam
            (5705, 5775), // GetBattleCollegeData
            (2705, 2775), // GetNpcStatus
            (505, 575),   // GetSecretKeyInfo
            (6305, 6375), // GetHeartDialInfo
            (71, 100),    // GetVideoVersionKey
            (5805, 5875), // HeliobusActivityData
            (4805, 4875), // GetAetherDivideInfo
            (6805, 6875), // GetMapRotationData
            (4505, 4575), // PlayerReturnInfoQuery
            (74, 91),     // GetLevelRewardTakenList
            (1210, 1269), // GetMainMissionCustomValue
            (2603, 2697), // GetMaterialSubmitActivityData
            (6062, 6090), // RogueTournGetCurRogueCocoonInfo
            (6022, 6057), // RogueMagicQuery
            (7505, 7575), // MusicRhythmData
            (2910, 2969), // GetFriendApplyListInfo
            (3910, 3969), // GetChatFriendHistory
            (2992, 2937), // GetFriendLoginInfo
            (2972, 2950), // GetFriendDevelopmentInfo
            (2945, 2928), // GetFriendRecommendListInfo
            (8110, 8116), // GetSwitchHandData
            (7605, 7675), // RogueArcadeGetInfo
            (8005, 8075), // TrainPartyGetData
            (41, 16),     // QueryProductInfo
            (8125, 8123), // GetPamSkinData
            (506, 558),   // GetQuestRecord
            (2605, 2675), // GetDailyActiveInfo
            (5412, 5440), // GetChessRogueNousStoryInfo
            (3605, 3675), // GetFightActivityData
            (3005, 3075), // GetStarFightData
            (4605, 4675), // GetMultipleDropInfo
            (4705, 4775), // GetPlayerReturnMultiDropInfo
            (4105, 4175), // GetShareData
            (4405, 4475), // GetTreasureDungeonActivityData
            (4858, 4820), // GetAetherDivideChallengeInfo
            (6905, 6975), // GetOfferingInfo
            (7205, 7275), // ClockParkGetInfo
            (7405, 7475), // GetTrackPhotoActivityData
            (7305, 7375), // GetSwordTrainingData
            (7288, 7210), // GetFightFestData
            (5305, 5375), // DifficultyAdjustmentGetData
            (6705, 6775), // SpaceZooData
            (2505, 2575), // GetExpeditionData
            (6405, 6475), // TravelBrochureGetData
            (6505, 6575), // RaidCollectionData
            (2205, 2275), // GetRaidInfo
            (2608, 2645), // GetLoginActivity
            (2628, 2650), // GetTrialActivityData
            (3105, 3175), // GetJukeboxData
            (4305, 4375), // GetMuseumInfo
            (7005, 7075), // GetTelevisionActivityData
            (4012, 4040), // GetTrainVisitorRegister
            (4205, 4275), // GetBoxingClubInfo
            (3705, 3775), // TextJoinQuery
            (3988, 3910), // GetLoginChatInfo
            (7105, 7175), // GetFeverTimeActivityData
            (7388, 7310), // GetSummonActivityData
            (8145, 8128), // TarotBookGetData
            (528, 550),   // GetMarkChest
            (2710, 2769), // GetNpcMessageGroup
            (2210, 2269), // GetAllSaveRaid
            (2988, 2919), // GetAssistHistory
            (512, 540),   // GetRechargeGiftInfo
            (562, 590),   // GetRechargeBenefitInfo
            (545, 528),   // RelicSmartWearGetPlan
            (534, 525),   // RelicSmartWearGetPinRelic
            (2934, 2925), // SetGrowthTargetAvatar
            (7705, 7775), // FateQuery
            (7805, 7875), // GetPlanetFesData
            (7905, 7975), // ParkourGetData
            (7012, 7040), // GetMonopolyInfo
            (7034, 7025), // MonopolyGetRegionProgress
            (7088, 7010), // GetMbtiReport
            (7188, 7110), // GetDrinkMakerData
            (7212, 7240), // GetData
            (7412, 7440), // MarbleGetData
            (2634, 2625), // GetPreAvatarActivityList
            (34, 25),     // GetUnreleasedBlockInfo
            (2962, 2990), // GetAssistList
            (2922, 2957), // GetFriendAssistList
            (8205, 8275), // B51RacingGetData
        ];
        for &(req, rsp) in pearl_pairs {
            req_to_rsp.insert(req, rsp);
        }

        tracing::info!("Initialized {} request->response dummy pairs", req_to_rsp.len());
        req_to_rsp
    });

    map.get(&req_id).copied()
}

macro_rules! trait_handler {
    ($($name:tt;)*) => {
        pub trait CommandHandler {
            $(
                paste! {
                    async fn [<on_$name:snake _cs_req>](session: &mut PlayerSession, request: &[<$name CsReq>]) -> Result<()> {
                        let mut response = proto::[<$name ScRsp>]::default();
                        let _ = [<on_$name:snake _cs_req>](session, request, &mut response).await;
                        session.send(response).await?;

                        Ok(())
                    }
                }
            )*

            async fn on_message(session: &mut PlayerSession, cmd_id: u16, payload: Vec<u8>) -> Result<()> {
                use ::prost::Message;
                if PlayerSession::should_send_dummy_rsp(cmd_id) {
                    session.send_dummy_response(cmd_id).await?;
                    return Ok(());
                }


                match cmd_id {
                    1711 => {
                        let mut buf = &payload[..];
                        let mut group_id = 100u32;
                        while !buf.is_empty() {
                            if let Ok(tag) = prost::encoding::decode_varint(&mut buf) {
                                let field_number = tag >> 3;
                                let wire_type = tag & 0x7;
                                if field_number == 12 && wire_type == 0 {
                                    if let Ok(val) = prost::encoding::decode_varint(&mut buf) {
                                        group_id = val as u32;
                                    }
                                    break;
                                } else if wire_type == 0 {
                                    let _ = prost::encoding::decode_varint(&mut buf);
                                } else {
                                    break;
                                }
                            } else {
                                break;
                            }
                        }

                        let mut body = Vec::new();
                        // Tag 9: group_id
                        body.push(0x48);
                        prost::encoding::encode_varint(group_id as u64, &mut body);
                        // Tag 15: retcode 0
                        body.extend_from_slice(&[0x78, 0x00]);

                        if (2000..3000).contains(&group_id) {
                            // Pure Fiction: Tag 8 = challenge_story (ChallengeStoryStatistics)
                            // EIKPHEMHIOH: score_id=tag 10 (80000), level=tag 11 (4)
                            let mut eik = Vec::new();
                            eik.push(0x50); // tag 10
                            prost::encoding::encode_varint(80000, &mut eik);
                            eik.push(0x58); // tag 11
                            prost::encoding::encode_varint(4, &mut eik);

                            // ChallengeStoryStatistics: PPBHLLOJNEK=tag 6, record_id=tag 7 (1)
                            let mut css = Vec::new();
                            css.push(0x32); // tag 6
                            prost::encoding::encode_varint(eik.len() as u64, &mut css);
                            css.extend_from_slice(&eik);
                            css.push(0x38); // tag 7
                            prost::encoding::encode_varint(1, &mut css);

                            body.push(0x42); // tag 8 (len-delimited)
                            prost::encoding::encode_varint(css.len() as u64, &mut body);
                            body.extend_from_slice(&css);
                        } else if (1000..2000).contains(&group_id) {
                            // Memory of Chaos: Tag 2 = challenge_default (ChallengeStatistics)
                            // ADKJKMKBFDC: round_count=tag 2 (20), level=tag 3 (12)
                            let mut adk = Vec::new();
                            adk.push(0x10); // tag 2
                            prost::encoding::encode_varint(20, &mut adk);
                            adk.push(0x18); // tag 3
                            prost::encoding::encode_varint(12, &mut adk);

                            // ChallengeStatistics: PPBHLLOJNEK=tag 6, record_id=tag 10 (1)
                            let mut cs = Vec::new();
                            cs.push(0x32); // tag 6
                            prost::encoding::encode_varint(adk.len() as u64, &mut cs);
                            cs.extend_from_slice(&adk);
                            cs.push(0x50); // tag 10
                            prost::encoding::encode_varint(1, &mut cs);

                            body.push(0x12); // tag 2 (len-delimited)
                            prost::encoding::encode_varint(cs.len() as u64, &mut body);
                            body.extend_from_slice(&cs);
                        } else if group_id >= 3000 {
                            // Apocalyptic Shadow: Tag 11 = challenge_boss (ChallengeBossStatistics)
                            // AANLJBLOOFO: score_id=tag 10 (8000), level=tag 3 (4)
                            let mut aan = Vec::new();
                            aan.push(0x50); // tag 10
                            prost::encoding::encode_varint(8000, &mut aan);
                            aan.push(0x18); // tag 3
                            prost::encoding::encode_varint(4, &mut aan);

                            // ChallengeBossStatistics: PPBHLLOJNEK=tag 1, record_id=tag 14 (1)
                            let mut cbs = Vec::new();
                            cbs.push(0x0A); // tag 1
                            prost::encoding::encode_varint(aan.len() as u64, &mut cbs);
                            cbs.extend_from_slice(&aan);
                            cbs.push(0x70); // tag 14
                            prost::encoding::encode_varint(1, &mut cbs);

                            body.push(0x5A); // tag 11 (len-delimited)
                            prost::encoding::encode_varint(cbs.len() as u64, &mut body);
                            body.extend_from_slice(&cbs);
                        }

                        session.send_raw(NetPacket {
                            cmd_type: 1736,
                            head: Vec::new(),
                            body,
                        }).await?;
                        Ok(())
                    }
                    8909 => {
                        session.send_raw(NetPacket {
                            cmd_type: 8923,
                            head: Vec::new(),
                            body: vec![0x60, 0x00], // tag 12: retcode = 0
                        }).await?;
                        Ok(())
                    }
                    8924 | 8968 => {
                        session.send_raw(NetPacket {
                            cmd_type: 8920,
                            head: Vec::new(),
                            body: vec![0x10, 0x00], // tag 2: retcode = 0
                        }).await?;
                        Ok(())
                    }
                    8935 => {
                        session.send_raw(NetPacket { cmd_type: 8915, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    8917 => {
                        session.send_raw(NetPacket { cmd_type: 8929, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    8933 => {
                        session.send_raw(NetPacket { cmd_type: 8906, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    8919 => {
                        session.send_raw(NetPacket { cmd_type: 8948, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    8910 => {
                        session.send_raw(NetPacket { cmd_type: 8921, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    8975 => {
                        session.send_raw(NetPacket { cmd_type: 8992, head: Vec::new(), body: vec![0x40, 0x00] }).await?;
                        Ok(())
                    }
                    8977 => {
                        session.send_raw(NetPacket { cmd_type: 8999, head: Vec::new(), body: vec![0x50, 0x00] }).await?;
                        Ok(())
                    }
                    2966 => {
                        session.send_raw(NetPacket { cmd_type: 2955, head: Vec::new(), body: vec![0x30, 0x00] }).await?;
                        Ok(())
                    }
                    2916 => {
                        session.send_raw(NetPacket { cmd_type: 2906, head: Vec::new(), body: vec![0x18, 0x00] }).await?;
                        Ok(())
                    }
                    2919 => {
                        session.send_raw(NetPacket { cmd_type: 2928, head: Vec::new(), body: vec![0x48, 0x00] }).await?;
                        Ok(())
                    }
                    740 => {
                        session.send_raw(NetPacket { cmd_type: 733, head: Vec::new(), body: vec![0x58, 0x00] }).await?;
                        Ok(())
                    }
                    1748 => {
                        session.send_raw(NetPacket { cmd_type: 1745, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    1765 => {
                        session.send_raw(NetPacket { cmd_type: 1730, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    1742 => {
                        session.send_raw(NetPacket { cmd_type: 1772, head: Vec::new(), body: vec![0x08, 0x00] }).await?;
                        Ok(())
                    }
                    1738 => {
                        session.send_raw(NetPacket { cmd_type: 1748, head: Vec::new(), body: Vec::new() }).await?;
                        Ok(())
                    }
                    1705 | 1793 => {
                        challenge::handle_start_challenge(session, &payload).await
                    }
                    8983 | 8988 => {
                        challenge::handle_start_challenge_tierce(session, &payload).await
                    }
                    8979 => {
                        challenge::handle_get_challenge_tierce_data(session).await
                    }
                    8978 => {
                        challenge::handle_set_challenge_tierce_lineup(session, &payload).await
                    }
                    8974 => {
                        challenge::handle_start_next_challenge_tierce(session).await
                    }
                    8990 => {
                        challenge::handle_restart_challenge_tierce(session).await
                    }
                    8934 => {
                        challenge::handle_get_challenge_peak_data(session).await
                    }
                    8920 => {
                        challenge::handle_start_challenge_peak(session, &payload).await
                    }
                    8918 => {
                        challenge::handle_set_challenge_peak_mob_lineup_avatar(session, &payload).await
                    }
                    8940 => {
                        challenge::handle_set_challenge_peak_boss_hard_mode(session, &payload).await
                    }
                    8947 => {
                        challenge::handle_restart_challenge_peak(session).await
                    }
                    8926 => {
                        challenge::handle_take_challenge_peak_reward(session, &payload).await
                    }
                    1760 | 1788 | 1781 => {
                        challenge::handle_leave_challenge(session).await
                    }
                    8998 => {
                        challenge::handle_leave_challenge_tierce(session).await
                    }
                    8991 => {
                        session.send(GetChallengeTierceControllerScRsp { retcode: 0 }).await?;
                        Ok(())
                    }
                    8929 => {
                        challenge::handle_leave_challenge_peak(session).await
                    }
                    8948 => {
                        session.send(GetCurChallengePeakScRsp { retcode: 0 }).await?;
                        Ok(())
                    }
                    1713 => {
                        challenge::handle_get_cur_challenge(session).await
                    }
                    1768 => {
                        challenge::handle_take_challenge_reward(session, &payload).await
                    }
                    1739 => {
                        // ChallengeLineupNotify
                        Ok(())
                    }
                    188 => {
                        session.send_raw(NetPacket {
                            cmd_type: 181,
                            head: Vec::new(),
                            body: vec![0x50, 0x00],
                        }).await?;
                        Ok(())
                    }
                    // Tutorial handlers (finish all tutorials to eliminate guide popups)
                    1605 => tutorial::handle_get_tutorial_guide(session).await,
                    1634 => tutorial::handle_get_tutorial(session).await,
                    1658 => tutorial::handle_unlock_tutorial_guide(session, &payload).await,
                    1660 => tutorial::handle_unlock_tutorial(session, &payload).await,
                    1683 => tutorial::handle_finish_tutorial(session).await,
                    1642 => tutorial::handle_finish_tutorial_guide(session).await,

                    // Scene handlers
                    1439 => Ok(()), // SceneUpdatePositionVersionNotify (ignore notify from client)
                    1463 => scene::handle_enter_scene(session, &payload).await,

                    // Mission & Dialogue handlers
                    1205 => scene::handle_finish_talk_mission(session, &payload).await,
                    2160 => scene::handle_get_first_talk_npc(session, &payload).await,
                    2142 => scene::handle_get_first_talk_by_performance_npc(session, &payload).await,
                    2158 => scene::handle_finish_first_talk_npc(session, &payload).await,
                    2161 => scene::handle_finish_first_talk_by_performance_npc(session, &payload).await,
                    2134 => scene::handle_get_npc_taken_reward(session, &payload).await,
                    2183 => scene::handle_select_inclination_text(session, &payload).await,
                    2105 => scene::handle_take_talk_reward(session, &payload).await,
                    $(
                        cmd_id if cmd_id == paste! { <proto::[<$name CsReq>] as proto::CmdID>::CMD_ID } => {
                            let body = paste! { proto::[<$name CsReq>]::decode(&mut &payload[..])? };
                            paste! {
                                Self::[<on_$name:snake _cs_req>](session, &body)
                                    .instrument(tracing::info_span!(stringify!([<on_$name:snake>]), cmd_id = cmd_id))
                                    .await
                            }
                        }
                    )*
                    _ => {
                        if let Some(rsp_id) = get_dynamic_rsp_id(cmd_id) {
                            tracing::info!("Dynamic auto-response for opcode: {cmd_id} -> {rsp_id}");
                            session.send_raw(NetPacket {
                                cmd_type: rsp_id,
                                head: Vec::new(),
                                body: Vec::new(),
                            }).await?;
                        } else {
                            tracing::warn!("Unknown command ID: {cmd_id} (len={})", payload.len());
                        }
                        Ok(())
                    },
                }
            }
        }
    };
}

trait_handler! {
    PlayerGetToken;
    PlayerLogin;
    GetMissionStatus;
    GetBasicInfo;
    GetAvatarData;
    GetAllLineupData;
    GetCurLineupData;
    GetCurSceneInfo;
    PlayerHeartBeat;
    SetAvatarEnhancedId;
    TakePromotionReward;

    // Entity move (dummy!)
    SceneEntityMove;

    // Inventory (dummy!)
    GetBag;
    GetArchiveData;
    DressAvatar;
    TakeOffEquipment;
    DressRelicAvatar;
    TakeOffRelic;
    RankUpAvatar;

    // Chat (dummy!)
    SendMsg;
    GetPrivateChatHistory;
    GetFriendListInfo;
    GetFriendLoginInfo;

    // In-game lineup
    JoinLineup;
    ChangeLineupLeader;
    ReplaceLineup;
    QuitLineup;

    // Battle
    StartCocoonStage;
    PveBattleResult;
    SceneCastSkill;
    QuickStartCocoonStage;
    SceneEnterStage;

    // Teleport
    GetEnteredScene;
    GetSceneMapInfo;

    // Optional
    GetMail;
    GetGachaInfo;
    DoGacha;
    PlayerLoginFinish;
    GetBigDataAllRecommend;
    GetPlayerBoardData;
    GetPhoneData;
    SetClientPaused;
    UpdateServerPrefs;

    // Avatar Path & Skin
    SetAvatarPath;
    DressAvatarSkin;
    TakeOffAvatarSkin;

    // Challenge & Activity
    GetChallenge;
    GetCurChallenge;
    GetActivityScheduleConfig;

    // Activity
    GetDailyActiveInfo;
    GetLoginActivity;
    GetTrialActivityData;
    GetExpeditionData;
    GetLevelRewardTakenList;
}
