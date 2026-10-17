use std::collections::{BTreeMap, BTreeSet, HashMap};

use anyhow::Result;
use rand::RngExt;

use common::{
    resources::{
        ENDGAME_CHALLENGE_CONFIG, EndgameNode, EndgameTierceNode, GAME_RES, resolve_endgame_node,
        resolve_endgame_tierce_node,
    },
    structs::{AvatarJson, BattleBuffJson, BattleType, Monster, Position, Scene},
};

use super::*;

#[cfg(test)]
fn known_endgame_challenges() -> Vec<(u32, u32)> {
    let mut challenges = ENDGAME_CHALLENGE_CONFIG
        .values()
        .map(|challenge| (challenge.id, challenge.group_id))
        .collect::<Vec<_>>();
    challenges.sort_unstable_by_key(|(challenge_id, _)| *challenge_id);
    challenges
}

fn challenge_lineup(
    avatar_lineup: &[AvatarLineup],
    avatar_ids: &[u32],
    fallback: &std::collections::BTreeMap<u32, u32>,
) -> std::collections::BTreeMap<u32, u32> {
    let ids = if !avatar_lineup.is_empty() {
        avatar_lineup
            .iter()
            .map(|avatar| avatar.id)
            .collect::<Vec<_>>()
    } else if !avatar_ids.is_empty() {
        avatar_ids.to_vec()
    } else {
        fallback.values().copied().collect()
    };

    ids.into_iter()
        .filter(|avatar_id| *avatar_id != 0)
        .take(4)
        .enumerate()
        .map(|(slot, avatar_id)| (slot as u32, avatar_id))
        .collect()
}

async fn load_challenge_scene(
    session: &mut PlayerSession,
    node: &EndgameNode<'_>,
    lineup: &std::collections::BTreeMap<u32, u32>,
) -> Result<(SceneInfo, Position)> {
    load_challenge_scene_parts(
        session,
        node.entry_id,
        node.group_id,
        node.event_id,
        node.monster_id,
        lineup,
    )
    .await
}

async fn load_tierce_challenge_scene(
    session: &mut PlayerSession,
    node: &EndgameTierceNode<'_>,
    lineup: &std::collections::BTreeMap<u32, u32>,
) -> Result<(SceneInfo, Position)> {
    load_challenge_scene_parts(
        session,
        node.entry_id,
        node.group_id,
        node.event_id,
        // Keep the configured NPC as the scene interaction trigger. The
        // actual battle monsters are supplied separately from StageConfig;
        // replacing this NPC with a wave monster can make the trigger inert.
        node.monster_id,
        lineup,
    )
    .await
}

async fn load_challenge_scene_parts(
    session: &mut PlayerSession,
    entry_id: u32,
    group_id: u32,
    event_id: u32,
    monster_id: u32,
    lineup: &std::collections::BTreeMap<u32, u32>,
) -> Result<(SceneInfo, Position)> {
    let Some(json) = session.json_data.get_mut() else {
        anyhow::bail!("player data is not set");
    };
    let previous_lineups = std::mem::replace(&mut json.lineups, lineup.clone());
    let scene_result = super::scene::load_scene(session, entry_id, false, None).await;
    if let Some(json) = session.json_data.get_mut() {
        json.lineups = previous_lineups;
    }
    let mut scene = scene_result?;

    let group = scene
        .entity_group_list
        .iter_mut()
        .find(|group| group.group_id == group_id)
        .ok_or_else(|| anyhow::anyhow!("challenge spawn group {group_id} is missing"))?;
    let mut spawn_motion = None;
    let mut entities = Vec::with_capacity(group.entity_list.len());
    for mut entity in group.entity_list.drain(..) {
        if let Some(scene_entity_info::Entity::NpcMonster(monster)) = entity.entity.as_mut() {
            if spawn_motion.is_some() {
                continue;
            }
            monster.monster_id = monster_id;
            monster.event_id = event_id;
            monster.world_level = 6;
            spawn_motion = entity.motion.clone();
        }
        entities.push(entity);
    }
    group.entity_list = entities;

    let spawn_motion =
        spawn_motion.ok_or_else(|| anyhow::anyhow!("challenge spawn monster is missing"))?;
    let spawn_pos = spawn_motion
        .pos
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("challenge spawn position is missing"))?;
    let spawn_rot = spawn_motion.rot.as_ref();
    let monster_position = Position {
        x: spawn_pos.x,
        y: spawn_pos.y,
        z: spawn_pos.z,
        rot_y: spawn_rot.map(|rot| rot.y).unwrap_or_default(),
    };

    // Challenge maps expose the boss as a scene monster that starts combat when
    // the player hits it. Spawning the player on the exact same coordinates
    // makes large bosses cover the avatar and can prevent the client from
    // selecting the monster. Keep the monster transform intact and place the
    // party a few meters in front of it instead.
    // Scene rotations use millidegrees (the same scale as the other map
    // transforms), while the standard trigonometric functions take radians.
    let yaw = (f64::from(monster_position.rot_y) / 1000.0).to_radians();
    let player_position = Position {
        // Keep the party near the scene's monster anchor. A larger offset can
        // push the spawn through the arena boundary and leave the player facing
        // a wall, where the client cannot acquire a combat target.
        x: monster_position.x + (yaw.sin() * 8_000.0).round() as i32,
        y: monster_position.y,
        z: monster_position.z + (yaw.cos() * 8_000.0).round() as i32,
        // Face the monster from the offset spawn point.
        rot_y: monster_position
            .rot_y
            .wrapping_add(180_000)
            .rem_euclid(360_000),
    };
    tracing::info!(
        "Challenge scene entry={entry_id} npc_monster={monster_id} group={group_id} monster_position={monster_position:?} player_position={player_position:?}"
    );

    if let Some(player_group) = scene
        .entity_group_list
        .iter_mut()
        .find(|group| group.group_id == 0)
    {
        for entity in &mut player_group.entity_list {
            if matches!(entity.entity, Some(scene_entity_info::Entity::Actor(_))) {
                entity.motion = Some((&player_position).into());
            }
        }
    }

    Ok((scene, player_position))
}

fn challenge_mode(challenge_id: u32) -> BattleType {
    if challenge_id >= 30_000 {
        BattleType::AS
    } else if challenge_id >= 20_000 {
        BattleType::PF
    } else {
        BattleType::Moc
    }
}

fn configure_challenge_battle(
    player: &mut common::sr_tools::FreesrData,
    node: &EndgameNode<'_>,
    lineup: &std::collections::BTreeMap<u32, u32>,
    second_lineup: &std::collections::BTreeMap<u32, u32>,
) {
    let battle_type = challenge_mode(node.challenge.id);
    player.battle_config.battle_type = battle_type.clone();
    player.battle_config.challenge_id = Some(node.challenge.id);
    player.battle_config.challenge_group_id = Some(node.challenge.group_id);
    player.battle_config.challenge_node = Some(node.node);
    player.battle_config.challenge_second_lineup = Some(second_lineup.clone());
    player.battle_config.stage_id = node.stage.stage_id;
    player.battle_config.cycle_count = if battle_type == BattleType::PF { 4 } else { 30 };
    player.battle_config.monsters = node
        .stage
        .monster_list
        .iter()
        .map(|wave| {
            wave.iter()
                .map(|monster_id| Monster {
                    level: node.stage.level,
                    monster_id: *monster_id,
                    max_hp: 0,
                })
                .collect()
        })
        .collect();
    player.battle_config.blessings = vec![BattleBuffJson {
        level: 1,
        id: node.challenge.maze_buff_id,
        ..Default::default()
    }];
    player.battle_config.custom_battle_lineup = Some(lineup.clone());
}

fn challenge_cur_info(node: &EndgameNode<'_>) -> CurChallenge {
    let battle_type = challenge_mode(node.challenge.id);
    let buff_info = match battle_type {
        BattleType::PF => Some(ChallengeCurBuffInfo {
            kknboacncon: Some(challenge_cur_buff_info::Kknboacncon::CurStoryBuffs(
                ChallengeStoryBuffList {
                    buff_list: vec![node.challenge.maze_buff_id],
                },
            )),
        }),
        BattleType::AS => Some(ChallengeCurBuffInfo {
            kknboacncon: Some(challenge_cur_buff_info::Kknboacncon::CurBossBuffs(
                ChallengeBossBuffList {
                    buff_list: vec![node.challenge.maze_buff_id],
                    challenge_boss_const: 1,
                },
            )),
        }),
        _ => None,
    };

    CurChallenge {
        challenge_id: node.challenge.id,
        score_id: if battle_type == BattleType::PF {
            40_000
        } else {
            0
        },
        status: ChallengeStatus::ChallengeDoing as i32,
        extra_lineup_type: ExtraLineupType::LineupChallenge as i32,
        stage_info: buff_info,
        ..Default::default()
    }
}

fn challenge_lineup_info(
    lineup: &std::collections::BTreeMap<u32, u32>,
    plane_id: u32,
    node: u32,
) -> LineupInfo {
    let mut info = AvatarJson::to_lineup_info(lineup);
    info.extra_lineup_type = match node {
        1 => ExtraLineupType::LineupChallenge as i32,
        2 => ExtraLineupType::LineupChallenge2 as i32,
        _ => ExtraLineupType::LineupChallenge3 as i32,
    };
    info.plane_id = plane_id;
    info
}

fn enter_challenge_battle(
    player: &mut common::sr_tools::FreesrData,
    node: &EndgameNode<'_>,
    lineup: &BTreeMap<u32, u32>,
    second_lineup: &BTreeMap<u32, u32>,
    spawn_position: Position,
    scene: &SceneInfo,
) {
    if player.challenge_origin_scene.is_none() {
        player.challenge_origin_scene = Some(player.scene.clone());
        player.challenge_origin_position = Some(player.position.clone());
        player.challenge_origin_lineups = Some(player.lineups.clone());
        player.challenge_origin_battle_config = Some(player.battle_config.clone());
    }

    player.lineups = lineup.clone();
    player.position = spawn_position;
    player.scene = Scene {
        entry_id: scene.entry_id,
        plane_id: scene.plane_id,
        floor_id: scene.floor_id,
    };
    configure_challenge_battle(player, node, lineup, second_lineup);
}

fn challenge_start_lineups(
    req: &StartChallengeCsReq,
    fallback: &BTreeMap<u32, u32>,
) -> (BTreeMap<u32, u32>, BTreeMap<u32, u32>) {
    let first = challenge_lineup(&req.avatar_lineup_first, &req.first_lineup, fallback);
    let second = challenge_lineup(&req.avatar_lineup_second, &req.second_lineup, &first);
    (first, second)
}

pub async fn on_start_challenge_cs_req(
    session: &mut PlayerSession,
    req: &StartChallengeCsReq,
    res: &mut StartChallengeScRsp,
) {
    let Some(node) = resolve_endgame_node(req.challenge_id, 1) else {
        res.retcode = 2801;
        return;
    };
    let Some(player) = session.json_data.get() else {
        res.retcode = 2801;
        return;
    };
    if player.challenge_origin_scene.is_some() {
        res.retcode = 2803;
        return;
    }

    let (first_lineup, second_lineup) = challenge_start_lineups(req, &player.lineups);
    if first_lineup.is_empty() {
        res.retcode = 2805;
        return;
    }

    let (mut scene, spawn_position) =
        match load_challenge_scene(session, &node, &first_lineup).await {
            Ok(scene) => scene,
            Err(error) => {
                tracing::warn!("Unable to load challenge {}: {error:#}", req.challenge_id);
                res.retcode = 2801;
                return;
            }
        };

    if let Some(player) = session.json_data.get_mut() {
        enter_challenge_battle(
            player,
            &node,
            &first_lineup,
            &second_lineup,
            spawn_position,
            &scene,
        );
        player.save_persistent().await;
    }

    scene.game_mode_type = 4;
    res.retcode = 0;
    res.scene = Some(scene);
    res.cur_challenge = Some(challenge_cur_info(&node));
    res.lineup_list.push(challenge_lineup_info(
        &first_lineup,
        res.scene
            .as_ref()
            .map(|scene| scene.plane_id)
            .unwrap_or_default(),
        1,
    ));
}

pub async fn on_start_challenge_tierce_cs_req(
    session: &mut PlayerSession,
    req: &StartChallengeTierceCsReq,
    res: &mut StartChallengeTierceScRsp,
) {
    let Some(node) = resolve_endgame_tierce_node(req.challenge_id) else {
        res.retcode = 2801;
        return;
    };
    let stage_index = req.stage_index as usize;
    // The client sends a zero-based stage index (room 1 => 0, room 2 => 1).
    // Use it directly so later rooms don't accidentally replay the first wave.
    // The client exposes three lineup rooms for this challenge, while this
    // StageConfig currently contains only two monster waves. Keep the selected
    // room's lineup, and reuse the final configured wave for any extra room
    // until the resource provides a dedicated encounter for it.
    let wave_index = stage_index.min(node.stage.monster_list.len().saturating_sub(1));
    let Some(wave) = node.stage.monster_list.get(wave_index) else {
        tracing::warn!(
            "Tierce challenge {} requested stage_index={} (wave_index={}), but stage {} has {} waves",
            req.challenge_id,
            req.stage_index,
            wave_index,
            node.stage.stage_id,
            node.stage.monster_list.len()
        );
        res.retcode = 2801;
        return;
    };
    tracing::info!(
        "Tierce challenge {} starting stage_index={} wave_index={} stage_id={} monsters={:?}",
        req.challenge_id,
        req.stage_index,
        wave_index,
        node.stage.stage_id,
        wave
    );
    let Some(player) = session.json_data.get() else {
        res.retcode = 2801;
        return;
    };
    if player.challenge_origin_scene.is_some()
        && player.battle_config.challenge_id != Some(req.challenge_id)
    {
        res.retcode = 2803;
        return;
    }

    let fallback = player.lineups.clone();
    let tierce_lineups = req
        .lineup_tierce_list
        .iter()
        .map(|lineup| challenge_lineup(&lineup.tierce_avatar_id_list, &[], &fallback))
        .collect::<Vec<_>>();
    // stage_index selects the room/team, while wave_index selects the monster
    // data. They are not interchangeable when a room has no dedicated wave.
    let lineup = if tierce_lineups.is_empty() {
        fallback
    } else {
        tierce_lineups
            .get(stage_index)
            .filter(|lineup| !lineup.is_empty())
            .cloned()
            .unwrap_or_default()
    };
    if lineup.is_empty() {
        tracing::warn!(
            "Tierce challenge {} has no lineup for stage_index={} (received {} lineups)",
            req.challenge_id,
            req.stage_index,
            tierce_lineups.len()
        );
        res.retcode = 2805;
        return;
    }
    tracing::info!(
        "Tierce challenge {} selected lineup for stage_index={}: {:?}",
        req.challenge_id,
        req.stage_index,
        lineup
    );

    let (mut scene, spawn_position) =
        match load_tierce_challenge_scene(session, &node, &lineup).await {
            Ok(scene) => scene,
            Err(error) => {
                tracing::warn!(
                    "Unable to load Tierce challenge {}: {error:#}",
                    req.challenge_id
                );
                res.retcode = 2801;
                return;
            }
        };

    if let Some(player) = session.json_data.get_mut() {
        if player.challenge_origin_scene.is_none() {
            player.challenge_origin_scene = Some(player.scene.clone());
            player.challenge_origin_position = Some(player.position.clone());
            player.challenge_origin_lineups = Some(player.lineups.clone());
            player.challenge_origin_battle_config = Some(player.battle_config.clone());
        }
        player.lineups = lineup.clone();
        player.position = spawn_position;
        player.scene = Scene {
            entry_id: scene.entry_id,
            plane_id: scene.plane_id,
            floor_id: scene.floor_id,
        };

        let battle_type = challenge_mode(req.challenge_id);
        player.battle_config.battle_type = battle_type.clone();
        player.battle_config.challenge_id = Some(req.challenge_id);
        player.battle_config.challenge_group_id = Some(req.challenge_id / 10);
        player.battle_config.challenge_node = Some(req.stage_index);
        player.battle_config.stage_id = node.stage.stage_id;
        player.battle_config.cycle_count = if battle_type == BattleType::PF { 4 } else { 30 };
        player.battle_config.monsters = vec![
            wave.iter()
                .map(|monster_id| Monster {
                    level: node.stage.level,
                    monster_id: *monster_id,
                    max_hp: 0,
                })
                .collect(),
        ];
        let buff_id = req
            .lineup_tierce_list
            .get(stage_index)
            .or_else(|| req.lineup_tierce_list.first())
            .map(|lineup| lineup.buff_id)
            .unwrap_or_default();
        player.battle_config.blessings = if buff_id == 0 {
            Vec::new()
        } else {
            vec![BattleBuffJson {
                level: 1,
                id: buff_id,
                ..Default::default()
            }]
        };
        player.battle_config.custom_battle_lineup = Some(lineup);
        player.save_persistent().await;
    }

    scene.game_mode_type = 4;
    res.retcode = 0;
    res.scene = Some(scene.clone());
    res.cur_tierce_challenge = Some(CurTierceChallenge {
        mpkmikbfehg: req.mpkmikbfehg,
        challenge_id: req.challenge_id,
        stage_index: req.stage_index,
        lineup_list: tierce_lineups
            .iter()
            .enumerate()
            .map(|(index, lineup)| challenge_lineup_info(lineup, scene.plane_id, index as u32 + 1))
            .collect(),
    });
}

pub async fn on_enter_challenge_next_phase_cs_req(
    session: &mut PlayerSession,
    _req: &EnterChallengeNextPhaseCsReq,
    res: &mut EnterChallengeNextPhaseScRsp,
) {
    let Some(player) = session.json_data.get() else {
        res.retcode = 2806;
        return;
    };
    let Some(challenge_id) = player.battle_config.challenge_id else {
        res.retcode = 2806;
        return;
    };
    let Some(node) = resolve_endgame_node(challenge_id, 2) else {
        res.retcode = 2801;
        return;
    };
    let lineup = player
        .battle_config
        .challenge_second_lineup
        .clone()
        .unwrap_or_else(|| player.lineups.clone());

    let (mut scene, spawn_position) = match load_challenge_scene(session, &node, &lineup).await {
        Ok(scene) => scene,
        Err(error) => {
            tracing::warn!("Unable to load challenge {challenge_id} node 2: {error:#}");
            res.retcode = 2801;
            return;
        }
    };

    if let Some(player) = session.json_data.get_mut() {
        let second_lineup = player
            .battle_config
            .challenge_second_lineup
            .clone()
            .unwrap_or_else(|| lineup.clone());
        configure_challenge_battle(player, &node, &lineup, &second_lineup);
        player.lineups = lineup;
        player.position = spawn_position;
        player.scene = Scene {
            entry_id: scene.entry_id,
            plane_id: scene.plane_id,
            floor_id: scene.floor_id,
        };
        player.save_persistent().await;
    }

    scene.game_mode_type = 4;
    res.retcode = 0;
    res.scene = Some(scene);
}

pub async fn on_leave_challenge_cs_req(
    session: &mut PlayerSession,
    _req: &LeaveChallengeCsReq,
    res: &mut LeaveChallengeScRsp,
) {
    let Some(player) = session.json_data.get_mut() else {
        res.retcode = 2806;
        return;
    };
    let (Some(origin_scene), Some(origin_position), Some(origin_lineups), Some(origin_battle)) = (
        player.challenge_origin_scene.clone(),
        player.challenge_origin_position.clone(),
        player.challenge_origin_lineups.clone(),
        player.challenge_origin_battle_config.clone(),
    ) else {
        res.retcode = 2806;
        return;
    };

    player.scene = origin_scene.clone();
    player.position = origin_position;
    player.lineups = origin_lineups.clone();
    player.battle_config = origin_battle;
    player.challenge_origin_scene = None;
    player.challenge_origin_position = None;
    player.challenge_origin_lineups = None;
    player.challenge_origin_battle_config = None;
    player.save_persistent().await;

    let scene = match super::scene::load_scene(session, origin_scene.entry_id, false, None).await {
        Ok(scene) => scene,
        Err(error) => {
            tracing::warn!("Unable to restore scene after challenge: {error:#}");
            res.retcode = 2801;
            return;
        }
    };
    let lineup = AvatarJson::to_lineup_info(&origin_lineups);
    if let Err(error) = session
        .send(EnterSceneByServerScNotify {
            lineup: Some(lineup),
            scene: Some(scene),
            ..Default::default()
        })
        .await
    {
        tracing::warn!("Unable to send restored scene after challenge: {error:#}");
        res.retcode = 2801;
        return;
    }
    res.retcode = 0;
}

pub async fn on_leave_challenge_tierce_cs_req(
    session: &mut PlayerSession,
    _req: &LeaveChallengeTierceCsReq,
    res: &mut LeaveChallengeTierceScRsp,
) {
    let mut legacy_res = LeaveChallengeScRsp::default();
    on_leave_challenge_cs_req(session, &LeaveChallengeCsReq {}, &mut legacy_res).await;
    res.retcode = legacy_res.retcode;
}

pub async fn on_start_cocoon_stage_cs_req(
    session: &mut PlayerSession,
    req: &StartCocoonStageCsReq,
    res: &mut StartCocoonStageScRsp,
) {
    let battle_info = create_battle_info(session, 0, 0).await;

    res.prop_entity_id = req.prop_entity_id;
    res.cocoon_id = req.cocoon_id;
    res.wave = req.wave;
    res.battle_info = Some(battle_info);
}

pub async fn on_quick_start_cocoon_stage_cs_req(
    session: &mut PlayerSession,
    req: &QuickStartCocoonStageCsReq,
    res: &mut QuickStartCocoonStageScRsp,
) {
    let mut battle_info = create_battle_info(session, 0, 0).await;

    battle_info.world_level = req.world_level;
    res.cocoon_id = req.cocoon_id;
    res.wave = req.wave;
    res.battle_info = Some(battle_info);
}

pub async fn on_scene_enter_stage_cs_req(
    session: &mut PlayerSession,
    _req: &SceneEnterStageCsReq,
    res: &mut SceneEnterStageScRsp,
) {
    let battle_info = create_battle_info(session, 0, 0).await;

    res.battle_info = Some(battle_info);
}

pub async fn on_pve_battle_result_cs_req(
    session: &mut PlayerSession,
    req: &PveBattleResultCsReq,
    res: &mut PveBattleResultScRsp,
) {
    res.end_status = req.end_status;
    res.battle_id = req.battle_id;
    res.stage_id = req.stage_id;

    let Some(player) = session.json_data.get_mut() else {
        return;
    };

    // Restore after wins, losses, or retreats. Retain the snapshot to allow
    // another fight with the still-spawned scene entity later.
    if player.spawned_battle_active {
        if let Some(original_config) = player.spawned_battle_config.clone() {
            player.battle_config = original_config;
        }
        player.spawned_battle_active = false;
        tracing::info!("Restored battle config after spawned monster encounter");
    }

    if req.end_status != BattleEndStatus::BattleEndWin as i32 {
        return;
    }
    let battle_config = &player.battle_config;
    let (Some(mode_id), Some(challenge_id)) = (
        battle_config.battle_type.endgame_key(),
        battle_config.challenge_id,
    ) else {
        return;
    };
    if req.stage_id != battle_config.stage_id {
        return;
    }

    let group_id = battle_config.challenge_group_id.unwrap_or_default();
    let progress = player
        .challenge_progress
        .entry(mode_id)
        .or_default()
        .entry(challenge_id)
        .or_default();
    progress.stage_id = req.stage_id;
    progress.star = progress.star.max(7);
    if group_id != 0 {
        progress.group_id = group_id;
    }
    player.save_persistent().await;
}

pub async fn on_get_challenge_cs_req(
    session: &mut PlayerSession,
    _req: &GetChallengeCsReq,
    res: &mut GetChallengeScRsp,
) {
    let Some(player) = session.json_data.get() else {
        return;
    };

    // Return only the active cycle's stages. Historical cycles were all being
    // marked complete, and max_level_list was repeated once per stage; that
    // malformed response can leave the endgame page showing empty nodes.
    let mut latest_group_by_mode = BTreeMap::new();
    for challenge in ENDGAME_CHALLENGE_CONFIG.values() {
        let mode_id = challenge_mode(challenge.id)
            .endgame_key()
            .unwrap_or_default();
        latest_group_by_mode
            .entry(mode_id)
            .and_modify(|group_id: &mut u32| *group_id = (*group_id).max(challenge.group_id))
            .or_insert(challenge.group_id);
    }

    let mut active_challenges = ENDGAME_CHALLENGE_CONFIG
        .values()
        .filter(|challenge| {
            let mode_id = challenge_mode(challenge.id)
                .endgame_key()
                .unwrap_or_default();
            latest_group_by_mode.get(&mode_id) == Some(&challenge.group_id)
        })
        .collect::<Vec<_>>();
    active_challenges.sort_unstable_by_key(|challenge| challenge.id);

    // Newer endgame floors are represented by ChallengeMazeTierceConfig and
    // extend a legacy floor via PreChallengeMazeID. Include only the Tierce
    // records whose parent belongs to the active cycle for that mode.
    let active_legacy_ids = active_challenges
        .iter()
        .map(|challenge| challenge.id)
        .collect::<BTreeSet<_>>();

    for challenge in active_challenges {
        let mode_id = challenge_mode(challenge.id)
            .endgame_key()
            .unwrap_or_default();
        let progress = player
            .challenge_progress
            .get(&mode_id)
            .and_then(|records| records.get(&challenge.id));
        let (score_id, score_two) = if mode_id == 2 {
            (40_000, 40_000)
        } else {
            (0, 0)
        };
        res.challenge_list.push(Challenge {
            challenge_id: challenge.id,
            star: progress.map(|progress| progress.star).unwrap_or_default(),
            score_id,
            score_two,
            ..Default::default()
        });
    }

    let mut active_tierce_challenges = common::resources::ENDGAME_TIERCE_CHALLENGE_CONFIG
        .values()
        .filter(|challenge| active_legacy_ids.contains(&challenge.pre_challenge_maze_id))
        .collect::<Vec<_>>();
    active_tierce_challenges.sort_unstable_by_key(|challenge| challenge.id);
    for challenge in active_tierce_challenges {
        let mode_id = challenge_mode(challenge.id)
            .endgame_key()
            .unwrap_or_default();
        let progress = player
            .challenge_progress
            .get(&mode_id)
            .and_then(|records| records.get(&challenge.id));
        let (score_id, score_two) = if mode_id == 2 {
            (40_000, 40_000)
        } else {
            (0, 0)
        };
        res.challenge_list.push(Challenge {
            challenge_id: challenge.id,
            star: progress.map(|progress| progress.star).unwrap_or_default(),
            score_id,
            score_two,
            ..Default::default()
        });
    }

    // Memory of Chaos is gated by the 15 Last Vestiges of Towering Citadel
    // stages. The client derives that gate from these legacy challenge records.
    // Expose those prerequisite clears explicitly so the newer modes are usable
    // on fresh server profiles that do not have legacy challenge history.
    for challenge_id in 1..=15 {
        if ENDGAME_CHALLENGE_CONFIG.contains_key(&challenge_id) {
            res.challenge_list.push(Challenge {
                challenge_id,
                star: 7,
                taken_reward: 42,
                ..Default::default()
            });
        }
    }

    let mut challenge_group_ids = latest_group_by_mode
        .values()
        .copied()
        .collect::<BTreeSet<_>>();
    challenge_group_ids.insert(100);
    res.challenge_group_list = challenge_group_ids
        .into_iter()
        .map(|group_id| ChallengeGroup {
            group_id,
            ..Default::default()
        })
        .collect();

    for (level, reward_display_type) in [(15, 101_015), (12, 101_212), (4, 101_404), (4, 101_404)] {
        res.max_level_list.push(ChallengeHistoryMaxLevel {
            level,
            reward_display_type,
            ..Default::default()
        });
    }
}

#[cfg(test)]
mod tests {
    use super::{known_endgame_challenges, resolve_endgame_node};
    use common::resources::{ENDGAME_CHALLENGE_CONFIG, ENDGAME_SCENE_CONFIG};
    use std::collections::HashSet;

    #[test]
    fn includes_all_configured_endgame_rooms() {
        let challenges = known_endgame_challenges();
        let ids = challenges.iter().map(|(id, _)| *id).collect::<HashSet<_>>();

        assert_eq!(challenges.len(), 843);
        assert_eq!(ids.len(), 843);
        assert!(ids.contains(&1));
        assert!(ids.contains(&5612));
        assert!(ids.contains(&20011));
        assert!(ids.contains(&20284));
        assert!(ids.contains(&30011));
        assert!(ids.contains(&30234));

        let mut resolved_nodes = 0;
        for challenge in ENDGAME_CHALLENGE_CONFIG.values() {
            for node_id in [1, 2] {
                let Some(node) = resolve_endgame_node(challenge.id, node_id) else {
                    continue;
                };
                resolved_nodes += 1;
                assert!(!node.stage.monster_list.is_empty());
                assert!(node.stage.monster_list.iter().all(|wave| !wave.is_empty()));
            }
        }
        assert_eq!(resolved_nodes, 1676);

        for (entry_id, group_ids) in [(3000205, [6, 7]), (3014003, [6, 7])] {
            let entry = ENDGAME_SCENE_CONFIG
                .get(&entry_id)
                .expect("challenge fallback scene should exist");
            assert!(group_ids.into_iter().all(|group_id| {
                entry.values().any(|floor| {
                    floor.scenes.values().any(|scene| {
                        scene
                            .monsters
                            .iter()
                            .any(|monster| monster.group_id == group_id)
                    })
                })
            }));
        }
    }
}

pub async fn on_get_cur_challenge_cs_req(
    session: &mut PlayerSession,
    _req: &GetCurChallengeCsReq,
    res: &mut GetCurChallengeScRsp,
) {
    let Some(player) = session.json_data.get() else {
        res.retcode = 2806;
        return;
    };
    let (Some(challenge_id), Some(node_id)) = (
        player.battle_config.challenge_id,
        player.battle_config.challenge_node,
    ) else {
        return;
    };
    let Some(node) = resolve_endgame_node(challenge_id, node_id) else {
        res.retcode = 2801;
        return;
    };

    res.cur_challenge = Some(challenge_cur_info(&node));
    res.lineup_list.push(challenge_lineup_info(
        &player.lineups,
        player.scene.plane_id,
        node_id,
    ));
}

pub async fn on_scene_cast_skill_cs_req(
    session: &mut PlayerSession,
    req: &SceneCastSkillCsReq,
    res: &mut SceneCastSkillScRsp,
) {
    res.cast_entity_id = req.cast_entity_id;

    let target_position = req
        .target_motion
        .as_ref()
        .and_then(|motion| motion.pos.as_ref());

    let targets = req
        .hit_target_entity_id_list
        .iter()
        .chain(&req.assist_monster_entity_id_list)
        // Entity IDs are allocated by the scene and can fall in the range
        // 1,000..=30,000. These are still valid hit targets; only zero is an
        // unset ID. Filtering by an arbitrary range silently blocked some
        // Tierce rooms from starting combat.
        .filter(|id| **id != 0)
        .collect::<Vec<_>>();

    let position_spawn_target = session.json_data.get().and_then(|player| {
        let target_position = target_position?;
        player
            .spawned_monsters
            .iter()
            .filter(|spawned| {
                spawned.entry_id == player.scene.entry_id
                    && spawned.plane_id == player.scene.plane_id
                    && spawned.floor_id == player.scene.floor_id
            })
            .map(|spawned| {
                let dx = i128::from(target_position.x) - i128::from(spawned.position.x);
                let dy = i128::from(target_position.y) - i128::from(spawned.position.y);
                let dz = i128::from(target_position.z) - i128::from(spawned.position.z);
                (spawned, dx * dx + dy * dy + dz * dz)
            })
            .filter(|(_, distance_squared)| *distance_squared <= 2_500i128 * 2_500)
            .min_by_key(|(_, distance_squared)| *distance_squared)
            .map(|(spawned, _)| (spawned.entity_id, spawned.monster_id))
    });
    // Some clients send nearby map monster IDs in the assist list even when
    // the dynamic entity added by the server is the intended encounter. Since
    // spawn replaces prior command-spawned entities in a scene, there is at
    // most one eligible record here; use it as a final fallback for a cast.
    let scene_spawn_target = session.json_data.get().and_then(|player| {
        let mut spawned = player.spawned_monsters.iter().filter(|spawned| {
            spawned.entry_id == player.scene.entry_id
                && spawned.plane_id == player.scene.plane_id
                && spawned.floor_id == player.scene.floor_id
        });
        let first = spawned.next()?;
        spawned
            .next()
            .is_none()
            .then_some((first.entity_id, first.monster_id))
    });
    let fallback_spawn_target = position_spawn_target.or(scene_spawn_target);

    if targets.is_empty() && fallback_spawn_target.is_none() {
        let is_active_challenge = session.json_data.get().is_some_and(|player| {
            player.battle_config.challenge_id.is_some() && player.challenge_origin_scene.is_some()
        });
        if !is_active_challenge {
            tracing::warn!(
                "scene cast skill has no targets (hit_targets={:?}, assist_targets={:?})",
                req.hit_target_entity_id_list,
                req.assist_monster_entity_id_list
            );
            return;
        }

        // Tierce challenge scenes may send the opening cast before assigning a
        // target entity ID. The active challenge already carries its exact wave
        // in BattleConfig, so start that configured encounter instead of
        // returning an empty response and leaving the client stuck in-scene.
        tracing::warn!(
            "starting active challenge battle from targetless scene cast (challenge_id={:?}, skill_index={})",
            session
                .json_data
                .get()
                .and_then(|player| player.battle_config.challenge_id),
            req.skill_index
        );
    }

    // Scope the temporary config to attacks against spawned scene entities.
    // Otherwise their custom wave remains active and contaminates every later
    // battle, including battles started after toggling EX-RANK.
    if let Some(player) = session.json_data.get_mut() {
        let spawned_target = player
            .spawned_monsters
            .iter()
            .find(|spawned| {
                spawned.entry_id == player.scene.entry_id
                    && spawned.plane_id == player.scene.plane_id
                    && spawned.floor_id == player.scene.floor_id
                    && targets.iter().any(|target| **target == spawned.entity_id)
            })
            .map(|spawned| (spawned.entity_id, spawned.monster_id))
            .or(fallback_spawn_target);
        if !player.spawned_monsters.is_empty() {
            tracing::info!(
                "Scene cast target resolution: scene=({}, {}, {}), hit_targets={:?}, assist_targets={:?}, target_motion={:?}, attacked_by={}, spawned_targets={:?}",
                player.scene.entry_id,
                player.scene.plane_id,
                player.scene.floor_id,
                req.hit_target_entity_id_list,
                req.assist_monster_entity_id_list,
                target_position.map(|position| (position.x, position.y, position.z)),
                req.attacked_by_entity_id,
                player
                    .spawned_monsters
                    .iter()
                    .filter(|spawned| {
                        spawned.entry_id == player.scene.entry_id
                            && spawned.plane_id == player.scene.plane_id
                            && spawned.floor_id == player.scene.floor_id
                    })
                    .map(|spawned| (spawned.entity_id, spawned.monster_id))
                    .collect::<Vec<_>>()
            );
        }
        if let Some((entity_id, monster_id)) = spawned_target {
            if player.spawned_battle_config.is_none() {
                player.spawned_battle_config = Some(player.battle_config.clone());
            }
            if let Some(original_config) = player.spawned_battle_config.as_ref() {
                let mut spawn_config = original_config.clone();
                spawn_config.battle_type = BattleType::Default;
                spawn_config.challenge_id = None;
                spawn_config.challenge_group_id = None;
                spawn_config.challenge_node = None;
                spawn_config.challenge_second_lineup = None;
                spawn_config.custom_battle_lineup = None;
                spawn_config.stage_id = 201012311;
                spawn_config.cycle_count = 30;
                spawn_config.blessings.clear();
                spawn_config.monsters = vec![vec![Monster {
                    level: 95,
                    monster_id,
                    max_hp: 0,
                }]];
                player.battle_config = spawn_config;
                player.spawned_battle_active = true;
                tracing::info!(
                    "Starting spawned monster battle entity_id={entity_id} monster_id={monster_id}"
                );
            }
        } else if !player.spawned_monsters.is_empty() {
            tracing::warn!(
                "Scene cast did not match a saved spawned monster; using configured battle monsters (stage_id={}, monsters={:?})",
                player.battle_config.stage_id,
                player
                    .battle_config
                    .monsters
                    .iter()
                    .flatten()
                    .map(|monster| monster.monster_id)
                    .collect::<Vec<_>>()
            );
        }
    }

    let battle_info = create_battle_info(session, req.attacked_by_entity_id, req.skill_index).await;

    res.cast_entity_id = req.cast_entity_id;
    res.battle_info = Some(battle_info);
}

async fn create_battle_info(
    session: &mut PlayerSession,
    caster_id: u32,
    skill_index: u32,
) -> SceneBattleInfo {
    // if let Some(player) = session.json_data.get_mut() {
    //     let _ = player.refresh_persistent().await;
    // }

    let Some(player) = session.json_data.get() else {
        tracing::error!("data is not set!");
        return SceneBattleInfo::default();
    };

    let mut battle_info = SceneBattleInfo {
        stage_id: player.battle_config.stage_id,
        logic_random_seed: rand::rng().random::<u32>(),
        battle_id: 1,
        rounds_limit: player.battle_config.cycle_count,
        world_level: 6,
        ..Default::default()
    };

    let is_calyx = caster_id == 0 && skill_index == 0;
    let mut has_dahlia = false;
    let mut first_avatar_id = 0;
    let mut first_avatar_idx = 9999;

    let lineup_uwu = if let Some(custom) = &player.battle_config.custom_battle_lineup {
        custom.iter()
    } else {
        player.lineups.iter()
    };

    // avatars
    for (avatar_index, avatar_id) in lineup_uwu {
        if first_avatar_id == 0 {
            first_avatar_id = *avatar_id;
            first_avatar_idx = *avatar_index;
        }
        if !has_dahlia {
            has_dahlia = *avatar_id == 1321;
        }

        let is_trailblazer = *avatar_id == 8001;
        let is_march = *avatar_id == 1001;

        let avatar_id = if is_trailblazer {
            player.main_character as u32
        } else if is_march {
            player.march_type as u32
        } else {
            *avatar_id
        };

        if let Some(avatar) = player.avatars.get(&avatar_id) {
            let (mut battle_avatar, techs) = avatar.to_battle_avatar_proto(
                *avatar_index,
                player
                    .lightcones
                    .iter()
                    .find(|v| v.equip_avatar == avatar.avatar_id),
                player
                    .relics
                    .iter()
                    .filter(|v| v.equip_avatar == avatar.avatar_id)
                    .collect::<Vec<_>>(),
            );

            if avatar.unlocked_enhanced_id.is_some() {
                if !player.enable_ex_rank.unwrap_or(true) {
                    battle_avatar.igdehgikfja.clear();
                }
            }

            if !battle_avatar.igdehgikfja.is_empty() {
                tracing::info!(
                    "[EX-RANK] BattleAvatar id={} enhanced_id={} ex_rank_ids={:?}",
                    battle_avatar.id,
                    battle_avatar.enhanced_id,
                    battle_avatar.igdehgikfja
                );
            }

            battle_info.buff_list.extend(techs);

            if caster_id > 0
                && *avatar_index == (caster_id - 1)
                && let Some(avatar_config) = GAME_RES.avatar_configs.get(&avatar_id)
                && !avatar.techniques.contains(&1000119)
            {
                battle_info.buff_list.push(BattleBuff {
                    id: avatar_config.weakness_buff_id,
                    level: 1,
                    owner_index: *avatar_index,
                    wave_flag: 0xffffffff,
                    dynamic_values: HashMap::from([(
                        String::from("SkillIndex"),
                        skill_index as f32,
                    )]),
                    ..Default::default()
                });
            }

            battle_info.battle_avatar_list.push(battle_avatar);

            // hardcoded march
            if avatar.avatar_id == 1224 {
                battle_info.buff_list.push(BattleBuff {
                    id: 122401,
                    level: 3,
                    wave_flag: 0xffffffff,
                    owner_index: *avatar_index,
                    dynamic_values: HashMap::from([
                        (String::from("#ADF_1"), 3f32),
                        (String::from("#ADF_2"), 3f32),
                    ]),
                    target_index_list: vec![0],
                });
            }
        };
    }

    // Hardcoded Cerydra & Danheng PT technique
    // and hardcode dahlia dance partner to 1st in lineup
    let first_avatar_attack_id = if let Some(c) = GAME_RES.avatar_configs.get(&first_avatar_id) {
        c.weakness_buff_id
    } else {
        0
    };

    let len = battle_info.buff_list.len();
    let mut has_replaced = false;
    let mut dahlia_buffs = Vec::new();
    for (i, buff) in battle_info.buff_list.iter_mut().enumerate() {
        let is_last = i == len - 1;

        if buff.id == 141202 || buff.id == 141403 {
            buff.owner_index = first_avatar_idx;
            continue;
        }

        // this is actually useless because there is 0 attack buff id in calyx but idc
        if has_dahlia
            && is_calyx
            && let 1000111..=1000117 = buff.id
            && !has_replaced
            && first_avatar_attack_id != 0
        {
            buff.id = first_avatar_attack_id;
            buff.owner_index = first_avatar_idx;
            has_replaced = true;
        }

        if has_dahlia && is_calyx && !has_replaced && first_avatar_attack_id != 0 && is_last {
            dahlia_buffs.push(BattleBuff {
                id: 1000121,
                level: 1,
                wave_flag: u32::MAX,
                target_index_list: vec![first_avatar_idx],
                ..Default::default()
            });

            dahlia_buffs.push(BattleBuff {
                id: first_avatar_attack_id,
                level: 1,
                wave_flag: u32::MAX,
                target_index_list: vec![first_avatar_idx],
                dynamic_values: HashMap::from([(
                    String::from("SkillIndex"),
                    first_avatar_idx as f32,
                )]),
                ..Default::default()
            });
        }
    }

    if !dahlia_buffs.is_empty() {
        battle_info.buff_list.extend(dahlia_buffs);
    }

    // custom stats for avatars
    for stat in &player.battle_config.custom_stats {
        for avatar in &mut battle_info.battle_avatar_list {
            if avatar.relic_list.is_empty() {
                avatar.relic_list.push(BattleRelic {
                    id: 61011,
                    main_affix_id: 1,
                    level: 1,
                    ..Default::default()
                })
            }

            if let Some(sub_affix) = avatar.relic_list[0]
                .sub_affix_list
                .iter_mut()
                .find(|v| v.affix_id == stat.sub_affix_id)
            {
                sub_affix.cnt = stat.count;
            } else {
                avatar.relic_list[0].sub_affix_list.push(RelicAffix {
                    affix_id: stat.sub_affix_id,
                    cnt: stat.count,
                    step: stat.step,
                })
            }
        }
    }

    // blessings
    for blessing in &player.battle_config.blessings {
        let mut buffs = BattleBuff {
            id: blessing.id,
            level: blessing.level,
            wave_flag: 0xffffffff,
            owner_index: 0xffffffff,
            ..Default::default()
        };

        if let Some(dynamic_value) = &blessing.dynamic_key {
            buffs
                .dynamic_values
                .insert(dynamic_value.key.clone(), dynamic_value.value as f32);
        };

        for dynamic_value in &blessing.dynamic_values {
            if buffs.dynamic_values.contains_key(&dynamic_value.key) {
                continue;
            };
            buffs
                .dynamic_values
                .insert(dynamic_value.key.clone(), dynamic_value.value as f32);
        }

        battle_info.buff_list.push(buffs);
    }

    // pf score object
    if player.battle_config.battle_type == BattleType::PF {
        if battle_info.stage_id >= 30309011 {
            battle_info.battle_target_info.insert(
                1,
                BattleTargetList {
                    battle_target_list: vec![BattleTarget {
                        id: 10003,
                        progress: 0,
                        ..Default::default()
                    }],
                },
            );
        } else {
            battle_info.battle_target_info.insert(
                1,
                BattleTargetList {
                    battle_target_list: vec![BattleTarget {
                        id: 10002,
                        progress: 0,
                        ..Default::default()
                    }],
                },
            );
        }

        for i in 2..=4 {
            battle_info
                .battle_target_info
                .insert(i, BattleTargetList::default());
        }

        battle_info.battle_target_info.insert(
            5,
            BattleTargetList {
                battle_target_list: vec![
                    BattleTarget {
                        id: 2001,
                        progress: 0,
                        ..Default::default()
                    },
                    BattleTarget {
                        id: 2002,
                        progress: 0,
                        ..Default::default()
                    },
                ],
            },
        );
    }

    // Apocalyptic Shadow
    if player.battle_config.battle_type == BattleType::AS {
        battle_info.battle_target_info.insert(
            1,
            BattleTargetList {
                battle_target_list: vec![BattleTarget {
                    id: 90005,
                    progress: 0,
                    ..Default::default()
                }],
            },
        );
    }

    //  SU
    if player.battle_config.battle_type == BattleType::SU {
        battle_info.battle_event.push(BattleEventBattleInfo {
            battle_event_id: player.battle_config.path_resonance_id,
            status: Some(BattleEventProperty {
                sp_bar: Some(SpBarInfo {
                    cur_sp: 10_000,
                    max_sp: 10_000,
                }),
            }),
            skill_info: Vec::with_capacity(0),
            ..Default::default()
        })
    }

    // Monsters
    battle_info.monster_wave_list = Monster::to_scene_monster_waves(&player.battle_config.monsters);

    // Rogue Magic
    // TODO: i dont need these shit
    if !player.battle_config.scepters.is_empty() {
        // battle_info.battle_rogue_magic_info = Some(BattleRogueMagicInfo {
        //     detail_info: Some(BattleRogueMagicDetailInfo {
        //         paiigoggofj: Some(Item::BattleRogueMagicData(BattleRogueMagicData {
        //             round_cnt: Some(BattleRogueMagicRoundCount {
        //                 gpojenhaiba: 3,
        //                 kljklbmlefo: 0,
        //             }),
        //             battle_scepter_list: player
        //                 .battle_config
        //                 .scepters
        //                 .iter()
        //                 .map(|scepter| {
        //                     let mut battle_scepter = BattleRogueMagicScepter {
        //                         level: scepter.level,
        //                         scepter_id: scepter.id,
        //                         magic_list: Vec::new(),
        //                         trench_count: HashMap::from([(3, 0), (4, 0), (5, 0)]),
        //                     };
        //
        //                     let mut index = [0u32; 3];
        //
        //                     for component in &scepter.components {
        //                         let (slot_type, locked) = match component.component_type {
        //                             RogueMagicComponentType::Passive => (3u32, false),
        //                             RogueMagicComponentType::Active => (4, true),
        //                             RogueMagicComponentType::Attach => (5, false),
        //                         };
        //
        //                         let slot_index = &mut index[slot_type as usize - 3];
        //                         battle_scepter.magic_list.push(BattleRogueMagicUnit {
        //                             level: component.level,
        //                             unit_id: component.id,
        //                             slot_id: *slot_index,
        //                             locked,
        //                             counter_map: Default::default(),
        //                         });
        //                         *slot_index += 1;
        //                         *battle_scepter.trench_count.get_mut(&slot_type).unwrap() += 1;
        //                     }
        //
        //                     battle_scepter
        //                 })
        //                 .collect(),
        //         })),
        //     }),
        //     modifier_content: Some(BattleRogueMagicModifierInfo {
        //         rogue_magic_battle_const: 5,
        //     }),
        // });
    }

    // Global buffs
    let (mut has_castorice_global_buff, mut has_silver_wolf_global_buff) = (false, false);
    for buff in &battle_info.buff_list {
        if buff.id == 140703 {
            has_castorice_global_buff = true;
        }
        if buff.id == 150602 {
            has_silver_wolf_global_buff = true;
        }
    }

    if !has_castorice_global_buff && player.enable_castorice_global.unwrap_or(true) {
        battle_info.buff_list.push(BattleBuff {
            id: 140703,
            level: 1,
            owner_index: u32::MAX,
            wave_flag: u32::MAX,
            target_index_list: Vec::with_capacity(0),
            dynamic_values: HashMap::with_capacity(0),
        });
    }

    if !has_silver_wolf_global_buff && player.enable_sw_global.unwrap_or(true) {
        battle_info.buff_list.push(BattleBuff {
            id: 150602,
            level: 1,
            owner_index: u32::MAX,
            wave_flag: u32::MAX,
            target_index_list: Vec::with_capacity(0),
            dynamic_values: HashMap::with_capacity(0),
        });
    }

    battle_info
}
