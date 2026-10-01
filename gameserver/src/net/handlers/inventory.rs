use common::{resources::GAME_RES, sr_tools::FreesrData};
use proto::{get_big_data_all_recommend_sc_rsp::RecommendType, *};
use prost::Message;

use crate::net::{NetPacket, PlayerSession};

use super::BASE_AVATAR_IDS;

pub const GET_BAG_45_REQUEST_CMD_ID: u16 = 534;
pub const GET_AVATAR_DATA_45_REQUEST_CMD_ID: u16 = 334;

#[derive(Clone, PartialEq, Message)]
struct RelicAffix45 {
    #[prost(uint32, tag = "1")]
    affix_id: u32,
    #[prost(uint32, tag = "2")]
    cnt: u32,
    #[prost(uint32, tag = "3")]
    step: u32,
}

#[derive(Clone, PartialEq, Message)]
struct Relic45 {
    #[prost(uint32, tag = "1")]
    unique_id: u32,
    #[prost(uint32, tag = "2")]
    dress_avatar_id: u32,
    #[prost(message, repeated, tag = "3")]
    sub_affix_list: Vec<RelicAffix45>,
    #[prost(uint32, tag = "4")]
    level: u32,
    #[prost(message, repeated, tag = "5")]
    preview_sub_affix_list: Vec<RelicAffix45>,
    #[prost(uint32, tag = "6")]
    exp: u32,
    #[prost(bool, tag = "7")]
    is_protected: bool,
    #[prost(message, repeated, tag = "8")]
    reforge_sub_affix_list: Vec<RelicAffix45>,
    #[prost(uint32, tag = "10")]
    reforge_block_sub_affix_id: u32,
    #[prost(uint32, tag = "11")]
    tid: u32,
    #[prost(bool, tag = "14")]
    is_discarded: bool,
    #[prost(uint32, tag = "15")]
    main_affix_id: u32,
}

#[derive(Clone, PartialEq, Message)]
struct Material45 {
    #[prost(uint32, tag = "3")]
    num: u32,
    #[prost(uint32, tag = "8")]
    tid: u32,
    #[prost(uint64, tag = "15")]
    expire_time: u64,
}

#[derive(Clone, PartialEq, Message)]
struct Equipment45 {
    #[prost(uint32, tag = "1")]
    level: u32,
    #[prost(uint32, tag = "3")]
    unique_id: u32,
    #[prost(uint32, tag = "6")]
    exp: u32,
    #[prost(uint32, tag = "7")]
    promotion: u32,
    #[prost(bool, tag = "8")]
    is_protected: bool,
    #[prost(uint32, tag = "9")]
    dress_avatar_id: u32,
    #[prost(uint32, tag = "14")]
    rank: u32,
    #[prost(uint32, tag = "15")]
    tid: u32,
}

#[derive(Clone, PartialEq, Message)]
struct GetBag45ScRsp {
    #[prost(message, repeated, tag = "4")]
    material_list: Vec<Material45>,
    #[prost(message, repeated, tag = "9")]
    relic_list: Vec<Relic45>,
    #[prost(message, repeated, tag = "10")]
    equipment_list: Vec<Equipment45>,
    #[prost(uint32, tag = "3")]
    retcode: u32,
}

#[derive(Clone, PartialEq, Message)]
struct GetAvatarData45CsReq {
    #[prost(bool, tag = "8")]
    is_get_all: bool,
    #[prost(uint32, repeated, tag = "12")]
    requested_avatar_ids: Vec<u32>,
}

#[derive(Clone, PartialEq, Message)]
struct AvatarPathSkillTree45 {
    #[prost(uint32, tag = "8")]
    point_id: u32,
    #[prost(uint32, tag = "11")]
    level: u32,
}

#[derive(Clone, PartialEq, Message)]
struct EquipRelic45 {
    #[prost(uint32, tag = "5")]
    relic_type: u32,
    #[prost(uint32, tag = "15")]
    relic_unique_id: u32,
}

#[derive(Clone, PartialEq, Message)]
struct Avatar45 {
    #[prost(uint32, tag = "2")]
    cur_multi_path_avatar_type: u32,
    #[prost(uint32, tag = "4")]
    level: u32,
    #[prost(uint32, tag = "7")]
    equipment_unique_id: u32,
    #[prost(uint64, tag = "9")]
    first_met_time_stamp: u64,
    #[prost(bool, tag = "10")]
    is_marked: bool,
    #[prost(uint32, repeated, tag = "12")]
    has_taken_promotion_reward_list: Vec<u32>,
    #[prost(uint32, tag = "13")]
    promotion: u32,
    #[prost(uint32, tag = "14")]
    exp: u32,
    #[prost(uint32, tag = "15")]
    base_avatar_id: u32,
}

#[derive(Clone, PartialEq, Message)]
struct AvatarPathData45 {
    #[prost(uint32, tag = "1")]
    unk_enhanced_id: u32,
    #[prost(uint32, tag = "2")]
    path_equipment_id: u32,
    #[prost(uint32, tag = "3")]
    avatar_id: u32,
    #[prost(message, repeated, tag = "9")]
    avatar_path_skill_tree: Vec<AvatarPathSkillTree45>,
    #[prost(uint32, tag = "10")]
    rank: u32,
    #[prost(message, repeated, tag = "12")]
    equip_relic_list: Vec<EquipRelic45>,
    #[prost(uint64, tag = "13")]
    unlock_time: u64,
    #[prost(uint32, tag = "14")]
    dressed_skin_id: u32,
}

#[derive(Clone, PartialEq, Message)]
struct GetAvatarData45ScRsp {
    #[prost(uint32, tag = "1")]
    unknown: u32,
    #[prost(uint32, repeated, tag = "2")]
    basic_type_id_list: Vec<u32>,
    #[prost(uint32, tag = "3")]
    retcode: u32,
    #[prost(message, repeated, tag = "7")]
    avatar_path_data_info_list: Vec<AvatarPathData45>,
    #[prost(message, repeated, tag = "8")]
    avatar_list: Vec<Avatar45>,
    #[prost(uint32, tag = "9")]
    unknown_avatar_data: u32,
    #[prost(uint32, repeated, tag = "10")]
    skin_list: Vec<u32>,
    #[prost(bool, tag = "14")]
    is_get_all: bool,
    #[prost(uint32, repeated, tag = "15")]
    extra_avatar_type_list: Vec<u32>,
}

pub async fn on_get_bag_45_compat(session: &PlayerSession) -> anyhow::Result<()> {
    let Some(player) = session.json_data.get() else {
        return Ok(());
    };

    let response = GetBag45ScRsp {
        material_list: vec![
            Material45 { tid: 101, num: 67, expire_time: 0 },
            Material45 { tid: 102, num: 67, expire_time: 0 },
        ],
        relic_list: player
            .relics
            .iter()
            .map(|relic| Relic45 {
                unique_id: relic.get_unique_id(),
                dress_avatar_id: relic.equip_avatar,
                sub_affix_list: relic.sub_affixes.iter().map(|affix| RelicAffix45 {
                    affix_id: affix.sub_affix_id,
                    cnt: affix.count,
                    step: affix.step,
                }).collect(),
                level: relic.level,
                preview_sub_affix_list: Vec::new(),
                exp: 0,
                is_protected: false,
                reforge_sub_affix_list: Vec::new(),
                reforge_block_sub_affix_id: 0,
                tid: relic.relic_id,
                is_discarded: false,
                main_affix_id: relic.main_affix_id,
            })
            .collect(),
        equipment_list: player
            .lightcones
            .iter()
            .map(|lightcone| Equipment45 {
                level: lightcone.level,
                unique_id: lightcone.get_unique_id(),
                exp: 0,
                promotion: lightcone.promotion,
                is_protected: false,
                dress_avatar_id: lightcone.equip_avatar,
                rank: lightcone.rank,
                tid: lightcone.item_id,
            })
            .collect(),
        retcode: 0,
    };
    let mut body = Vec::new();
    response.encode(&mut body)?;
    session
        .send_raw(NetPacket {
            cmd_type: 525,
            head: Vec::new(),
            body,
        })
        .await
}

pub async fn on_get_avatar_data_45_compat(
    session: &PlayerSession,
    payload: &[u8],
) -> anyhow::Result<()> {
    let request = GetAvatarData45CsReq::decode(payload)?;
    let Some(player) = session.json_data.get() else {
        return Ok(());
    };

    let avatar_list = BASE_AVATAR_IDS
        .into_iter()
        .map(|id| {
            let avatar = player.avatars.get(&id).map(|avatar| {
                avatar.to_avatar_proto(
                    player.lightcones.iter().find(|lightcone| lightcone.equip_avatar == id),
                    player.main_character as u32,
                    player.march_type as u32,
                )
            }).unwrap_or(Avatar {
                base_avatar_id: id,
                level: 80,
                promotion: 6,
                first_met_time_stamp: 1_712_924_677,
                cur_multi_path_avatar_type: 0,
                equipment_unique_id: 0,
                has_taken_promotion_reward_list: vec![1, 3, 5],
                is_marked: false,
                exp: 0,
            });

            Avatar45 {
                cur_multi_path_avatar_type: avatar.cur_multi_path_avatar_type,
                level: avatar.level,
                equipment_unique_id: avatar.equipment_unique_id,
                first_met_time_stamp: avatar.first_met_time_stamp,
                is_marked: avatar.is_marked,
                has_taken_promotion_reward_list: avatar.has_taken_promotion_reward_list,
                promotion: avatar.promotion,
                exp: avatar.exp,
                base_avatar_id: avatar.base_avatar_id,
            }
        })
        .collect();

    let avatar_path_data_info_list = player
        .avatars
        .values()
        .map(|avatar| {
            let path_data = avatar.to_avatar_path_data_proto(
                player.lightcones.iter().find(|lightcone| lightcone.equip_avatar == avatar.avatar_id),
                player.relics.iter().filter(|relic| relic.equip_avatar == avatar.avatar_id).collect(),
            );
            AvatarPathData45 {
                unk_enhanced_id: path_data.unk_enhanced_id,
                path_equipment_id: path_data.path_equipment_id,
                avatar_id: path_data.avatar_id,
                avatar_path_skill_tree: path_data.avatar_path_skill_tree.into_iter().map(|skill| {
                    AvatarPathSkillTree45 { point_id: skill.anchor_type, level: skill.level }
                }).collect(),
                rank: path_data.rank,
                equip_relic_list: path_data.equip_relic_list.into_iter().map(|relic| {
                    EquipRelic45 { relic_type: relic.r#type, relic_unique_id: relic.relic_unique_id }
                }).collect(),
                unlock_time: path_data.unlock_timestamp,
                dressed_skin_id: path_data.dressed_skin_id,
            }
        })
        .collect();

    let response = GetAvatarData45ScRsp {
        unknown: 0,
        basic_type_id_list: Vec::new(),
        retcode: 0,
        avatar_path_data_info_list,
        avatar_list,
        unknown_avatar_data: 0,
        skin_list: Vec::new(),
        is_get_all: request.is_get_all,
        extra_avatar_type_list: Vec::new(),
    };
    let mut body = Vec::new();
    response.encode(&mut body)?;
    session
        .send_raw(NetPacket {
            cmd_type: 325,
            head: Vec::new(),
            body,
        })
        .await
}

pub async fn on_get_bag_cs_req(
    session: &mut PlayerSession,
    _req: &GetBagCsReq,
    res: &mut GetBagScRsp,
) {
    let Some(player) = session.json_data.get() else {
        tracing::error!("data is not set!");
        return;
    };

    res.equipment_list = player.lightcones.iter().map(|v| v.into()).collect();
    res.relic_list = player.relics.iter().map(|v| v.into()).collect();
    res.material_list = vec![
        Material {
            tid: 101, // Normal Pass
            num: 67,
            ..Default::default()
        },
        Material {
            tid: 102, // Special Pass
            num: 67,
            ..Default::default()
        },
    ];
}

pub async fn on_get_archive_data_cs_req(
    _session: &mut PlayerSession,
    _: &GetArchiveDataCsReq,
    res: &mut GetArchiveDataScRsp,
) {
    res.archive_data = Some(ArchiveData::default());
}

pub async fn on_dress_relic_avatar_cs_req(
    session: &mut PlayerSession,
    req: &DressRelicAvatarCsReq,
    _: &mut DressRelicAvatarScRsp,
) {
    let Some(player) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return;
    };

    if let Some(pkt) = equip_relic(player, req) {
        let _ = session.send(pkt).await;
    };
}

pub async fn on_take_off_relic_cs_req(
    session: &mut PlayerSession,
    req: &TakeOffRelicCsReq,
    _: &mut TakeOffRelicScRsp,
) {
    let Some(player) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return;
    };

    if let Some(pkt) = unequip_relic(player, req) {
        let _ = session.send(pkt).await;
    };
}

pub async fn on_dress_avatar_cs_req(
    session: &mut PlayerSession,
    req: &DressAvatarCsReq,
    _: &mut DressAvatarScRsp,
) {
    let Some(player) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return;
    };

    if let Some(pkt) = set_lightcone_equipper(player, req.avatar_id, req.equipment_unique_id) {
        let _ = session.send(pkt).await;
    };
}

pub async fn on_take_off_equipment_cs_req(
    session: &mut PlayerSession,
    req: &TakeOffEquipmentCsReq,
    _: &mut TakeOffEquipmentScRsp,
) {
    let Some(player) = session.json_data.get_mut() else {
        tracing::error!("data is not set!");
        return;
    };

    if let Some(pkt) = set_lightcone_equipper(player, req.avatar_id, 0) {
        let _ = session.send(pkt).await;
    };
}

pub async fn on_get_big_data_all_recommend_cs_req(
    _: &mut PlayerSession,
    req: &GetBigDataAllRecommendCsReq,
    res: &mut GetBigDataAllRecommendScRsp,
) {
    res.big_data_recommend_type = req.big_data_recommend_type;

    match req.big_data_recommend_type() {
        BigDataRecommendType::RelicAvatar => {
            res.recommend_type = Some(RecommendType::RelicAvatar(BigDataRecommendRelicAvatar {
                recommended_avatar_info_list: GAME_RES
                    .relic_avatar_recommend
                    .iter()
                    .map(|(set_id, avatar_list)| RecomendedAvatarInfo {
                        avatar_id_list: avatar_list.clone(),
                        recommend_avatar_id: avatar_list.first().copied().unwrap_or_default(),
                        relic_set_id: *set_id,
                    })
                    .collect(),
            }))
        }
        BigDataRecommendType::AvatarRelic => {
            res.recommend_type = Some(RecommendType::AvatarRelic(BigDataRecommendAvatarRelic {
                recomended_relic_info_list: BASE_AVATAR_IDS
                    .into_iter()
                    .map(|avatar_id| BigDataAvatarRelicRecommend {
                        avatar_id,
                        ..Default::default()
                    })
                    .collect(),
            }))
        }
        _ => {}
    }
}

pub async fn on_rank_up_avatar_cs_req(
    session: &mut PlayerSession,
    req: &RankUpAvatarCsReq,
    _: &mut RankUpAvatarScRsp,
) -> Option<()> {
    let player = session.json_data.get_mut()?;
    let avatar = player.avatars.get_mut(&req.avatar_id)?;

    avatar.data.rank = req.rank;

    let avatar_id = avatar.avatar_id;

    let mut ret = PlayerSyncScNotify::default();

    build_sync(
        player,
        &mut ret,
        vec![avatar_id],
        Vec::with_capacity(0),
        Vec::with_capacity(0),
    );

    let _ = session.send(ret).await;

    Some(())
}

// TODO: move these somewhere else?

fn set_lightcone_equipper(
    player: &mut FreesrData,
    target_avatar: u32,
    target_lightcone_uid: u32,
) -> Option<PlayerSyncScNotify> {
    let mut ret = PlayerSyncScNotify::default();

    let target_avatar = player.avatars.get(&target_avatar)?;

    let cur_avatar_lc_idx = player
        .lightcones
        .iter()
        .position(|l| l.equip_avatar == target_avatar.avatar_id);

    // undress
    if target_lightcone_uid == 0
        && let Some(cur_avatar_lc_idx) = cur_avatar_lc_idx
    {
        player.lightcones[cur_avatar_lc_idx].equip_avatar = 0;

        build_sync(
            player,
            &mut ret,
            vec![target_avatar.avatar_id],
            vec![cur_avatar_lc_idx],
            Vec::with_capacity(0),
        );

        return Some(ret);
    }

    let target_lightcone_idx = player
        .lightcones
        .iter()
        .position(|l| l.get_unique_id() == target_lightcone_uid)?;

    // jika avatar sekarang sedang pakai LC, kita tukar pemiliknya dengan pemilik dari LC target
    if let Some(cur_avatar_lc_idx) = cur_avatar_lc_idx {
        player.lightcones[cur_avatar_lc_idx].equip_avatar =
            player.lightcones[target_lightcone_idx].equip_avatar;
    }

    let avatars_sync = vec![
        player.lightcones[target_lightcone_idx].equip_avatar, // old
        target_avatar.avatar_id,                              // cur
    ];

    // set kepemilikan lightcone barunya ke avatar sekarang
    player.lightcones[target_lightcone_idx].equip_avatar = target_avatar.avatar_id;

    build_sync(
        player,
        &mut ret,
        avatars_sync,
        [Some(target_lightcone_idx), cur_avatar_lc_idx]
            .into_iter()
            .flatten()
            .collect(),
        Vec::with_capacity(0),
    );

    Some(ret)
}

fn equip_relic(player: &mut FreesrData, req: &DressRelicAvatarCsReq) -> Option<PlayerSyncScNotify> {
    let mut ret = PlayerSyncScNotify::default();

    let target_avatar = player.avatars.get(&req.avatar_id)?;

    let mut avatar_ids_to_sy = vec![];
    let mut relic_index_to_sync = vec![];

    for param in &req.switch_list {
        let Some(target_relic_idx) = player
            .relics
            .iter()
            .position(|v| v.get_unique_id() == param.relic_unique_id)
        else {
            continue;
        };

        let cur_avatar_relic_idx = player.relics.iter().position(|r| {
            r.equip_avatar == target_avatar.avatar_id && r.get_slot() == param.relic_type
        });

        // jika avatar sekarang sedang pakai LC, kita tukar pemiliknya dengan pemilik dari LC target
        if let Some(cur_avatar_relic_idx) = cur_avatar_relic_idx {
            avatar_ids_to_sy.push(player.relics[cur_avatar_relic_idx].equip_avatar);
            player.relics[cur_avatar_relic_idx].equip_avatar =
                player.relics[target_relic_idx].equip_avatar;

            relic_index_to_sync.push(cur_avatar_relic_idx);
        }

        // old owner
        avatar_ids_to_sy.push(player.relics[target_relic_idx].equip_avatar);

        // set kepemilikan relic barunya ke avatar sekarang
        player.relics[target_relic_idx].equip_avatar = target_avatar.avatar_id;

        // new owner
        avatar_ids_to_sy.push(player.relics[target_relic_idx].equip_avatar);

        relic_index_to_sync.push(target_relic_idx);
    }

    build_sync(
        player,
        &mut ret,
        avatar_ids_to_sy,
        Vec::with_capacity(0),
        relic_index_to_sync,
    );

    Some(ret)
}

fn unequip_relic(player: &mut FreesrData, req: &TakeOffRelicCsReq) -> Option<PlayerSyncScNotify> {
    let mut ret = PlayerSyncScNotify::default();

    let target_avatar = player.avatars.get(&req.avatar_id)?;

    let mut relic_index_to_sync = vec![];

    for slot in &req.relic_type_list {
        let relics = player
            .relics
            .iter()
            .enumerate()
            .filter(|(_, r)| r.equip_avatar == target_avatar.avatar_id && r.get_slot() == *slot)
            .map(|(i, _)| i)
            .collect::<Vec<_>>();

        for relic_idx in &relics {
            player.relics[*relic_idx].equip_avatar = 0;
        }

        relic_index_to_sync.extend(relics);
    }

    build_sync(
        player,
        &mut ret,
        vec![req.avatar_id],
        Vec::with_capacity(0),
        relic_index_to_sync,
    );

    Some(ret)
}

fn build_sync(
    player: &mut FreesrData,
    ret: &mut PlayerSyncScNotify,
    avatar_ids: Vec<u32>,
    lightcone_indexes: Vec<usize>,
    relic_indexes: Vec<usize>,
) {
    let avatar_list = avatar_ids
        .iter()
        .filter_map(|id| {
            player.get_avatar_proto(*id, player.main_character as u32, player.march_type as u32)
        })
        .collect::<Vec<_>>();

    let avatar_path_data_info_list = avatar_ids
        .into_iter()
        .filter_map(|id| player.get_avatar_path_data_proto(id))
        .collect();

    ret.avatar_sync = Some(AvatarSync {
        avatar_list,
        avatar_path_data_info_list,
    });
    ret.relic_list = relic_indexes
        .into_iter()
        .map(|id| (&player.relics[id]).into())
        .collect();
    ret.equipment_list = lightcone_indexes
        .into_iter()
        .map(|id| (&player.lightcones[id]).into())
        .collect();
}
