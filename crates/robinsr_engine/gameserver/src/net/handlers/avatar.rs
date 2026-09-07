use super::*;

pub const BASE_AVATAR_IDS: [u32; 88] = [
    8001, 1001, //
    //
    1002, 1003, 1004, 1005, 1006, 1008, 1009, 1013, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108,
    1109, 1110, 1111, 1112, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212,
    1213, 1214, 1215, 1217, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1312, 1315, 1310,
    1314, 1218, 1221, 1220, 1222, 1223, 1317, 1313, 1225, 1402, 1401, 1404, 1403, 1405, 1407, 1406,
    1409, 1014, 1015, 1408, 1410, 1412, 1413, 1414, 1415, 1321, 1501, 1502, 1503, 1504, 1505, 1506,
    1507, 1508, 1509, 1510, 1512, 1513,
];

pub async fn on_get_avatar_data_cs_req(
    session: &mut PlayerSession,
    body: &GetAvatarDataCsReq,
    res: &mut GetAvatarDataScRsp,
) {
    let Some(json) = session.json_data.get() else {
        tracing::error!("data is not set!");
        return;
    };

    res.is_get_all = body.is_get_all;
    res.avatar_list = BASE_AVATAR_IDS
        .into_iter()
        .map(|id| {
            json.avatars
                .get(&id)
                .map(|v| {
                    v.to_avatar_proto(
                        json.lightcones.iter().find(|v| v.equip_avatar == id),
                        json.main_character as u32,
                        json.march_type as u32,
                    )
                })
                .unwrap_or(Avatar {
                    base_avatar_id: id,
                    level: 80,
                    promotion: 6,
                    first_met_time_stamp: 1712924677,
                    cur_multi_path_avatar_type: id,
                    equipment_unique_id: 0,
                    has_taken_promotion_reward_list: vec![1, 2, 3, 4, 5, 6],
                    is_marked: false,
                    exp: 0,
                })
        })
        .collect();

    res.avatar_path_data_info_list = json
        .avatars
        .values()
        .map(|avatar| {
            avatar.to_avatar_path_data_proto(
                json.lightcones
                    .iter()
                    .find(|l| l.equip_avatar == avatar.avatar_id),
                json.relics
                    .iter()
                    .filter(|r| r.equip_avatar == avatar.avatar_id)
                    .collect(),
            )
        })
        .collect();

    res.skin_list = vec![1100101, 1130301, 1131001, 1141501, 1140701, 1150101];
}

pub async fn on_take_promotion_reward_cs_req(
    _session: &mut PlayerSession,
    _req: &TakePromotionRewardCsReq,
    _res: &mut TakePromotionRewardScRsp,
) {
    // retcode defaults to 0, reward_list defaults to empty
    // All avatars already report has_taken_promotion_reward_list = [0..=6] in GetAvatarData
}

pub async fn on_set_avatar_enhanced_id_cs_req(
    session: &mut PlayerSession,
    req: &SetAvatarEnhancedIdCsReq,
    res: &mut SetAvatarEnhancedIdScRsp,
) {
    {
        let Some(json) = session.json_data.get_mut() else {
            return;
        };
        if let Some(avatar) = json.avatars.get_mut(&req.avatar_id) {
            avatar.enhanced_id = if req.enhanced_id == 0 {
                None
            } else {
                Some(req.enhanced_id)
            };
        }
    }
    res.growth_avatar_id = req.avatar_id;
    res.unk_enhanced_id = req.enhanced_id;
    let _ = session.sync_player().await;
}

pub async fn on_set_avatar_path_cs_req(
    session: &mut PlayerSession,
    req: &SetAvatarPathCsReq,
    res: &mut SetAvatarPathScRsp,
) {
    let (base_avatar_id, cur_path, lineup) = {
        let Some(json) = session.json_data.get_mut() else {
            res.retcode = 1;
            return;
        };

        let (base_avatar_id, cur_path) = match req.avatar_id {
            x if x == MultiPathAvatarType::Mar7thKnightType as i32 => {
                json.march_type = common::structs::MultiPathAvatar::MarchPreservation;
                (1001, 1001)
            }
            x if x == MultiPathAvatarType::Mar7thRogueType as i32 => {
                json.march_type = common::structs::MultiPathAvatar::MarchHunt;
                (1001, 1224)
            }
            other => {
                let mp: common::structs::MultiPathAvatar = (other as u32).into();
                json.main_character = mp;
                (8001, other as u32)
            }
        };

        let lineup = common::structs::AvatarJson::to_lineup_info(&json.lineups);
        (base_avatar_id, cur_path, lineup)
    };

    res.retcode = 0;
    res.avatar_id = req.avatar_id;

    let _ = session
        .send(AvatarPathChangedNotify {
            base_avatar_id,
            cur_multi_path_avatar_type: cur_path as i32,
        })
        .await;

    // Sync avatar data
    let _ = session.sync_player().await;

    // Sync lineup with refreshed avatar
    let _ = session
        .send(SyncLineupNotify {
            reason_list: Vec::new(),
            lineup: Some(lineup),
        })
        .await;
}

pub async fn on_dress_avatar_skin_cs_req(
    session: &mut PlayerSession,
    req: &DressAvatarSkinCsReq,
    res: &mut DressAvatarSkinScRsp,
) {
    {
        let Some(json) = session.json_data.get_mut() else {
            res.retcode = 1;
            return;
        };

        if let Some(avatar) = json.avatars.get_mut(&req.avatar_id) {
            avatar.dressed_skin_id = Some(req.skin_id);
        }
    }

    res.retcode = 0;
    let _ = session.sync_player().await;
}

pub async fn on_take_off_avatar_skin_cs_req(
    session: &mut PlayerSession,
    req: &TakeOffAvatarSkinCsReq,
    res: &mut TakeOffAvatarSkinScRsp,
) {
    {
        let Some(json) = session.json_data.get_mut() else {
            res.retcode = 1;
            return;
        };

        if let Some(avatar) = json.avatars.get_mut(&req.avatar_id) {
            avatar.dressed_skin_id = None;
        }
    }

    res.retcode = 0;
    let _ = session.sync_player().await;
}


