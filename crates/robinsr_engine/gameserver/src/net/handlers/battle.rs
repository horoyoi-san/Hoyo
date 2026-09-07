use std::collections::HashMap;

use rand::RngExt;

use common::{
    resources::GAME_RES,
    structs::{BattleType, Monster},
};

use super::*;

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
    _session: &mut PlayerSession,
    req: &PveBattleResultCsReq,
    res: &mut PveBattleResultScRsp,
) {
    res.end_status = req.end_status;
    res.battle_id = req.battle_id;
}

pub async fn on_scene_cast_skill_cs_req(
    session: &mut PlayerSession,
    req: &SceneCastSkillCsReq,
    res: &mut SceneCastSkillScRsp,
) {
    res.retcode = 0;
    res.cast_entity_id = req.cast_entity_id;

    let mut target_ids: Vec<u32> = req.assist_monster_entity_id_list.clone();
    for &id in &req.hit_target_entity_id_list {
        if !target_ids.contains(&id) {
            target_ids.push(id);
        }
    }

    if !target_ids.is_empty() {
        let monster_battle_infos: Vec<HitMonsterBattleInfo> = target_ids
            .iter()
            .map(|&id| HitMonsterBattleInfo {
                target_monster_entity_id: id,
                monster_battle_type: MonsterBattleType::Dolgjfjblni as i32, // MONSTER_BATTLE_TYPE_TRIGGER_BATTLE
            })
            .collect();

        res.monster_battle_info = monster_battle_infos;

        let battle_info = create_battle_info(session, req.attacked_by_entity_id, req.skill_index).await;
        res.battle_info = Some(battle_info);
    } else {
        res.monster_battle_info = Vec::new();
        res.battle_info = None;
    }
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

    let challenge_lineup: Vec<(u32, u32)> = if session.challenge_state.is_in_challenge
        && !session.challenge_state.avatar_ids.is_empty()
    {
        session
            .challenge_state
            .avatar_ids
            .iter()
            .enumerate()
            .map(|(i, &id)| (i as u32, id))
            .collect()
    } else {
        Vec::new()
    };

    let custom_lineup: Vec<(u32, u32)> = if !challenge_lineup.is_empty() {
        Vec::new()
    } else if let Some(custom) = &player.battle_config.custom_battle_lineup {
        custom.iter().map(|(&k, &v)| (k, v)).collect()
    } else {
        player.lineups.iter().map(|(&k, &v)| (k, v)).collect()
    };

    let lineup_uwu: &[(u32, u32)] = if !challenge_lineup.is_empty() {
        &challenge_lineup
    } else {
        &custom_lineup
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
    let in_challenge = session.challenge_state.is_in_challenge || player.battle_config.battle_type == BattleType::AA;
    let target_stage_id = if session.challenge_state.is_in_challenge && session.challenge_state.event_id != 0 {
        session.challenge_state.event_id
    } else {
        player.battle_config.stage_id
    };

    if in_challenge {
        battle_info.stage_id = target_stage_id;
        battle_info.rounds_limit = if session.challenge_state.challenge_mode == 1 { 4 } else { player.battle_config.cycle_count.max(30) };

        if let Some(stage_entry) = common::structs::CHALLENGE_RES.stages.get(&target_stage_id) {
            let monster_waves: Vec<Vec<Monster>> = stage_entry.monster_list.iter().map(|wave| {
                wave.iter().map(|&id| Monster {
                    monster_id: id,
                    level: stage_entry.level,
                    max_hp: 0,
                }).collect()
            }).collect();
            battle_info.monster_wave_list = Monster::to_scene_monster_waves(&monster_waves);
        } else if let Some(stage_data) = challenge::CHALLENGE_DATA.stages.get(&target_stage_id) {
            let monster_waves: Vec<Vec<Monster>> = stage_data.monsters.iter().map(|wave| {
                wave.iter().map(|&id| Monster {
                    monster_id: id,
                    level: stage_data.level,
                    max_hp: 0,
                }).collect()
            }).collect();
            battle_info.monster_wave_list = Monster::to_scene_monster_waves(&monster_waves);
        } else if !player.battle_config.monsters.is_empty() {
            battle_info.monster_wave_list = Monster::to_scene_monster_waves(&player.battle_config.monsters);
        }

        // Add challenge blessings/buffs
        let mut challenge_buffs = Vec::new();
        if session.challenge_state.buff_id != 0 {
            challenge_buffs.push(session.challenge_state.buff_id);
        }
        if session.challenge_state.maze_buff_id != 0 {
            challenge_buffs.push(session.challenge_state.maze_buff_id);
        }
        for buff_id in challenge_buffs {
            battle_info.buff_list.push(BattleBuff {
                id: buff_id,
                level: 1,
                owner_index: 0xffffffff,
                wave_flag: 0xffffffff,
                target_index_list: vec![0],
                dynamic_values: HashMap::from([(String::from("SkillIndex"), 0.0)]),
                ..Default::default()
            });
        }

        // Setup scoring targets for PF & AS
        if session.challenge_state.challenge_mode == 1 {
            let pf_target = if session.challenge_state.node == 1 {
                BattleTarget { id: 10003, progress: 0, total_progress: 80000 }
            } else {
                BattleTarget { id: 10003, progress: 40000, total_progress: 80000 }
            };
            battle_info.battle_target_info.insert(1, BattleTargetList { battle_target_list: vec![pf_target] });
            for i in 2..=4 {
                battle_info.battle_target_info.insert(i, BattleTargetList::default());
            }
            battle_info.battle_target_info.insert(5, BattleTargetList {
                battle_target_list: vec![
                    BattleTarget { id: 2001, progress: 0, total_progress: 0 },
                    BattleTarget { id: 2002, progress: 0, total_progress: 0 },
                ],
            });
        } else if session.challenge_state.challenge_mode == 2 {
            battle_info.battle_target_info.insert(1, BattleTargetList {
                battle_target_list: vec![BattleTarget { id: 90005, progress: 2000, total_progress: 0 }],
            });
        }
    } else if let Some(stage_entry) = common::structs::CHALLENGE_RES.stages.get(&target_stage_id) {
        let monster_waves: Vec<Vec<Monster>> = stage_entry.monster_list.iter().map(|wave| {
            wave.iter().map(|&id| Monster {
                monster_id: id,
                level: stage_entry.level,
                max_hp: 0,
            }).collect()
        }).collect();
        battle_info.monster_wave_list = Monster::to_scene_monster_waves(&monster_waves);
    } else if let Some(stage_data) = challenge::CHALLENGE_DATA.stages.get(&target_stage_id) {
        let monster_waves: Vec<Vec<Monster>> = stage_data.monsters.iter().map(|wave| {
            wave.iter().map(|&id| Monster {
                monster_id: id,
                level: stage_data.level,
                max_hp: 0,
            }).collect()
        }).collect();
        battle_info.monster_wave_list = Monster::to_scene_monster_waves(&monster_waves);
    } else {
        battle_info.monster_wave_list = Monster::to_scene_monster_waves(&player.battle_config.monsters);
    }

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
