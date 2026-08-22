use super::CheatPacketRequest;
use hsr_ipc::{BackendEvent, PacketSource, SnifferEvent};
use std::sync::Mutex;
use std::time::{Duration, Instant};

const REQ: &str = "GetPlayerDetailInfoCsReq";
const RSP: &str = "GetPlayerDetailInfoScRsp";
const AVATAR_RSP: &str = "GetAvatarDataScRsp";
const BAG_RSP: &str = "GetBagScRsp";
const AVATAR_REQ: &str = "GetAvatarDataCsReq";
const BAG_REQ: &str = "GetBagCsReq";
const GEAR_CHANGED: [&str; 8] = [
    "DressAvatarCsReq",
    "DressRelicAvatarCsReq",
    "SetAvatarPathCsReq",
    "TakeOffEquipmentCsReq",
    "TakeOffRelicCsReq",
    "UnlockSkilltreeCsReq",
    "AvatarExpUpCsReq",
    "ExpUpEquipmentCsReq",
];

static LAST_REFRESH: Mutex<Option<Instant>> = Mutex::new(None);

pub fn start() {
    crate::pages::uid::install_transport(send_detail);

    std::thread::spawn(|| {
        for event in crate::ipc::subscribe() {
            let BackendEvent::Sniffer(SnifferEvent::Packet(packet)) = event else {
                continue;
            };
            let Some(name) = crate::proto::store::message_name(packet.cmd_id) else {
                continue;
            };
            if GEAR_CHANGED.contains(&name.as_str()) {
                request_own_refresh();
                continue;
            }
            let deliver: fn(String) = match name.as_str() {
                RSP => crate::pages::uid::deliver_detail_json,
                AVATAR_RSP => crate::pages::uid::deliver_avatar_json,
                BAG_RSP => crate::pages::uid::deliver_bag_json,
                _ => continue,
            };
            if let Some(json) = crate::proto::store::decode_body(packet.cmd_id, &packet.body) {
                deliver(json);
            }
        }
    });
}

fn request_own_refresh() {
    {
        let mut last = LAST_REFRESH.lock().unwrap();
        if let Some(at) = *last
            && at.elapsed() < Duration::from_millis(600)
        {
            return;
        }
        *last = Some(Instant::now());
    }

    if !crate::ipc::is_connected() {
        return;
    }
    if crate::proto::store::cmd_id_for_name(AVATAR_REQ).is_none()
        || crate::proto::store::cmd_id_for_name(BAG_REQ).is_none()
    {
        return;
    }
    crate::cheat::service::dispatch_requests(vec![
        CheatPacketRequest {
            message_name: AVATAR_REQ,
            body_json: serde_json::json!({ "is_get_all": true }),
            source: PacketSource::Client,
        },
        CheatPacketRequest {
            message_name: BAG_REQ,
            body_json: serde_json::json!({}),
            source: PacketSource::Client,
        },
    ]);
}

fn send_detail(uid: u32) -> Result<(), String> {
    if !crate::ipc::is_connected() {
        return Err("game not connected".into());
    }
    if crate::proto::store::cmd_id_for_name(REQ).is_none() {
        return Err("proto not loaded".into());
    }
    crate::cheat::service::dispatch_requests(vec![CheatPacketRequest {
        message_name: REQ,
        body_json: serde_json::json!({ "uid": uid }),
        source: PacketSource::Client,
    }]);
    Ok(())
}
