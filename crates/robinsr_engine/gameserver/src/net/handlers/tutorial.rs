use std::sync::LazyLock;
use anyhow::Result;

use crate::net::NetPacket;
use crate::net::session::PlayerSession;
use super::game_data::{ALL_TUTORIAL_GUIDE_IDS, ALL_TUTORIAL_IDS};

// Precompute GetTutorialGuideScRsp (cmd 1675)
static TUTORIAL_GUIDE_RSP: LazyLock<Vec<u8>> = LazyLock::new(|| {
    let mut body = Vec::new();
    // tag 3: retcode = 0
    body.extend_from_slice(&[0x18, 0x00]);

    for &guide_id in ALL_TUTORIAL_GUIDE_IDS {
        let mut item = Vec::new();
        // tag 1: status = 2 (TUTORIAL_FINISH)
        item.extend_from_slice(&[0x08, 0x02]);
        // tag 15: id
        item.push(0x78);
        prost::encoding::encode_varint(guide_id as u64, &mut item);

        // tag 15: length-delimited
        body.push(0x7A);
        prost::encoding::encode_varint(item.len() as u64, &mut body);
        body.extend_from_slice(&item);
    }
    body
});

// Precompute GetTutorialScRsp (cmd 1625)
static TUTORIAL_RSP: LazyLock<Vec<u8>> = LazyLock::new(|| {
    let mut body = Vec::new();
    // tag 4: retcode = 0
    body.extend_from_slice(&[0x20, 0x00]);

    for &tut_id in ALL_TUTORIAL_IDS {
        let mut item = Vec::new();
        // tag 1: id
        item.push(0x08);
        prost::encoding::encode_varint(tut_id as u64, &mut item);
        // tag 2: status = 2 (TUTORIAL_FINISH)
        item.extend_from_slice(&[0x10, 0x02]);

        // tag 10: length-delimited
        body.push(0x52);
        prost::encoding::encode_varint(item.len() as u64, &mut body);
        body.extend_from_slice(&item);
    }
    body
});

pub async fn handle_get_tutorial_guide(session: &PlayerSession) -> Result<()> {
    tracing::info!("handle_get_tutorial_guide: returning {} completed guides", ALL_TUTORIAL_GUIDE_IDS.len());
    session.send_raw(NetPacket {
        cmd_type: 1675,
        head: Vec::new(),
        body: TUTORIAL_GUIDE_RSP.clone(),
    }).await?;
    Ok(())
}

pub async fn handle_get_tutorial(session: &PlayerSession) -> Result<()> {
    tracing::info!("handle_get_tutorial: returning {} completed tutorials", ALL_TUTORIAL_IDS.len());
    session.send_raw(NetPacket {
        cmd_type: 1625,
        head: Vec::new(),
        body: TUTORIAL_RSP.clone(),
    }).await?;
    Ok(())
}

pub async fn handle_unlock_tutorial_guide(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let mut buf = payload;
    let mut group_id = 0u32;
    while !buf.is_empty() {
        if let Ok(tag) = prost::encoding::decode_varint(&mut buf) {
            let fn_num = tag >> 3;
            let wt = tag & 7;
            if fn_num == 13 && wt == 0 {
                if let Ok(val) = prost::encoding::decode_varint(&mut buf) {
                    group_id = val as u32;
                }
                break;
            } else if wt == 0 {
                let _ = prost::encoding::decode_varint(&mut buf);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    let mut body = Vec::new();
    // tag 5: retcode = 0
    body.extend_from_slice(&[0x28, 0x00]);

    // tag 7: tutorial_guide (TutorialGuide)
    let mut item = Vec::new();
    // tag 1: status = 2 (TUTORIAL_FINISH)
    item.extend_from_slice(&[0x08, 0x02]);
    // tag 15: id = group_id
    item.push(0x78);
    prost::encoding::encode_varint(group_id as u64, &mut item);

    body.push(0x3A);
    prost::encoding::encode_varint(item.len() as u64, &mut body);
    body.extend_from_slice(&item);

    session.send_raw(NetPacket {
        cmd_type: 1656,
        head: Vec::new(),
        body,
    }).await?;
    Ok(())
}

pub async fn handle_unlock_tutorial(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let mut buf = payload;
    let mut tutorial_id = 0u32;
    while !buf.is_empty() {
        if let Ok(tag) = prost::encoding::decode_varint(&mut buf) {
            let fn_num = tag >> 3;
            let wt = tag & 7;
            if fn_num == 12 && wt == 0 {
                if let Ok(val) = prost::encoding::decode_varint(&mut buf) {
                    tutorial_id = val as u32;
                }
                break;
            } else if wt == 0 {
                let _ = prost::encoding::decode_varint(&mut buf);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    let mut body = Vec::new();
    // tag 11: retcode = 0
    body.extend_from_slice(&[0x58, 0x00]);

    // tag 15: tutorial (Tutorial)
    let mut item = Vec::new();
    // tag 1: id = tutorial_id
    item.push(0x08);
    prost::encoding::encode_varint(tutorial_id as u64, &mut item);
    // tag 2: status = 2 (TUTORIAL_FINISH)
    item.extend_from_slice(&[0x10, 0x02]);

    body.push(0x7A);
    prost::encoding::encode_varint(item.len() as u64, &mut body);
    body.extend_from_slice(&item);

    session.send_raw(NetPacket {
        cmd_type: 1616,
        head: Vec::new(),
        body,
    }).await?;
    Ok(())
}

pub async fn handle_finish_tutorial(session: &PlayerSession) -> Result<()> {
    session.send_raw(NetPacket {
        cmd_type: 1615,
        head: Vec::new(),
        body: vec![0x08, 0x00],
    }).await?;
    Ok(())
}

pub async fn handle_finish_tutorial_guide(session: &PlayerSession) -> Result<()> {
    session.send_raw(NetPacket {
        cmd_type: 1639,
        head: Vec::new(),
        body: vec![0x08, 0x00],
    }).await?;
    Ok(())
}
