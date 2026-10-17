use super::*;

pub const BASE_AVATAR_IDS: [u32; 89] = [
    8001, 1001, //
    //
    1002, 1003, 1004, 1005, 1006, 1008, 1009, 1013, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108,
    1109, 1110, 1111, 1112, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212,
    1213, 1214, 1215, 1217, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1312, 1315, 1310,
    1314, 1218, 1221, 1220, 1222, 1223, 1317, 1313, 1225, 1402, 1401, 1404, 1403, 1405, 1407, 1406,
    1409, 1014, 1015, 1408, 1410, 1412, 1413, 1414, 1415, 1321, 1501, 1502, 1503, 1504, 1505, 1506,
    1507, 1508, 1509, 1510, 1512, 1513, 1511,
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
                    cur_multi_path_avatar_type: 0,
                    equipment_unique_id: 0,
                    has_taken_promotion_reward_list: vec![1, 3, 5],
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
    let Some(json) = session.json_data.get_mut() else {
        return;
    };
    let Some(avatar) = json.avatars.get_mut(&req.avatar_id) else {
        return;
    };
    avatar.enhanced_id = if req.enhanced_id == 0 {
        None
    } else {
        Some(req.enhanced_id)
    };
    res.growth_avatar_id = avatar.avatar_id;
    res.unk_enhanced_id = req.enhanced_id;
    res.retcode = 0;
    if let Some(player) = session.json_data.get() {
        player.save_persistent().await;
    }
    let _ = session.sync_player().await;
}

pub const EX_RANK_UNLOCK_CMD_ID: u16 = 400;

#[derive(Clone, PartialEq, prost::Message)]
struct ExRankUnlockScRsp {
    #[prost(uint32, tag = "2")]
    retcode: u32,
}

// handleExRankUnlock handles CmdID 400 (Affinitive Eidolon / Ex-Rank unlock request from client).
pub async fn on_ex_rank_unlock(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    tracing::info!(
        "[EX-RANK] Received cmd 400 (len: {}) payload: {:x?}",
        payload.len(),
        payload
    );

    let mut buf = payload;
    let mut parsed_val = 0u32;
    while !buf.is_empty() {
        let Some(tag) = read_uvarint(&mut buf) else {
            break;
        };
        let wire_type = (tag & 0x7) as u32;
        let field_num = (tag >> 3) as u32;

        if wire_type == 0 {
            if let Some(v) = read_uvarint(&mut buf) {
                tracing::info!("[EX-RANK] field {} = {}", field_num, v);
                if v >= 100_000 || (v >= 1000 && v < 10000 && parsed_val == 0) {
                    parsed_val = v as u32;
                }
                continue;
            }
        }
        skip_wire_field(wire_type, &mut buf);
    }

    let avatar_id = if parsed_val >= 100_000 {
        parsed_val / 100 // e.g. 120401 -> 1204, 121301 -> 1213, 130801 -> 1308
    } else if (1000..10000).contains(&parsed_val) {
        parsed_val
    } else {
        0
    };

    tracing::info!(
        "[EX-RANK] Target avatarID: {} (from val: {})",
        avatar_id,
        parsed_val
    );

    if let Some(player) = session.json_data.get_mut() {
        let targets = if avatar_id == 0 {
            // Fallback: unlock for all avatars that have ExRank defined (1204, 1213, 1308)
            vec![1204, 1213, 1308]
        } else {
            vec![avatar_id]
        };

        for aid in targets {
            if let Some(av) = player.avatars.get_mut(&aid) {
                let eid = if parsed_val >= 100_000 {
                    parsed_val
                } else {
                    aid * 100 + 1
                };
                av.unlocked_enhanced_id = Some(eid);
                tracing::info!("[EX-RANK] Unlocked avatar {} with ex_rank_id={}", aid, eid);
            }
        }
        player.save_persistent().await;
    }

    let rsp = ExRankUnlockScRsp { retcode: 0 };
    let mut body = Vec::new();
    prost::Message::encode(&rsp, &mut body)?;
    session
        .send_raw(NetPacket {
            cmd_type: 395,
            head: Vec::new(),
            body,
        })
        .await?;
    tracing::info!(
        "[EX-RANK] Sent unlock response cmd=395 retcode=0 for value {}",
        parsed_val
    );

    let _ = session.sync_player().await;

    Ok(())
}

fn read_uvarint(buf: &mut &[u8]) -> Option<u64> {
    let mut result = 0u64;
    let mut shift = 0;
    while !buf.is_empty() {
        let byte = buf[0];
        *buf = &buf[1..];
        result |= ((byte & 0x7F) as u64) << shift;
        if (byte & 0x80) == 0 {
            return Some(result);
        }
        shift += 7;
        if shift >= 64 {
            return None;
        }
    }
    None
}

fn skip_wire_field(wire_type: u32, buf: &mut &[u8]) {
    match wire_type {
        0 => {
            let _ = read_uvarint(buf);
        }
        1 => {
            if buf.len() >= 8 {
                *buf = &buf[8..];
            } else {
                *buf = &[];
            }
        }
        2 => {
            if let Some(len) = read_uvarint(buf) {
                let len = len as usize;
                if buf.len() >= len {
                    *buf = &buf[len..];
                } else {
                    *buf = &[];
                }
            }
        }
        5 => {
            if buf.len() >= 4 {
                *buf = &buf[4..];
            } else {
                *buf = &[];
            }
        }
        _ => {
            *buf = &[];
        }
    }
}
