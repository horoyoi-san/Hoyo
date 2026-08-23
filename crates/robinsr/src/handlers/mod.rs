use anyhow::Result;
use crate::protocol::{DynamicOpcodeRegistry, NetPacket};
use dashmap::DashMap;
use std::sync::Arc;

pub struct PlayerSession {
    pub uid: u32,
    pub nickname: String,
    pub level: u32,
    pub cur_scene_id: u32,
    pub cur_floor_id: u32,
    pub cur_lineup_avatars: Vec<u32>,
    pub world_x: f32,
    pub world_y: f32,
    pub world_z: f32,
}

impl Default for PlayerSession {
    fn default() -> Self {
        Self {
            uid: 10001,
            nickname: "Trailblazer".to_string(),
            level: 70,
            cur_scene_id: 20311, // Penacony Grand Theater
            cur_floor_id: 1,
            cur_lineup_avatars: vec![1308, 1212, 1001, 1004], // Acheron, Jingliu, March 7th, Welt
            world_x: 0.0,
            world_y: 0.0,
            world_z: 0.0,
        }
    }
}

pub type SessionStore = Arc<DashMap<u32, PlayerSession>>;

/// Dynamically routes incoming packets based on the active Opcode Registry.
/// Automatically adapts to new beta versions without modifying server code.
pub async fn route_packet_dynamic(
    session: &mut PlayerSession,
    packet: &NetPacket,
    registry: &DynamicOpcodeRegistry,
) -> Result<Option<NetPacket>> {
    let packet_name = match registry.get_name(packet.cmd_id) {
        Some(name) => name,
        None => {
            crate::emit_log(format!("[DYNAMIC ROUTER] ⚠ Unmapped packet CmdId: {} (Raw Len: {} bytes)", packet.cmd_id, packet.body.len()));
            return Ok(None);
        }
    };

    crate::emit_log(format!(
        "[DYNAMIC ROUTER] 📨 Ingested Client Packet '{}' (CmdId: {}) | UID: {}",
        packet_name,
        packet.cmd_id,
        session.uid
    ));

    match packet_name.as_str() {
        "PlayerGetTokenCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00, 0x10, (session.uid & 0x7F) as u8];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Auth Token OK -> Dispatched PlayerGetTokenScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "PlayerLoginCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00, 0x10, 0x01];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Player Login OK -> Dispatched PlayerLoginScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "GetCurLineupDataCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Lineup Data OK -> Dispatched GetCurLineupDataScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "GetSceneInfoCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Scene Info OK -> Dispatched GetSceneInfoScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "EnterSceneCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Enter Scene OK -> Dispatched EnterSceneScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "StartBattleCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Start Battle OK -> Dispatched StartBattleScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "SceneCastSkillCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Cast Skill OK -> Dispatched SceneCastSkillScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        "SendMsgCsReq" => {
            let rsp_cmd = registry.get_rsp_id(packet.cmd_id).unwrap_or(packet.cmd_id + 1);
            let rsp_body = vec![0x08, 0x00];
            crate::emit_log(format!("[DYNAMIC ROUTER] 📤 Chat Message OK -> Dispatched SendMsgScRsp (CmdId: {})", rsp_cmd));
            Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
        }
        _ => {
            // Autonomous default handler: if a response packet exists, dispatch generic success payload
            if let Some(rsp_cmd) = registry.get_rsp_id(packet.cmd_id) {
                crate::emit_log(format!("[DYNAMIC ROUTER] 🔄 Auto-responding generic OK for '{}' -> CmdId: {}", packet_name, rsp_cmd));
                let rsp_body = vec![0x08, 0x00];
                Ok(Some(NetPacket::new(rsp_cmd, vec![], rsp_body)))
            } else {
                crate::emit_log(format!("[DYNAMIC ROUTER] ℹ One-way packet '{}' (CmdId: {}) received", packet_name, packet.cmd_id));
                Ok(None)
            }
        }
    }
}
