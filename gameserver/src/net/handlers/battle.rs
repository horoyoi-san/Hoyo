use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use anyhow::Result;
use rand::RngExt;

use common::{
    resources::{ENDGAME_CHALLENGE_CONFIG, GAME_RES, EndgameNode, resolve_endgame_node},
    structs::{AvatarJson, BattleBuffJson, BattleType, Monster, Position, Scene},
};

use super::*;

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
        avatar_lineup.iter().map(|avatar| avatar.id).collect::<Vec<_>>()
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
    let Some(json) = session.json_data.get_mut() else {
        anyhow::bail!("player data is not set");
    };
    let previous_lineups = std::mem::replace(&mut json.lineups, lineup.clone());
    let scene_result = super::scene::load_scene(session, node.entry_id, false, None).await;
    if let Some(json) = session.json_data.get_mut() {
        json.lineups = previous_lineups;
    }
    let mut scene = scene_result?;

    let group = scene
        .entity_group_list
        .iter_mut()
        .find(|group| group.group_id == node.group_id)
        .ok_or_else(|| anyhow::anyhow!("challenge spawn group {} is missing", node.group_id))?;
    let mut spawn_motion = None;
    let mut entities = Vec::with_capacity(group.entity_list.len());
    for mut entity in group.entity_list.drain(..) {
        if let Some(scene_entity_info::Entity::NpcMonster(monster)) = entity.entity.as_mut() {
            if spawn_motion.is_some() {
                continue;
            }
            monster.monster_id = node.monster_id;
            monster.event_id = node.event_id;
            monster.world_level = 6;
            spawn_motion = entity.motion.clone();
        }
        entities.push(entity);
    }
    group.entity_list = entities;

    let spawn_motion = spawn_motion
        .ok_or_else(|| anyhow::anyhow!("challenge spawn monster is missing"))?;
    let spawn_pos = spawn_motion
        .pos
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("challenge spawn position is missing"))?;
    let spawn_rot = spawn_motion.rot.as_ref();
    let spawn_position = Position {
        x: spawn_pos.x,
        y: spawn_pos.y,
        z: spawn_pos.z,
        rot_y: spawn_rot.map(|rot| rot.y).unwrap_or_default(),
    };

    if let Some(player_group) = scene
        .entity_group_list
        .iter_mut()
        .find(|group| group.group_id == 0)
    {
        for entity in &mut player_group.entity_list {
            if matches!(entity.entity, Some(scene_entity_info::Entity::Actor(_))) {
                entity.motion = Some(spawn_motion.clone());
            }
        }
    }

    Ok((scene, spawn_position))
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
        score_id: if battle_type == BattleType::PF { 40_000 } else { 0 },
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
    info.extra_lineup_type = if node == 1 {
        ExtraLineupType::LineupChallenge as i32
    } else {
        ExtraLineupType::LineupChallenge2 as i32
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

    let (mut scene, spawn_position) = match load_challenge_scene(session, &node, &first_lineup).await
    {
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
        res.scene.as_ref().map(|scene| scene.plane_id).unwrap_or_default(),
        1,
    ));
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
        configure_challenge_battle(
            player,
            &node,
            &lineup,
            &second_lineup,
        );
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

    if req.end_status != BattleEndStatus::BattleEndWin as i32 {
        return;
    }

    let Some(player) = session.json_data.get_mut() else {
        return;
    };
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

    let mut group_ids = BTreeSet::new();
    let mut known_ids = HashSet::new();
    for (challenge_id, group_id) in known_endgame_challenges() {
        known_ids.insert(challenge_id);
        group_ids.insert(group_id);

        let (level, reward_display_type, score_id, score_two) = if challenge_id > 20_000 {
            (
                4,
                101_404,
                if challenge_id < 30_000 { 40_000 } else { 0 },
                if challenge_id < 30_000 { 40_000 } else { 0 },
            )
        } else {
            (12, 101_212, 0, 0)
        };

        res.challenge_list.push(Challenge {
            challenge_id,
            star: 7,
            taken_reward: 42,
            score_id,
            score_two,
            ..Default::default()
        });
        res.max_level_list.push(ChallengeHistoryMaxLevel {
            level,
            reward_display_type,
            ..Default::default()
        });
    }

    for records in player.challenge_progress.values() {
        for (challenge_id, progress) in records {
            if !known_ids.insert(*challenge_id) {
                continue;
            }

            res.challenge_list.push(Challenge {
                challenge_id: *challenge_id,
                star: progress.star,
                ..Default::default()
            });
            if progress.group_id != 0 {
                group_ids.insert(progress.group_id);
            }
        }
    }

    res.challenge_group_list = group_ids
        .into_iter()
        .map(|group_id| ChallengeGroup {
            group_id,
            ..Default::default()
        })
        .collect();
}

#[cfg(test)]
mod tests {
    use super::{known_endgame_challenges, resolve_endgame_node};
    use common::resources::{
        ENDGAME_CHALLENGE_CONFIG, ENDGAME_SCENE_CONFIG,
    };
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

    let targets = req
        .hit_target_entity_id_list
        .iter()
        .chain(&req.assist_monster_entity_id_list)
        .filter(|id| **id > 30_000 || **id < 1_000)
        .collect::<Vec<_>>();

    if targets.is_empty() {
        tracing::warn!("scene cast skill target is empty!");
        return;
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
            let (battle_avatar, techs) = avatar.to_battle_avatar_proto(
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
