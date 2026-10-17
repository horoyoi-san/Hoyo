use std::collections::HashMap;

use common::{
    resources::{ENDGAME_SCENE_CONFIG, GAME_RES, MAP_ENTRANCE_CONFIG},
    structs::{AvatarJson, Position},
};
use scene_entity_info::Entity;

use crate::util::{self};

use super::*;

fn lighten_sections(sections: &[u32]) -> Vec<u32> {
    if !sections.is_empty() {
        return sections.to_vec();
    }

    (0..=100)
        .chain(10_000..=10_050)
        .chain([20_000])
        .chain(30_000..=30_019)
        .collect()
}

pub async fn on_get_cur_scene_info_cs_req(
    session: &mut PlayerSession,
    _body: &GetCurSceneInfoCsReq,
    res: &mut GetCurSceneInfoScRsp,
) {
    let Some(player) = session.json_data.get() else {
        tracing::error!("data is not set!");
        return;
    };
    session.pending_spawned_monsters = player.spawned_monsters.iter().any(|spawned| {
        spawned.entry_id == player.scene.entry_id
            && spawned.plane_id == player.scene.plane_id
            && spawned.floor_id == player.scene.floor_id
    });

    let default_scene = SceneInfo {
        game_mode_type: 3,
        entry_id: player.scene.entry_id,
        plane_id: player.scene.plane_id,
        floor_id: player.scene.floor_id,
        ..Default::default()
    };

    let scene = load_scene(session, default_scene.entry_id, false, Option::<u32>::None).await;

    res.scene = if let Ok(scene) = scene {
        Some(scene)
    } else {
        Some(default_scene)
    };
}

pub async fn on_enter_scene_cs_req(
    session: &mut PlayerSession,
    req: &EnterSceneCsReq,
    res: &mut EnterSceneScRsp,
) {
    if load_scene(session, req.entry_id, true, Some(req.entry_id2))
        .await
        .is_err()
    {
        res.retcode = 2605;
    };
}

pub async fn on_enter_section_cs_req(
    session: &mut PlayerSession,
    _req: &EnterSectionCsReq,
    res: &mut EnterSectionScRsp,
) {
    // Sections are streamed by the client from the scene data already sent in
    // SceneInfo. A successful acknowledgement is all the server needs here.
    res.retcode = 0;

    if !session.pending_spawned_monsters {
        return;
    }

    let Some(player) = session.json_data.get() else {
        session.pending_spawned_monsters = false;
        return;
    };
    let entry_id = player.scene.entry_id;
    let plane_id = player.scene.plane_id;
    let floor_id = player.scene.floor_id;
    let Some(scene) = GAME_RES
        .level_output_configs
        .get(&entry_id)
        .and_then(|scenes| scenes.get(&format!("P{plane_id}_F{floor_id}")))
    else {
        session.pending_spawned_monsters = false;
        return;
    };

    let mut next_inst_id = scene
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
        .max()
        .unwrap_or(0);
    let mut refresh_by_group = HashMap::<u32, Vec<SceneEntityRefreshInfo>>::new();
    for spawned in player.spawned_monsters.iter().filter(|spawned| {
        spawned.entry_id == entry_id
            && spawned.plane_id == plane_id
            && spawned.floor_id == floor_id
            && scene.scenes.contains_key(&spawned.group_id)
    }) {
        let Some(inst_id) = next_inst_id.checked_add(1) else {
            tracing::warn!("Could not allocate a unique instance ID for saved spawned monster");
            continue;
        };
        next_inst_id = inst_id;
        let entity = SceneEntityInfo {
            inst_id,
            group_id: spawned.group_id,
            entity_id: spawned.entity_id,
            motion: Some((&spawned.position).into()),
            entity: Some(Entity::NpcMonster(SceneNpcMonsterInfo {
                monster_id: spawned.monster_id,
                event_id: spawned.event_id,
                world_level: 6,
                ..Default::default()
            })),
        };
        refresh_by_group
            .entry(spawned.group_id)
            .or_default()
            .push(SceneEntityRefreshInfo {
                refresh_type: Some(scene_entity_refresh_info::RefreshType::AddEntity(entity)),
            });
    }

    session.pending_spawned_monsters = false;
    if refresh_by_group.is_empty() {
        tracing::info!(
            "No saved spawned monsters to restore in scene entry={entry_id} floor={floor_id}"
        );
        return;
    }

    tracing::info!(
        "Restoring {} saved spawned monster(s) after section entry in scene entry={entry_id} floor={floor_id}",
        refresh_by_group.values().map(Vec::len).sum::<usize>()
    );

    if let Err(err) = session
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
    {
        tracing::warn!("Failed to restore saved spawned monsters after entering scene: {err}");
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
            })
            .or_else(|| {
                GAME_RES
                    .level_output_configs
                    .iter()
                    .filter_map(|(entry_id, entries)| {
                        entries.iter().find_map(|(name, config)| {
                            name.rsplit_once("_F")
                                .and_then(|(_, id)| id.parse::<u32>().ok())
                                .filter(|id| *id == floor_id)
                                .map(|_| (*entry_id, name, config))
                        })
                    })
                    .min_by_key(|(entry_id, _, config)| (!config.is_entered_scene_info, *entry_id))
                    .map(|(_, name, config)| (name, config))
            })
            .or_else(|| {
                ENDGAME_SCENE_CONFIG.iter().find_map(|(_, floors)| {
                    floors.iter().find(|(name, _)| {
                        name.rsplit_once("_F")
                            .and_then(|(_, id)| id.parse::<u32>().ok())
                            == Some(floor_id)
                    })
                })
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

            map_info.lighten_section_list = lighten_sections(&floor_config.sections);
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

pub(super) async fn load_scene(
    session: &mut PlayerSession,
    entry_id: u32,
    is_enter_scene: bool,
    teleport_id: Option<u32>,
) -> Result<SceneInfo> {
    let Some(json) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return Err(anyhow::format_err!("data is not set!"));
    };

    let scene_configs = GAME_RES
        .level_output_configs
        .get(&entry_id)
        .or_else(|| ENDGAME_SCENE_CONFIG.get(&entry_id))
        .ok_or_else(|| {
            tracing::error!("Map Entrance Not Found {}", entry_id);
            anyhow::format_err!("Map Entrance Not Found {}", entry_id)
        })?;

    // Prefer the exact floor declared for the map entry. Some entry IDs point
    // at a floor whose scene payload is stored under another floor key, so
    // fall back to a scene payload from the same plane in that case.
    let current_scene_key = format!("P{}_F{}", json.scene.plane_id, json.scene.floor_id);
    let entrance = MAP_ENTRANCE_CONFIG.get(&entry_id);
    let metadata_scene = entrance.and_then(|map| {
        let exact_key = format!("P{}_F{}", map.plane_id, map.floor_id);
        scene_configs.get_key_value(&exact_key).or_else(|| {
            let plane_prefix = format!("P{}_F", map.plane_id);
            scene_configs
                .iter()
                .filter(|(name, _)| name.starts_with(&plane_prefix))
                .min_by_key(|(name, _)| *name)
        })
    });
    let current_floor = (entry_id == json.scene.entry_id)
        .then(|| scene_configs.get_key_value(&current_scene_key))
        .flatten();
    let (name, scene) = current_floor
        .or(metadata_scene)
        .map(|(name, scene)| (name.as_str(), scene))
        .or_else(|| {
            scene_configs
                .iter()
                .min_by_key(|(name, _)| *name)
                .map(|(name, scene)| (name.as_str(), scene))
        })
        .ok_or_else(|| {
            tracing::error!("No scene floors found for entry {}", entry_id);
            anyhow::format_err!("No scene floors found for entry {}", entry_id)
        })?;

    let split: Vec<_> = name.split("_").collect();
    let config_plane_id = split[0][1..].parse::<u32>()?;
    let config_floor_id = split[1][1..].parse::<u32>()?;
    let (plane_id, floor_id) = entrance
        .map(|map| (map.plane_id, map.floor_id))
        .unwrap_or((config_plane_id, config_floor_id));

    let mut json_pos = json.position.clone();
    if let Some(teleport_id) = teleport_id {
        if let Some(teleport) = scene
            .scenes
            .iter()
            .find_map(|(_, v)| v.teleports.get(&teleport_id))
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
        lighten_section_list: lighten_sections(&scene.sections),
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
        property_map: HashMap::with_capacity(0),
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
                    uid: 67,
                })),
                ..Default::default()
            })
            .collect(),
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

        // Restore custom entities after the client confirms section entry,
        // not during the scene transition while it is still loading.
        session.pending_spawned_monsters = true;
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
