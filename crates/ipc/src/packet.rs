use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedPacket {
    pub id: u64,
    pub cmd_id: u32,
    pub source: PacketSource,
    pub name: Option<String>,
    pub head: Vec<u8>,
    pub body: Vec<u8>,
    pub body_json: Option<String>,
    pub request_id: Option<u32>,
    #[serde(default)]
    pub custom_packet: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PacketSource {
    Client,
    Server,
}
