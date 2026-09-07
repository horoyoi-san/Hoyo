
use common::{
    resources::GAME_RES,
    structs::{AvatarJson, Position},
};
use prost::Message;
use scene_entity_info::Entity;

use crate::util::{self};

use super::*;

pub async fn on_get_cur_scene_info_cs_req(
    session: &mut PlayerSession,
    _body: &GetCurSceneInfoCsReq,
    res: &mut GetCurSceneInfoScRsp,
) {
    let Some(player) = session.json_data.get() else {
        tracing::error!("data is not set!");
        return;
    };

    // Amphoreus Overworld — the default main exploration map
    const FALLBACK_ENTRY_ID: u32 = 2041101;

    let saved_entry_id = if player.scene.entry_id != 0 {
        player.scene.entry_id
    } else {
        FALLBACK_ENTRY_ID
    };

    // Check if the saved scene is a challenge plane (planeType 4) — 
    // the client can't render challenge planes without active challenge state.
    let is_challenge_scene = GAME_RES
        .level_output_configs
        .get(&saved_entry_id)
        .and_then(|v| v.values().next())
        .map(|loc| loc.plane_type == 4)
        .unwrap_or(false);

    let effective_entry_id = if is_challenge_scene {
        tracing::warn!(
            "Saved entry_id {} is a challenge scene (planeType=4), redirecting to overworld {}",
            saved_entry_id, FALLBACK_ENTRY_ID
        );
        FALLBACK_ENTRY_ID
    } else {
        saved_entry_id
    };

    // Try loading the effective scene
    let scene = load_scene(session, effective_entry_id, false, Option::<u32>::None).await;

    let scene_info = if let Ok(scene) = scene {
        scene
    } else {
        tracing::warn!(
            "Entry_id {} load failed, falling back to {}",
            effective_entry_id, FALLBACK_ENTRY_ID
        );

        match load_scene(session, FALLBACK_ENTRY_ID, false, Option::<u32>::None).await {
            Ok(fallback_scene) => fallback_scene,
            Err(e) => {
                tracing::error!("Fallback scene load also failed: {e:?}");
                SceneInfo {
                    game_mode_type: 2,
                    entry_id: FALLBACK_ENTRY_ID,
                    plane_id: 20411,
                    floor_id: 20411001,
                    ..Default::default()
                }
            }
        }
    };

    // If we redirected, update the player's saved scene so other handlers
    // (GetSceneMapInfo, etc.) use consistent data, and persist the fix.
    if is_challenge_scene || effective_entry_id != saved_entry_id {
        if let Some(json) = session.json_data.get_mut() {
            json.scene.entry_id = scene_info.entry_id;
            json.scene.plane_id = scene_info.plane_id;
            json.scene.floor_id = scene_info.floor_id;
            json.position.x = -26968;
            json.position.y = 78953;
            json.position.z = 14457;
            json.position.rot_y = 11858;
            json.save_persistent().await;
            tracing::info!(
                "Updated persistent scene to entry_id={}, plane_id={}, floor_id={}",
                scene_info.entry_id, scene_info.plane_id, scene_info.floor_id
            );
        }
    }

    res.scene = Some(scene_info);
}

pub async fn handle_enter_scene(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    use prost::Message;
    let req = EnterSceneCsReq::decode(payload)?;
    tracing::info!("handle_enter_scene: entry_id={}, teleport_id={}, is_close_map={}", req.entry_id, req.entry_id2, req.is_close_map);

    let scene_info = match load_scene(session, req.entry_id, false, Some(req.entry_id2)).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("handle_enter_scene load_scene error: {e:?}");
            session.send(EnterSceneScRsp {
                retcode: 2605,
                ..Default::default()
            }).await?;
            return Ok(());
        }
    };

    let floor_id = scene_info.floor_id;
    let plane_id = scene_info.plane_id;

    // 1. Send EnterSceneScRsp FIRST! (Required by client state machine)
    let sid = req.scene_identifier.unwrap_or(SceneIdentifier {
        floor_id,
        ..Default::default()
    });
    session.send(EnterSceneScRsp {
        retcode: 0,
        scene_identifier: Some(sid),
        is_close_map: req.is_close_map,
        is_over_map: true,
    }).await?;

    // 2. Update persistent player state
    let lineup_info = if let Some(json) = session.json_data.get_mut() {
        json.scene.entry_id = req.entry_id;
        json.scene.floor_id = floor_id;
        json.scene.plane_id = plane_id;
        let lineup = AvatarJson::to_lineup_info(&json.lineups);
        let _ = json.save_persistent().await;
        lineup
    } else {
        Default::default()
    };

    // 3. Send EnterSceneByServerScNotify SECOND!
    session.send(EnterSceneByServerScNotify {
        scene: Some(scene_info),
        lineup: Some(lineup_info),
        reason: 0,
    }).await?;

    Ok(())
}

#[allow(dead_code)]
pub async fn on_enter_scene_cs_req(
    session: &mut PlayerSession,
    req: &EnterSceneCsReq,
    res: &mut EnterSceneScRsp,
) {
    if let Ok(scene_info) = load_scene(session, req.entry_id, false, Some(req.entry_id2)).await {
        let floor_id = scene_info.floor_id;
        res.retcode = 0;
        res.scene_identifier = Some(req.scene_identifier.clone().unwrap_or(SceneIdentifier {
            floor_id,
            ..Default::default()
        }));
        res.is_over_map = true;
        res.is_close_map = req.is_close_map;

        let lineup_info = if let Some(json) = session.json_data.get_mut() {
            json.scene.entry_id = req.entry_id;
            json.scene.floor_id = floor_id;
            json.scene.plane_id = scene_info.plane_id;
            let lineup = AvatarJson::to_lineup_info(&json.lineups);
            let _ = json.save_persistent().await;
            lineup
        } else {
            Default::default()
        };

        // Send EnterSceneScRsp first, then Notify
        let _ = session.send(res.clone()).await;
        let _ = session.send(EnterSceneByServerScNotify {
            scene: Some(scene_info),
            lineup: Some(lineup_info),
            reason: 0,
        }).await;
    } else {
        res.retcode = 2605;
    }
}

pub async fn on_get_scene_map_info_cs_req(
    _sesison: &mut PlayerSession,
    req: &GetSceneMapInfoCsReq,
    res: &mut GetSceneMapInfoScRsp,
) {
    for floor_id in req.scene_identifiers.iter().map(|v| v.floor_id) {
        let mut map_info = SceneMapInfo {
            chest_list: vec![
                ChestInfo {
                    chest_type: 101,
                    ..Default::default()
                },
                ChestInfo {
                    chest_type: 102,
                    ..Default::default()
                },
                ChestInfo {
                    chest_type: 104,
                    ..Default::default()
                },
            ],
            floor_id: floor_id,
            scene_identifier: Some(SceneIdentifier {
                floor_id,
                ..Default::default()
            }),
            ..Default::default()
        };

        let floor_configs = GAME_RES
            .map_default_entrance_map
            .get(&floor_id)
            .and_then(|v| {
                GAME_RES
                    .level_output_configs
                    .get(v)
                    .and_then(|v| v.iter().next())
            });

        if let Some((_, floor_config)) = floor_configs {
            for (group_id, group) in floor_config.scenes.iter() {
                map_info.group_list.push(MapInfoGroup {
                    group_id: *group_id,
                    ..Default::default()
                });

                for teleport in group.teleports.keys() {
                    map_info.unlock_teleport_list.push(*teleport)
                }

                for prop in &group.props {
                    map_info.map_info_prop_list.push(MazePropState {
                        group_id: prop.group_id,
                        state: prop.prop_state,
                        config_id: prop.inst_id,
                        extra_info: Option::<PropExtraInfo>::None,
                    });
                    // map_info.maze_group_list.push(MazeGroup {
                    //     group_id: prop.group_id,
                    //     state: prop.prop_state,
                    //     config_id: prop.inst_id,
                    //     extra_info: Option::None,
                    // });
                }
            }

            map_info.lighten_section_list = floor_config.sections.clone();
            map_info.floor_saved_value_map = floor_config.saved_values.clone();
            // #TODO!
            // map_info
            //     .chest_unlock_progress_list
            //     .push(ChestUnlockProgress {
            //         r#type: 0,
            //         total_chest_count: 25,
            //         unlocked_chest_count: 25,
            //     });
        }

        res.scene_map_info_list.push(map_info)
    }
}

pub async fn on_scene_entity_move_cs_req(
    session: &mut PlayerSession,
    req: &SceneEntityMoveCsReq,
    _res: &mut SceneEntityMoveScRsp,
) {
    let Some(player) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return;
    };

    if util::cur_timestamp_ms() <= session.next_scene_save {
        return;
    }

    // save every 5 sec
    session.next_scene_save = util::cur_timestamp_ms() + (5 * 1000);

    for entity in &req.entity_motion_list {
        if entity.entity_id != 0 {
            continue;
        }

        if let Some(motion) = &entity.motion {
            if let Some(pos) = &motion.pos {
                player.position.x = pos.x;
                player.position.y = pos.y;
                player.position.z = pos.z;
            }
            if let Some(rot) = &motion.rot {
                player.position.rot_y = rot.y;
            }
        }
    }

    player.save_persistent().await;
}

pub async fn on_get_entered_scene_cs_req(
    _session: &mut PlayerSession,
    _req: &GetEnteredSceneCsReq,
    res: &mut GetEnteredSceneScRsp,
) {
    res.entered_scene_info_list = GAME_RES
        .level_output_configs
        .iter()
        .flat_map(|(_, v)| {
            v.iter()
                .filter(|(_, v)| v.is_entered_scene_info)
                .map(|(k, _)| {
                    let split: Vec<_> = k.split("_").collect();
                    let plane_id = &split[0][1..];
                    let floor_id = &split[1][1..];
                    EnteredSceneInfo {
                        floor_id: floor_id.parse().unwrap(),
                        plane_id: plane_id.parse().unwrap(),
                    }
                })
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
}

pub async fn load_scene(
    session: &mut PlayerSession,
    entry_id: u32,
    is_enter_scene: bool,
    teleport_id: Option<u32>,
) -> Result<SceneInfo> {
    let Some(json) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return Err(anyhow::format_err!("data is not set!"));
    };

    let (name, scene) = match GAME_RES
        .level_output_configs
        .get(&entry_id)
        .and_then(|v| v.iter().next())
    {
        Some(v) => v,
        None => {
            tracing::warn!("Map Entrance Not Found {}, falling back to default", entry_id);
            if let Some(v) = GAME_RES.level_output_configs.get(&100000104).and_then(|v| v.iter().next()) {
                v
            } else if let Some(v) = GAME_RES.level_output_configs.values().find_map(|m| m.iter().next()) {
                v
            } else {
                return Err(anyhow::format_err!("Map Entrance Not Found {}", entry_id));
            }
        }
    };

    let split: Vec<_> = name.split('_').collect();
    let plane_id = split[0][1..].parse::<u32>()?;
    let mut floor_id = split[1][1..].parse::<u32>()?;

    // If map entrance defines the real floor_id (e.g. 100000303 -> Party Car floor 10000003), use it!
    if let Some(entrance) = common::structs::challenge::CHALLENGE_RES.map_entrances.get(&entry_id) {
        floor_id = entrance.floor_id;
    }

    let mut json_pos = json.position.clone();
    let is_same_scene = json.scene.entry_id == entry_id;
    let target_teleport = match teleport_id {
        Some(tid) if tid != 0 => Some(tid),
        _ => None,
    };

    if entry_id == 3000101 {
        // Forgotten Hall (Memory of Chaos Entrance)
        json_pos.x = -35640;
        json_pos.y = -2134;
        json_pos.z = -170280;
        json_pos.rot_y = 90000;
    } else if entry_id == 100000303 {
        // Party Car - Anomaly Arbitration anchor
        json_pos.x = 7178;
        json_pos.y = 0;
        json_pos.z = 5544;
        json_pos.rot_y = 90000;
    } else if entry_id == 100000104 || entry_id == 100000103 || entry_id == 1000001 || entry_id == 100000101 {
        // Parlor Car aisle waypoint facing conductor Pom-Pom
        json_pos.x = 0;
        json_pos.y = 0;
        json_pos.z = -2000;
        json_pos.rot_y = 345000;
    } else if let Some(anchor) = common::structs::challenge::CHALLENGE_RES.anchors.get(&entry_id) {
        json_pos.x = anchor.pos.x;
        json_pos.y = anchor.pos.y;
        json_pos.z = anchor.pos.z;
        json_pos.rot_y = anchor.rot.y;
    } else if let Some(tid) = target_teleport {
        if let Some(teleport) = scene
            .scenes
            .iter()
            .find_map(|(_, v)| v.teleports.get(&tid))
        {
            json_pos.x = teleport.pos.x;
            json_pos.y = teleport.pos.y;
            json_pos.z = teleport.pos.z;
            json_pos.rot_y = teleport.rot.y;
        } else if let Some((_, teleport)) = scene
            .scenes
            .iter()
            .find_map(|v| v.1.teleports.iter().next())
        {
            json_pos.x = teleport.pos.x;
            json_pos.y = teleport.pos.y;
            json_pos.z = teleport.pos.z;
            json_pos.rot_y = teleport.rot.y;
        }
    } else if !is_same_scene {
        if let Some((_, teleport)) = scene
            .scenes
            .iter()
            .find_map(|v| v.1.teleports.iter().next())
        {
            json_pos.x = teleport.pos.x;
            json_pos.y = teleport.pos.y;
            json_pos.z = teleport.pos.z;
            json_pos.rot_y = teleport.rot.y;
        } else if let Some((_, grp)) = scene.scenes.iter().find(|(_, g)| !g.props.is_empty()) {
            if let Some(p) = grp.props.first() {
                json_pos.x = p.pos.x;
                json_pos.y = p.pos.y;
                json_pos.z = p.pos.z;
                json_pos.rot_y = p.rot.y;
            }
        }
    }

    let mut scene_info = SceneInfo {
        floor_id,
        plane_id,
        entry_id,
        game_mode_type: scene.plane_type,
        leader_entity_id: 1,
        world_id: if scene.world_id == 100 {
            501
        } else {
            scene.world_id
        },
        lighten_section_list: scene.sections.clone(),
        opened_chests_list: scene
            .scenes
            .values()
            .flat_map(|v| v.chests.clone())
            .collect::<Vec<_>>(),
        scene_mission_info: Some(MissionStatusBySceneInfo {
            finished_main_mission_id_list: scene
                .scenes
                .values()
                .flat_map(|s| s.finished_main_missions.clone())
                .collect::<Vec<_>>(),
            sub_mission_status_list: scene
                .scenes
                .values()
                .flat_map(|s| {
                    s.finished_sub_missions.iter().map(|sm| Mission {
                        id: *sm,
                        status: MissionStatus::MissionFinish.into(),
                        progress: 0,
                    })
                })
                .collect::<Vec<_>>(),
            ..Default::default()
        }),
        floor_saved_data: scene.saved_values.clone(),
        scene_identifier: Some(SceneIdentifier {
            floor_id,
            ..Default::default()
        }),
        ..Default::default()
    };

    let lineup_info = AvatarJson::to_lineup_info(&json.lineups);
    let player_pos = MotionInfo {
        rot: Some(Vector {
            x: 0,
            y: json_pos.rot_y,
            z: 0,
        }),
        pos: Some(Vector {
            x: json_pos.x,
            y: json_pos.y,
            z: json_pos.z,
        }),
    };
        let mut loaded_npc: Vec<u32> = vec![];
        let mut prop_entity_id = 1_000;
        let mut npc_entity_id = 20_000;
        let mut monster_entity_id = 30_000;

        for (group_id, group) in &scene.scenes {
            let mut group_info = SceneEntityGroupInfo {
                group_id: *group_id,
                ..Default::default()
            };

            // Load Props
            for prop in &group.props {
                prop_entity_id += 1;

                let prop_position = Position {
                    x: (prop.pos.x),
                    y: (prop.pos.y),
                    z: (prop.pos.z),
                    rot_y: (prop.rot.y),
                };

                let entity_info = SceneEntityInfo {
                    inst_id: prop.inst_id,
                    group_id: prop.group_id,
                    motion: Some(prop_position.into()),
                    entity: Some(Entity::Prop(ScenePropInfo {
                        prop_state: prop.prop_state,
                        prop_id: prop.prop_id,
                        ..Default::default()
                    })),
                    entity_id: prop_entity_id,
                };

                group_info.entity_list.push(entity_info);
            }

            // Load NPCs
            for npc in &group.npcs {
                if loaded_npc.contains(&(npc.npc_id)) || json.avatars.contains_key(&(npc.npc_id)) {
                    continue;
                }
                npc_entity_id += 1;
                loaded_npc.push(npc.npc_id);

                let npc_position = Position {
                    x: npc.pos.x,
                    y: npc.pos.y,
                    z: npc.pos.z,
                    rot_y: npc.rot.y,
                };

                let info = SceneEntityInfo {
                    inst_id: npc.inst_id,
                    group_id: npc.group_id,
                    entity_id: npc_entity_id,
                    motion: Some(npc_position.into()),
                    entity: Some(Entity::Npc(SceneNpcInfo {
                        npc_id: npc.npc_id,
                        ..Default::default()
                    })),
                };

                group_info.entity_list.push(info);
            }

            // Load Monsters
            for monster in &group.monsters {
                monster_entity_id += 1;
                let monster_position = Position {
                    x: monster.pos.x,
                    y: monster.pos.y,
                    z: monster.pos.z,
                    rot_y: monster.rot.y,
                };

                let npc_monster = SceneNpcMonsterInfo {
                    monster_id: monster.monster_id,
                    event_id: monster.event_id,
                    world_level: 6,
                    ..Default::default()
                };

                let info = SceneEntityInfo {
                    inst_id: monster.inst_id,
                    group_id: monster.group_id,
                    entity_id: monster_entity_id,
                    motion: Some(monster_position.into()),
                    entity: Some(Entity::NpcMonster(npc_monster)),
                };

                group_info.entity_list.push(info);
            }

            // TODO: for now don't load group that have nothing in it
            if group.props.is_empty() && group.npcs.is_empty() && group.monsters.is_empty() {
                continue;
            }

            scene_info.entity_group_list.push(group_info);

            // TODO: ?
            // scene_info.group_state_list.push(SceneGroupState {
            //     group_id: *group_id,
            //     is_default: true,
            //     state: 0,
            // });
        }

    // load player entity
    scene_info.entity_group_list.push(SceneEntityGroupInfo {
        state: 0,
        group_id: 0,
        entity_list: json
            .lineups
            .iter()
            .map(|(slot, avatar_id)| SceneEntityInfo {
                inst_id: 0,
                entity_id: (*slot) + 1,
                motion: Some(player_pos),
                entity: Some(Entity::Actor(SceneActorInfo {
                    avatar_type: AvatarType::AvatarFormalType.into(),
                    base_avatar_id: *avatar_id,
                    map_layer: 0,
                    uid: 25,
                })),
                ..Default::default()
            })
            .collect(),
        ..Default::default()
    });

    if is_enter_scene {
        json.scene.entry_id = entry_id;
        json.scene.floor_id = floor_id;
        json.scene.plane_id = plane_id;
        json.position.x = json_pos.x;
        json.position.y = json_pos.y;
        json.position.z = json_pos.z;
        json.position.rot_y = json_pos.rot_y;

        json.save_persistent().await;

        session
            .send(EnterSceneByServerScNotify {
                scene: Some(scene_info.clone()),
                lineup: Some(lineup_info),
                ..Default::default()
            })
            .await?;
    }

    Ok(scene_info)
}

pub async fn load_challenge_scene(
    session: &mut PlayerSession,
    entry_id: u32,
    target_group_id: u32,
    monster_id: u32,
    event_id: u32,
    avatar_ids: &[u32],
) -> Result<(SceneInfo, MotionInfo)> {
    let Some(json) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return Err(anyhow::format_err!("data is not set!"));
    };

    let (name, scene) = match GAME_RES
        .level_output_configs
        .get(&entry_id)
        .and_then(|v| v.iter().next())
    {
        Some(v) => v,
        None => {
            tracing::warn!("Challenge Map Entrance Not Found {}, falling back to 3000101 or first available", entry_id);
            if let Some(v) = GAME_RES.level_output_configs.get(&3000101).and_then(|v| v.iter().next()) {
                v
            } else if let Some(v) = GAME_RES.level_output_configs.values().find_map(|m| m.iter().next()) {
                v
            } else {
                return Err(anyhow::format_err!("Challenge Map Entrance Not Found {}", entry_id));
            }
        }
    };

    let split: Vec<_> = name.split('_').collect();
    let plane_id = split[0][1..].parse::<u32>()?;
    let mut floor_id = split[1][1..].parse::<u32>()?;

    if let Some(entrance) = common::structs::challenge::CHALLENGE_RES.map_entrances.get(&entry_id) {
        floor_id = entrance.floor_id;
    }

    // First calculate boss monster position so we have the arena floor height
    let (mons_pos, inst_id) = if let Some(grp) = scene.scenes.get(&target_group_id) {
        if let Some(m) = grp.monsters.first() {
            (Position { x: m.pos.x, y: m.pos.y, z: m.pos.z, rot_y: m.rot.y }, m.inst_id)
        } else {
            (Position { x: 0, y: 1000, z: -45000, rot_y: 180000 }, 1)
        }
    } else if let Some((_, grp)) = scene.scenes.iter().find(|(_, g)| !g.monsters.is_empty()) {
        let m = grp.monsters.first().unwrap();
        (Position { x: m.pos.x, y: m.pos.y, z: m.pos.z, rot_y: m.rot.y }, m.inst_id)
    } else {
        (Position { x: 0, y: 1000, z: -45000, rot_y: 180000 }, 1)
    };

    // Determine spawn position:
    let (spawn_x, spawn_y, spawn_z, spawn_rot_y) = if entry_id == 3000101 {
        // Forgotten Hall MoC arena: boss is at (-61000, -2141, -170700)
        (-45000, -2141, -170700, 270000)
    } else if entry_id == 3012602 {
        // AS Sunday arena: boss is at (213, -193081, 137)
        (213, -193081, -12000, 0)
    } else if entry_id == 3013601 {
        // AS Cocolia arena: boss is at (-78, 13745, 605253)
        (-78, 13745, 593000, 0)
    } else if entry_id == 3000205 {
        // AS Arena: boss is at (580, 8551, 54030)
        (580, 8551, 42000, 0)
    } else if entry_id == 3013501 {
        (0, 1244, -10000, 0)
    } else if let Some(anchor) = common::structs::challenge::CHALLENGE_RES.anchors.get(&entry_id) {
        (anchor.pos.x, anchor.pos.y, anchor.pos.z, anchor.rot.y)
    } else {
        // Smart fallback: spawn 12m in front of the monster on the exact floor!
        (mons_pos.x, mons_pos.y, mons_pos.z - 12000, 0)
    };

    let player_motion = MotionInfo {
        rot: Some(Vector {
            x: 0,
            y: spawn_rot_y,
            z: 0,
        }),
        pos: Some(Vector {
            x: spawn_x,
            y: spawn_y,
            z: spawn_z,
        }),
    };

    let mut scene_info = SceneInfo {
        floor_id,
        plane_id,
        entry_id,
        game_mode_type: 4, // GAME_MODE_CHALLENGE
        leader_entity_id: 1,
        world_id: if scene.world_id == 100 { 501 } else { scene.world_id },
        lighten_section_list: scene.sections.clone(),
        opened_chests_list: Vec::new(),
        floor_saved_data: scene.saved_values.clone(),
        scene_identifier: Some(SceneIdentifier {
            floor_id,
            ..Default::default()
        }),
        ..Default::default()
    };

    // Load props for group 1, target group, and common prop groups
    let mut prop_entity_id = 1_000;
    for (gid, group) in &scene.scenes {
        if *gid == 1 || *gid == target_group_id || *gid == 7 || *gid == 8 {
            let mut group_info = SceneEntityGroupInfo {
                state: 1,
                group_id: *gid,
                ..Default::default()
            };
            for prop in &group.props {
                prop_entity_id += 1;
                group_info.entity_list.push(SceneEntityInfo {
                    inst_id: prop.inst_id,
                    group_id: prop.group_id,
                    motion: Some(Position {
                        x: prop.pos.x,
                        y: prop.pos.y,
                        z: prop.pos.z,
                        rot_y: prop.rot.y,
                    }.into()),
                    entity: Some(Entity::Prop(ScenePropInfo {
                        prop_state: prop.prop_state,
                        prop_id: prop.prop_id,
                        ..Default::default()
                    })),
                    entity_id: prop_entity_id,
                });
            }
            if !group_info.entity_list.is_empty() {
                scene_info.entity_group_list.push(group_info);
            }
        }
    }

    let mut monster_group = SceneEntityGroupInfo {
        state: 1,
        group_id: target_group_id,
        ..Default::default()
    };
    monster_group.entity_list.push(SceneEntityInfo {
        inst_id,
        group_id: target_group_id,
        entity_id: 30_001,
        motion: Some(mons_pos.into()),
        entity: Some(Entity::NpcMonster(SceneNpcMonsterInfo {
            monster_id,
            event_id,
            world_level: 6,
            ..Default::default()
        })),
    });
    scene_info.entity_group_list.push(monster_group);

    // Load player team actors
    let avatars_to_use: Vec<u32> = if avatar_ids.is_empty() {
        json.lineups.values().copied().collect()
    } else {
        avatar_ids.to_vec()
    };

    let player_group = SceneEntityGroupInfo {
        state: 1,
        group_id: 0,
        entity_list: avatars_to_use
            .iter()
            .enumerate()
            .map(|(slot, &aid)| SceneEntityInfo {
                inst_id: 0,
                entity_id: (slot as u32) + 1,
                motion: Some(player_motion.clone()),
                entity: Some(Entity::Actor(SceneActorInfo {
                    avatar_type: AvatarType::AvatarFormalType.into(),
                    base_avatar_id: aid,
                    map_layer: 0,
                    uid: 25,
                })),
                ..Default::default()
            })
            .collect(),
        ..Default::default()
    };
    scene_info.entity_group_list.push(player_group);

    // Do NOT overwrite persistent scene with challenge arena ID!
    // If the saved persistent scene was already a challenge arena from an older run, sanitize back to Parlor Car:
    if challenge::is_challenge_scene(json.scene.entry_id) {
        json.scene.entry_id = 100000104;
        json.position.x = 0;
        json.position.y = 0;
        json.position.z = -2000;
        json.position.rot_y = 345000;
        json.save_persistent().await;
    }

    Ok((scene_info, player_motion))
}

pub async fn handle_finish_talk_mission(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = FinishTalkMissionCsReq::decode(payload)?;
    tracing::info!("handle_finish_talk_mission: sub_mission_id={}, talk_str={}", req.sub_mission_id, req.talk_str);
    session.send(FinishTalkMissionScRsp {
        sub_mission_id: req.sub_mission_id,
        custom_value_list: req.custom_value_list,
        talk_str: req.talk_str,
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_get_first_talk_npc(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = GetFirstTalkNpcCsReq::decode(payload)?;
    let npc_meet_status_list = req.npc_id_list
        .into_iter()
        .map(|npc_id| FirstNpcTalkInfo { npc_id, is_meet: true })
        .collect();
    session.send(GetFirstTalkNpcScRsp {
        npc_meet_status_list,
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_get_first_talk_by_performance_npc(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = GetFirstTalkByPerformanceNpcCsReq::decode(payload)?;
    let npc_meet_status_list = req.performance_id_list
        .into_iter()
        .map(|performance_id| NpcMeetByPerformanceStatus { performance_id, is_meet: true })
        .collect();
    session.send(GetFirstTalkByPerformanceNpcScRsp {
        npc_meet_status_list,
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_finish_first_talk_npc(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = FinishFirstTalkNpcCsReq::decode(payload)?;
    session.send(FinishFirstTalkNpcScRsp {
        npc_id: req.npc_id,
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_finish_first_talk_by_performance_npc(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = FinishFirstTalkByPerformanceNpcCsReq::decode(payload)?;
    session.send(FinishFirstTalkByPerformanceNpcScRsp {
        performance_id: req.performance_id,
        reward: None,
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_get_npc_taken_reward(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = GetNpcTakenRewardCsReq::decode(payload)?;
    session.send(GetNpcTakenRewardScRsp {
        npc_id: req.npc_id,
        talk_event_list: vec![2136, 2134],
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_select_inclination_text(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = SelectInclinationTextCsReq::decode(payload)?;
    session.send(SelectInclinationTextScRsp {
        talk_sentence_id: req.talk_sentence_id,
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_take_talk_reward(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = TakeTalkRewardCsReq::decode(payload)?;
    session.send(TakeTalkRewardScRsp {
        mjalboeakme: req.mjalboeakme,
        reward: None,
        retcode: 0,
    }).await?;
    Ok(())
}

