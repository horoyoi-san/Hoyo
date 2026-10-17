use common::{
    resources::{
        ENDGAME_CHALLENGE_CONFIG, ENDGAME_STAGE_CONFIG, GAME_RES, MAP_ENTRANCE_CONFIG,
        MAZE_PLANE_CONFIG,
    },
    structs::{BattleBuffJson, BattleType, Monster, MultiPathAvatar, Position},
};
use proto::{
    chat_data::ExtendType, scene_entity_info::Entity, scene_entity_refresh_info::RefreshType,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
};
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
    "'ex {on/off}' เปิด/ปิด EX RANK ระหว่างต่อสู้ (ตัวละครที่ปลดล็อกแล้ว)",
    "'sw {on/off}' enable/disable silver wolf global buff",
    "'castorice {on/off}' enable/disable castorice global buff",
    "'sync' เมื่ออัพไฟล์ json แล้วให้ใช้คำสั่งนี้เพื่อซิงค์ข้อมูล",
    "'mc {mc_id}' mc_id ใสไอดี 8001 ถึง 8008 (สำหรับตัวละครหลัก) หรือ 1001 ถึง 1006 (สำหรับตัวละครเสริม) หรือ 1101 ถึง 1108 (สำหรับตัวละครพิเศษ) ตัวอย่างเช่น 'mc 8001' จะเปลี่ยนตัวละครหลักเป็น 8001 ใช้สำสั่ง mc 8009",
    "'march {march_id}' march_id ใส่ไอดี 1001 or 1224 (สำหรับตัวละครหลัก) หรือ 1002 ถึง 1006 (สำหรับตัวละครเสริม) หรือ 1101 ถึง 1108 (สำหรับตัวละครพิเศษ) หรือ 1224 (สำหรับตัวละครพิเศษ)",
    "'eg <challenge_id> <node: 1|2>' ตั้งค่าห้อง Endgame ด้วยศัตรูและคลื่นตาม config เกม แล้วเข้า Calyx เพื่อเริ่มสู้",
    "'eg off' ปิดการบันทึกผล Endgame",
    "'spawn/s <monster_id>' เสกมอนสเตอร์ไอดีที่ระบุใกล้ตัวในฉากปัจจุบัน แล้วโจมตีเพื่อเริ่มต่อสู้",
    "'sc' ลบมอนที่เสกในฉากปัจจุบัน และล้างข้อมูลมอนที่เสกซึ่งบันทึกไว้",
    "available commands:",
    "visit srtools.neonteam.dev to configure the PS! (you configure relics, equipment, monsters from there)",
];

fn position_distance_squared(target: &Position, x: i32, y: i32, z: i32) -> i128 {
    let dx = i128::from(target.x) - i128::from(x);
    let dy = i128::from(target.y) - i128::from(y);
    let dz = i128::from(target.z) - i128::from(z);
    dx * dx + dy * dy + dz * dz
}

fn nearest_scene_group_context(
    entry_id: u32,
    plane_id: u32,
    floor_id: u32,
    position: &Position,
) -> Option<(u32, u32, u32)> {
    let scenes = GAME_RES.level_output_configs.get(&entry_id)?;
    let scene_key = format!("P{plane_id}_F{floor_id}");
    let scene = scenes.get(&scene_key)?;

    let nearest_monster = scene
        .scenes
        .iter()
        .flat_map(|(group_id, group)| {
            group.monsters.iter().map(move |entity| {
                (
                    *group_id,
                    entity.inst_id,
                    entity.event_id,
                    position_distance_squared(position, entity.pos.x, entity.pos.y, entity.pos.z),
                )
            })
        })
        .min_by_key(|(_, _, _, distance)| *distance);

    if let Some((group_id, inst_id, event_id, _)) = nearest_monster {
        return Some((group_id, inst_id, event_id));
    }

    scene
        .scenes
        .iter()
        .flat_map(|(group_id, group)| {
            group
                .npcs
                .iter()
                .map(move |entity| {
                    (
                        *group_id,
                        entity.inst_id,
                        entity.pos.x,
                        entity.pos.y,
                        entity.pos.z,
                    )
                })
                .chain(group.props.iter().map(move |entity| {
                    (
                        *group_id,
                        entity.inst_id,
                        entity.pos.x,
                        entity.pos.y,
                        entity.pos.z,
                    )
                }))
        })
        .min_by_key(|(_, _, x, y, z)| position_distance_squared(position, *x, *y, *z))
        .map(|(group_id, inst_id, _, _, _)| (group_id, inst_id, 0))
}

fn next_scene_inst_id(
    entry_id: u32,
    plane_id: u32,
    floor_id: u32,
    spawned_monsters: &[common::structs::persistent::SpawnedMonster],
) -> Option<u32> {
    let scenes = GAME_RES.level_output_configs.get(&entry_id)?;
    let scene = scenes.get(&format!("P{plane_id}_F{floor_id}"))?;

    let configured_max = scene
        .scenes
        .values()
        .flat_map(|group| {
            group
                .props
                .iter()
                .map(|entity| entity.inst_id)
                .chain(group.npcs.iter().map(|entity| entity.inst_id))
                .chain(group.monsters.iter().map(|entity| entity.inst_id))
        })
        .max();
    let spawned_max = spawned_monsters
        .iter()
        .filter(|monster| {
            monster.entry_id == entry_id
                && monster.plane_id == plane_id
                && monster.floor_id == floor_id
        })
        .map(|monster| monster.inst_id)
        .max();

    configured_max
        .into_iter()
        .chain(spawned_max)
        .max()
        .unwrap_or(0)
        .checked_add(1)
}

fn next_scene_monster_entity_id(entry_id: u32, plane_id: u32, floor_id: u32) -> Option<u32> {
    let scenes = GAME_RES.level_output_configs.get(&entry_id)?;
    let scene = scenes.get(&format!("P{plane_id}_F{floor_id}"))?;
    // Scene loading assigns monster entity IDs from 30001 upward in order.
    // Dynamic entities need to continue that sequence: clients report these
    // IDs in SceneCastSkillCsReq, while IDs from a separate range (such as
    // 40000) are not preserved as the target ID by the client.
    let monster_count = scene
        .scenes
        .values()
        .map(|group| group.monsters.len() as u32)
        .sum::<u32>();
    30_000u32.checked_add(monster_count)?.checked_add(1)
}

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
        let cmd = cmd.to_ascii_lowercase();
        match cmd.as_str() {
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
            "ex" => {
                let Some(status) = args.first() else {
                    session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            String::from("Usage: ex on | ex off"),
                        ))
                        .await
                        .unwrap();
                    return;
                };
                let enabled = match status.to_ascii_lowercase().as_str() {
                    "on" | "1" | "true" => true,
                    "off" | "0" | "false" => false,
                    _ => {
                        session
                            .send(create_send_message(
                                25,
                                SERVER_UID,
                                body.message_datas
                                    .as_ref()
                                    .map(|v| v.message_type)
                                    .unwrap_or_default(),
                                body.chat_type,
                                String::from("Usage: ex on | ex off"),
                            ))
                            .await
                            .unwrap();
                        return;
                    }
                };

                json.enable_ex_rank = Some(enabled);
                json.save_persistent().await;
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
                        format!(
                            "EX RANK in battle: {}. Start a new battle to apply.",
                            if enabled { "ON" } else { "OFF" }
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
                            let Some(challenge) = ENDGAME_CHALLENGE_CONFIG.get(&challenge_id)
                            else {
                                let message =
                                    format!("Unknown Endgame challenge ID {challenge_id}.");
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
                            json.battle_config.cycle_count =
                                if battle_type == BattleType::PF { 4 } else { 30 };
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
            "__maps_command_removed" => {
                let mut entry_ids = GAME_RES
                    .level_output_configs
                    .keys()
                    .copied()
                    .chain(MAP_ENTRANCE_CONFIG.keys().copied())
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect::<Vec<_>>();
                let page_size = 12;
                // `maps <filter> [page]`; use `maps page <n>` for an unfiltered page.
                // Numeric filters are useful for searching entry/plane ID prefixes.
                let first_arg = args.first().copied().unwrap_or("");
                let (filter, requested_page) = if first_arg.eq_ignore_ascii_case("page") {
                    (
                        None,
                        args.get(1).and_then(|value| value.parse::<usize>().ok()),
                    )
                } else if first_arg.is_empty() {
                    (None, None)
                } else {
                    (
                        Some(first_arg.to_ascii_lowercase()),
                        args.get(1).and_then(|value| value.parse::<usize>().ok()),
                    )
                };

                if let Some(filter) = filter.as_deref() {
                    entry_ids.retain(|entry_id| {
                        let entry_text = entry_id.to_string();
                        let entrance = MAP_ENTRANCE_CONFIG.get(entry_id);
                        let plane_id = entrance.map(|entry| entry.plane_id).or_else(|| {
                            GAME_RES
                                .level_output_configs
                                .get(entry_id)
                                .and_then(|floors| floors.keys().min())
                                .and_then(|key| {
                                    key.strip_prefix('P')?.split_once("_F")?.0.parse().ok()
                                })
                        });
                        let plane_type = plane_id
                            .and_then(|id| MAZE_PLANE_CONFIG.get(&id))
                            .map(|plane| plane.plane_type.to_ascii_lowercase());
                        let entrance_type =
                            entrance.map(|entry| entry.entrance_type.to_ascii_lowercase());
                        match filter {
                            "scene" => GAME_RES.level_output_configs.contains_key(entry_id),
                            "metadata" | "meta" => {
                                !GAME_RES.level_output_configs.contains_key(entry_id)
                            }
                            "trial" | "trialactivity" => {
                                plane_type.as_deref() == Some("trialactivity")
                            }
                            "town" | "maze" | "raid" | "challenge" | "train" | "rogue"
                            | "aetherdivide" => plane_type.as_deref() == Some(filter),
                            _ => {
                                entry_text.starts_with(filter)
                                    || plane_id.is_some_and(|id| id.to_string().starts_with(filter))
                                    || entrance_type.as_deref() == Some(filter)
                            }
                        }
                    });
                }

                let page_count = entry_ids.len().div_ceil(page_size).max(1);
                let page = requested_page.unwrap_or(1).clamp(1, page_count);
                let start = (page - 1) * page_size;
                let entries = if entry_ids.is_empty() {
                    String::from("No map entries matched that filter.")
                } else {
                    entry_ids
                        .iter()
                        .skip(start)
                        .take(page_size)
                        .map(|entry_id| {
                        let entrance = MAP_ENTRANCE_CONFIG.get(entry_id);
                        let (plane_id, floor_id) = entrance
                            .map(|entry| (entry.plane_id, entry.floor_id))
                            .or_else(|| {
                                GAME_RES
                                    .level_output_configs
                                    .get(entry_id)
                                    .and_then(|floors| floors.keys().min())
                                    .and_then(|key| {
                                        let (plane, floor) = key.split_once("_F")?;
                                        Some((plane.strip_prefix('P')?.parse().ok()?, floor.parse().ok()?))
                                    })
                            })
                            .unwrap_or_default();
                        let plane = MAZE_PLANE_CONFIG.get(&plane_id);
                        let plane_type = plane
                            .map(|config| config.plane_type.as_str())
                            .unwrap_or("Unknown");
                        let world_id = plane.map(|config| config.world_id).unwrap_or_default();
                        let entrance_type = entrance
                            .map(|config| config.entrance_type.as_str())
                            .unwrap_or("Unknown");
                        let scene_status = if GAME_RES.level_output_configs.contains_key(entry_id) {
                            "scene"
                        } else {
                            "metadata-only"
                        };
                        format!(
                            "{entry_id}:P{plane_id}/W{world_id}/{plane_type}/F{floor_id}/{entrance_type}/{scene_status}"
                        )
                        })
                        .collect::<Vec<_>>()
                        .join(" | ")
                };
                let _ = session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|value| value.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        format!(
                            "Map entries{} page {page}/{page_count}: {entries}",
                            filter
                                .map(|value| format!(" matching '{value}'"))
                                .unwrap_or_default()
                        ),
                    ))
                    .await;
            }
            "spawn" | "s" | "sc" => {
                if cmd == "sc"
                    || args
                        .first()
                        .is_some_and(|arg| arg.eq_ignore_ascii_case("clear"))
                {
                    session.pending_spawned_monsters = false;
                    let current_entry = json.scene.entry_id;
                    let current_plane = json.scene.plane_id;
                    let current_floor = json.scene.floor_id;
                    let cleared_count = json
                        .spawned_monsters
                        .iter()
                        .filter(|spawned| {
                            spawned.entry_id == current_entry
                                && spawned.plane_id == current_plane
                                && spawned.floor_id == current_floor
                        })
                        .count();

                    let mut deletes_by_group = BTreeMap::<u32, Vec<SceneEntityRefreshInfo>>::new();
                    for spawned in json.spawned_monsters.iter().filter(|spawned| {
                        spawned.entry_id == current_entry
                            && spawned.plane_id == current_plane
                            && spawned.floor_id == current_floor
                    }) {
                        deletes_by_group.entry(spawned.group_id).or_default().push(
                            SceneEntityRefreshInfo {
                                refresh_type: Some(RefreshType::DeleteEntity(spawned.entity_id)),
                            },
                        );
                    }

                    // Clear the persisted spawn list across every map. Only
                    // entities in the current scene need a live delete packet.
                    json.spawned_monsters.clear();
                    if let Some(original_battle_config) = json.spawned_battle_config.take() {
                        json.battle_config = original_battle_config;
                    }
                    json.spawned_battle_active = false;
                    json.save_persistent().await;
                    session
                        .send(SceneGroupRefreshScNotify {
                            group_refresh_list: deletes_by_group
                                .into_iter()
                                .map(|(group_id, refresh_entity)| GroupRefreshInfo {
                                    group_id,
                                    refresh_type: SceneGroupRefreshType::Loaded.into(),
                                    refresh_entity,
                                    ..Default::default()
                                })
                                .collect(),
                            floor_id: current_floor,
                            dimension_id: 0,
                        })
                        .await
                        .unwrap();

                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            format!(
                                "Cleared {cleared_count} spawned monster(s) from this scene and erased saved spawn data."
                            ),
                        ))
                        .await;
                    return;
                }

                let Some(monster_id) = args.first().and_then(|id| id.parse::<u32>().ok()) else {
                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            String::from("Usage: spawn <monster_id> | spawn clear"),
                        ))
                        .await;
                    return;
                };
                if monster_id == 0 {
                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            String::from("Monster ID must be greater than 0."),
                        ))
                        .await;
                    return;
                }
                if json.challenge_origin_scene.is_some() {
                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            String::from(
                                "Exit the active Endgame challenge before spawning a map monster.",
                            ),
                        ))
                        .await;
                    return;
                }

                let scene_entry_id = json.scene.entry_id;
                let plane_id = json.scene.plane_id;
                let floor_id = json.scene.floor_id;
                let replaced_monsters = json
                    .spawned_monsters
                    .iter()
                    .filter(|spawned| {
                        spawned.entry_id == scene_entry_id
                            && spawned.plane_id == plane_id
                            && spawned.floor_id == floor_id
                    })
                    .map(|spawned| (spawned.group_id, spawned.entity_id))
                    .collect::<Vec<_>>();
                // `spawn <id>` means replace the previous command-spawned
                // monsters in this scene, not append another formation.
                // Keep records for other scenes so they can still be restored.
                let spawn_index = 0;
                let spawn_position = common::structs::persistent::spawned_monster_position(
                    &json.position,
                    spawn_index,
                );
                let Some((group_id, _nearby_inst_id, event_id)) = nearest_scene_group_context(
                    scene_entry_id,
                    plane_id,
                    floor_id,
                    &spawn_position,
                ) else {
                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            format!(
                                "Cannot spawn here: no scene entity groups found for entry {}.",
                                scene_entry_id
                            ),
                        ))
                        .await;
                    return;
                };
                let Some(inst_id) =
                    next_scene_inst_id(scene_entry_id, plane_id, floor_id, &json.spawned_monsters)
                else {
                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            format!(
                                "Cannot spawn here: could not allocate a unique scene instance ID for entry {}.",
                                scene_entry_id
                            ),
                        ))
                        .await;
                    return;
                };
                let Some(entity_id) = next_scene_monster_entity_id(
                    scene_entry_id,
                    plane_id,
                    floor_id,
                ) else {
                    let _ = session
                        .send(create_send_message(
                            25,
                            SERVER_UID,
                            body.message_datas
                                .as_ref()
                                .map(|v| v.message_type)
                                .unwrap_or_default(),
                            body.chat_type,
                            String::from("Cannot spawn here: could not allocate a scene entity ID."),
                        ))
                        .await;
                    return;
                };
                // Entity IDs are scene-local; use the same sequence the
                // client uses for configured monsters instead of a global
                // server-only range. The old ID is replaced below.
                session.next_spawned_monster_entity_id = entity_id.saturating_add(1);
                session.used_spawned_monster_entity_ids.insert(entity_id);
                json.spawned_monsters.retain(|spawned| {
                    spawned.entry_id != scene_entry_id
                        || spawned.plane_id != plane_id
                        || spawned.floor_id != floor_id
                });
                json.spawned_monsters
                    .push(common::structs::persistent::SpawnedMonster {
                        entry_id: scene_entry_id,
                        plane_id,
                        floor_id,
                        group_id,
                        inst_id,
                        entity_id,
                        monster_id,
                        event_id,
                        position: spawn_position.clone(),
                    });
                tracing::info!(
                    "Spawn command monster_id={monster_id} entity_id={entity_id} scene_entry={} floor_id={floor_id} group_id={group_id} inst_id={inst_id} event_id={event_id} position={spawn_position:?}",
                    scene_entry_id
                );
                json.save_persistent().await;
                let entity = SceneEntityInfo {
                    inst_id,
                    group_id,
                    entity_id,
                    motion: Some((&spawn_position).into()),
                    entity: Some(Entity::NpcMonster(SceneNpcMonsterInfo {
                        monster_id,
                        event_id,
                        world_level: 6,
                        ..Default::default()
                    })),
                };
                let mut refresh_by_group = BTreeMap::<u32, Vec<SceneEntityRefreshInfo>>::new();
                for (old_group_id, old_entity_id) in &replaced_monsters {
                    refresh_by_group.entry(*old_group_id).or_default().push(
                        SceneEntityRefreshInfo {
                            refresh_type: Some(RefreshType::DeleteEntity(*old_entity_id)),
                        },
                    );
                }
                refresh_by_group
                    .entry(group_id)
                    .or_default()
                    .push(SceneEntityRefreshInfo {
                        refresh_type: Some(RefreshType::AddEntity(entity)),
                    });
                session
                    .send(SceneGroupRefreshScNotify {
                        group_refresh_list: refresh_by_group
                            .into_iter()
                            .map(|(group_id, refresh_entity)| GroupRefreshInfo {
                                group_id,
                                refresh_type: SceneGroupRefreshType::Loaded.into(),
                                refresh_entity,
                                ..Default::default()
                            })
                            .collect(),
                        floor_id,
                        dimension_id: 0,
                    })
                    .await
                    .unwrap();
                let _ = session
                    .send(create_send_message(
                        25,
                        SERVER_UID,
                        body.message_datas
                            .as_ref()
                            .map(|v| v.message_type)
                            .unwrap_or_default(),
                        body.chat_type,
                        format!(
                            "Replaced {} spawned monster(s) in this scene with monster {monster_id} (entity {entity_id}).",
                            replaced_monsters.len()
                        ),
                    ))
                    .await;
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
    // Chat clients commonly send commands with a leading slash. Accept that
    // form as well as the bare command listed in the server help.
    let command = command.trim().strip_prefix('/').unwrap_or(command.trim());
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
