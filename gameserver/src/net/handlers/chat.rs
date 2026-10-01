use common::{
    resources::{ENDGAME_CHALLENGE_CONFIG, ENDGAME_STAGE_CONFIG},
    structs::{BattleBuffJson, BattleType, Monster, MultiPathAvatar},
};
use proto::chat_data::ExtendType;
use std::path::Path;
use tokio::fs;

use crate::{
    net::PlayerSession,
    util::{self, cur_timestamp_ms},
};

use super::*;

const SERVER_UID: u32 = 727;
const SERVER_HEAD_ICON: u32 = 201511;
const SERVER_CHAT_BUBBLE_ID: u32 = 220005;
const SERVER_CHAT_HISTORY: &[&str] = &[

    "'lua {path_to_lua_script}' execute lua script",
    "'sw {on/off}' enable/disable silver wolf global buff",
    "'castorice {on/off}' enable/disable castorice global buff",
    "'sync' เมื่ออัพไฟล์ json แล้วให้ใช้คำสั่งนี้เพื่อซิงค์ข้อมูล",
    "'mc {mc_id}' mc_id ใสไอดี 8001 ถึง 8008 (สำหรับตัวละครหลัก) หรือ 1001 ถึง 1006 (สำหรับตัวละครเสริม) หรือ 1101 ถึง 1108 (สำหรับตัวละครพิเศษ) ตัวอย่างเช่น 'mc 8001' จะเปลี่ยนตัวละครหลักเป็น 8001 ใช้สำสั่ง mc 8009",
    "'march {march_id}' march_id ใส่ไอดี 1001 or 1224 (สำหรับตัวละครหลัก) หรือ 1002 ถึง 1006 (สำหรับตัวละครเสริม) หรือ 1101 ถึง 1108 (สำหรับตัวละครพิเศษ) หรือ 1224 (สำหรับตัวละครพิเศษ)",
    "'eg <challenge_id> <node: 1|2>' ตั้งค่าห้อง Endgame ด้วยศัตรูและคลื่นตาม config เกม แล้วเข้า Calyx เพื่อเริ่มสู้",
    "'eg off' ปิดการบันทึกผล Endgame",
    "available commands:",
    "visit srtools.neonteam.dev to configure the PS! (you configure relics, equipment, monsters from there)",
];

pub async fn on_get_friend_login_info_cs_req(
    _session: &mut PlayerSession,
    _req: &GetFriendLoginInfoCsReq,
    res: &mut GetFriendLoginInfoScRsp,
) {
    res.black_uid_list = vec![SERVER_UID];
    res.friend_uid_list = vec![SERVER_UID];
}

pub async fn on_get_friend_list_info_cs_req(
    _session: &mut PlayerSession,
    _req: &GetFriendListInfoCsReq,
    res: &mut GetFriendListInfoScRsp,
) {
    res.friend_list = vec![FriendSimpleInfo {
        remark_name: String::from("Aeon ★ Aha"),
        player_info: Some(PlayerSimpleInfo {
            uid: SERVER_UID,
            platform: PlatformType::Pc.into(),
            online_status: FriendOnlineStatus::Online.into(),
            head_icon: SERVER_HEAD_ICON,
            chat_bubble_id: SERVER_CHAT_BUBBLE_ID,
            level: 67,
            nickname: String::from("Server"),
            signature: String::from("GAY"),
            ..Default::default()
        }),
        is_marked: true,
        create_time: 0,
        ..Default::default()
    }];
}

pub async fn on_get_private_chat_history_cs_req(
    _session: &mut PlayerSession,
    req: &GetPrivateChatHistoryCsReq,
    res: &mut GetPrivateChatHistoryScRsp,
) {
    let cur_time = cur_timestamp_ms();
    res.chat_message_list = SERVER_CHAT_HISTORY
        .iter()
        .map(|text| ChatMessageData {
            create_time: cur_time,
            ckhpffenobe: Some(Eknabklpeel {
                kpobmnlklok: 1,
                role_id: SERVER_UID,
            }),
            bkoalkhdlob: Some(Eknabklpeel {
                kpobmnlklok: 1,
                role_id: SERVER_UID,
            }),
            message_datas: vec![MessageChatData {
                message_type: 1,
                chat_data: Some(ChatData {
                    extend_type: Some(ExtendType::MessageText(text.to_string())),
                }),
            }],
            ..Default::default()
        })
        .collect();
    res.target_side = req.target_side;
    res.contact_side = SERVER_UID;
}

pub async fn on_send_msg_cs_req(
    session: &mut PlayerSession,
    body: &SendMsgCsReq,
    _res: &mut SendMsgScRsp,
) {
    let Some(json) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return;
    };

    let msg = body
        .message_datas
        .as_ref()
        .and_then(|x| x.chat_data.as_ref())
        .and_then(|x| x.extend_type.as_ref())
        .and_then(|x| match x {
            ExtendType::MessageText(s) => Some(s.as_str()),
            _ => Option::<&str>::None,
        })
        .unwrap_or("");

    if let Some((cmd, args)) = parse_command(msg) {
        match cmd {
            "sync" => {
                let _ = session.sync_player().await;
                session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        String::from("Inventory Synced"),
                    ))
                    .await
                    .unwrap();
            }
            "sw" | "castorice" => {
                let status = args.first().unwrap_or(&"on").to_lowercase();
                let enabled = match status.as_str() {
                    "on" | "1" | "true" => true,
                    "off" | "0" | "false" => false,
                    _ => true,
                };

                if cmd == "sw" {
                    json.enable_sw_global = Some(enabled);
                } else {
                    json.enable_castorice_global = Some(enabled);
                }

                json.save_persistent().await;

                session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        format!(
                            "{} Global Buff: {}",
                            if cmd == "sw" { "SW" } else { "Castorice" },
                            if enabled { "Enabled" } else { "Disabled" }
                        ),
                    ))
                    .await
                    .unwrap();
            }
            "mc" => {
                let mc = MultiPathAvatar::from(
                    args.first()
                        .unwrap_or(&"")
                        .parse::<u32>()
                        .unwrap_or(json.main_character as u32),
                );

                json.main_character = mc;
                json.save_persistent().await;

                session
                    .send(AvatarPathChangedNotify {
                        base_avatar_id: 8001,
                        cur_multi_path_avatar_type: mc as i32,
                    })
                    .await
                    .unwrap();

                let _ = session.sync_player().await;

                session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        format!("Success change mc to {mc:#?}"),
                    ))
                    .await
                    .unwrap();
            }
            "march" => {
                let mut march_type = MultiPathAvatar::from(
                    args.first()
                        .unwrap_or(&"")
                        .parse::<u32>()
                        .unwrap_or(json.march_type as u32),
                );

                if march_type != MultiPathAvatar::MarchPreservation
                    && march_type != MultiPathAvatar::MarchHunt
                {
                    march_type = MultiPathAvatar::MarchHunt
                }

                json.march_type = march_type;
                json.save_persistent().await;

                session
                    .send(AvatarPathChangedNotify {
                        base_avatar_id: 1001,
                        cur_multi_path_avatar_type: march_type as i32,
                    })
                    .await
                    .unwrap();

                session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        format!("Success change march to {march_type:#?}"),
                    ))
                    .await
                    .unwrap();
            }
            "eg" => {
                let reply = if args.first().copied() == Some("off") {
                    json.battle_config.battle_type = BattleType::Default;
                    json.battle_config.challenge_id = None;
                    json.battle_config.challenge_group_id = None;
                    String::from("Endgame mode disabled; current stage and enemies were kept.")
                } else if args.len() != 2 {
                    String::from("Usage: eg <challenge_id> <node: 1|2>")
                } else {
                    let challenge_id = args[0].parse::<u32>().ok();
                    let node = args[1].parse::<u8>().ok();

                    match (challenge_id, node) {
                        (Some(challenge_id), Some(node @ (1 | 2))) => {
                            let Some(challenge) = ENDGAME_CHALLENGE_CONFIG.get(&challenge_id) else {
                                let message = format!("Unknown Endgame challenge ID {challenge_id}.");
                                session
                                    .send(create_send_message(
                                        25,
                                        SERVER_UID,
                                        body.message_datas
                                            .as_ref()
                                            .map(|v| v.message_type)
                                            .unwrap_or_default(),
                                        body.chat_type,
                                        message,
                                    ))
                                    .await
                                    .unwrap();
                                return;
                            };

                            let event_ids = if node == 1 {
                                &challenge.event_id_list1
                            } else {
                                &challenge.event_id_list2
                            };
                            let Some(stage_id) = event_ids.last() else {
                                let message = format!(
                                    "Challenge {challenge_id} has no configured node {node}."
                                );
                                session
                                    .send(create_send_message(
                                        25,
                                        SERVER_UID,
                                        body.message_datas
                                            .as_ref()
                                            .map(|v| v.message_type)
                                            .unwrap_or_default(),
                                        body.chat_type,
                                        message,
                                    ))
                                    .await
                                    .unwrap();
                                return;
                            };
                            let Some(stage) = ENDGAME_STAGE_CONFIG.get(stage_id) else {
                                let message = format!(
                                    "No battle stage config for challenge {challenge_id}, node {node}."
                                );
                                session
                                    .send(create_send_message(
                                        25,
                                        SERVER_UID,
                                        body.message_datas
                                            .as_ref()
                                            .map(|v| v.message_type)
                                            .unwrap_or_default(),
                                        body.chat_type,
                                        message,
                                    ))
                                    .await
                                    .unwrap();
                                return;
                            };

                            let battle_type = if challenge_id >= 30_000 {
                                BattleType::AS
                            } else if challenge_id >= 20_000 {
                                BattleType::PF
                            } else {
                                BattleType::Moc
                            };
                            json.battle_config.battle_type = battle_type.clone();
                            json.battle_config.challenge_id = Some(challenge_id);
                            json.battle_config.challenge_group_id = Some(challenge.group_id);
                            json.battle_config.stage_id = stage.stage_id;
                            json.battle_config.cycle_count = if battle_type == BattleType::PF {
                                4
                            } else {
                                30
                            };
                            json.battle_config.monsters = stage
                                .monster_list
                                .iter()
                                .map(|wave| {
                                    wave.iter()
                                        .map(|monster_id| Monster {
                                            level: stage.level,
                                            monster_id: *monster_id,
                                            max_hp: 0,
                                        })
                                        .collect()
                                })
                                .collect();
                            json.battle_config.blessings = vec![BattleBuffJson {
                                level: 1,
                                id: challenge.maze_buff_id,
                                ..Default::default()
                            }];
                            format!(
                                "Configured {:?} challenge {} group {} node {} (stage {}, level {}, {} waves). Enter a Calyx to start.",
                                battle_type,
                                challenge_id,
                                challenge.group_id,
                                node,
                                stage.stage_id,
                                stage.level,
                                stage.monster_list.len()
                            )
                        }
                        _ => String::from("Usage: eg <challenge_id> <node: 1|2>"),
                    }
                };

                session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        reply,
                    ))
                    .await
                    .unwrap();
            }
            "lua" => {
                let path = Path::new(args.first().unwrap_or(&""));

                if !path.is_file() {
                    session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            format!("File {path:?} does not exist!"),
                        ))
                        .await
                        .unwrap();
                }

                let data = match fs::read(&path).await {
                    Ok(file) => file,
                    Err(err) => {
                        session
                            .send(create_send_message(
                                25,
                                SERVER_UID,
                                body.message_datas
                                    .as_ref()
                                    .map(|v| v.message_type)
                                    .unwrap_or_default(),
                                body.chat_type,
                                format!("Failed to read file: {err:?}"),
                            ))
                            .await
                            .unwrap();

                        return;
                    }
                };

                session
                    .send(ClientDownloadDataScNotify {
                        download_data: Some(ClientDownloadData {
                            version: 51,
                            time: util::cur_timestamp_ms() as i64,
                            data,
                            ..Default::default()
                        }),
                    })
                    .await
                    .unwrap();

                session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        format!("Executed {path:?}"),
                    ))
                    .await
                    .unwrap();
            }
            _ => {}
        }
    }
}

fn parse_command(command: &str) -> Option<(&str, Vec<&str>)> {
    let parts: Vec<&str> = command.split_whitespace().collect();

    if parts.is_empty() {
        return Option::None;
    }

    Some((parts[0], parts[1..].to_vec()))
}

fn create_send_message(
    to: u32,
    from: u32,
    message_type: i32,
    chat_type: i32,
    msg: String,
) -> RevcMsgScNotify {
    RevcMsgScNotify {
        chat_type,
        pffpfkoglpo: to,
        recv_message_data: Some(ChatMessageData {
            create_time: cur_timestamp_ms(),
            ckhpffenobe: Some(Eknabklpeel {
                kpobmnlklok: 1,
                role_id: from,
            }),
            bkoalkhdlob: Some(Eknabklpeel {
                kpobmnlklok: 1,
                role_id: from,
            }),
            message_datas: vec![MessageChatData {
                message_type,
                chat_data: Some(ChatData {
                    extend_type: Some(chat_data::ExtendType::MessageText(msg)),
                }),
            }],
            ..Default::default()
        }),
    }
}
