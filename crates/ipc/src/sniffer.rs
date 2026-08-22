use serde::{Deserialize, Serialize};

use crate::packet::DecodedPacket;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SnifferCommand {
    Start,
    Stop,
    ClearPackets,
    SendPacket {
        source: crate::packet::PacketSource,
        cmd_id: u32,
        head: Vec<u8>,
        body: Vec<u8>,
    },
    SendPackets {
        packets: Vec<RawPacket>,
    },
    SetHookCmdIds(Vec<u16>),
    PacketModifyResponse {
        request_id: u32,
        body: Vec<u8>,
        drop_packet: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct RawPacket {
    pub source: crate::packet::PacketSource,
    pub cmd_id: u32,
    pub head: Vec<u8>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SnifferEvent {
    Packet(DecodedPacket),
    Cleared,
    SendPacketResult { ok: bool, error: Option<String> },
    SendPacketsResult { ok: bool, error: Option<String> },
}
