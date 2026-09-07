use std::process::Child;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use crate::packet_db;

#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub static GLOBAL_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DecodedPacketDto {
    pub id: usize,
    pub cmd_id: u32,
    pub source: String, // "client" | "server"
    pub name: Option<String>,
    pub head: Vec<u8>,
    pub body: Vec<u8>,
    pub body_json: Option<String>,
    pub request_id: Option<u64>,
    pub custom_packet: bool,
    pub timestamp: u64,
}

pub static GLOBAL_PACKETS: Mutex<Vec<DecodedPacketDto>> = Mutex::new(Vec::new());

pub fn lookup_cmd_name(cmd_id: u32) -> String {
    if let Some(name) = packet_db::lookup_packet_name(cmd_id) {
        return name.to_string();
    }
    String::new()
}

pub fn push_packet(cmd_id: u32, source: &str) {
    let mut guard = GLOBAL_PACKETS.lock().unwrap();
    let id = guard.len() + 1;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let mut name = lookup_cmd_name(cmd_id);
    if name.is_empty() {
        name = format!("Cmd_{cmd_id}");
    }
    guard.push(DecodedPacketDto {
        id,
        cmd_id,
        source: source.to_string(),
        name: Some(name),
        head: Vec::new(),
        body: Vec::new(),
        body_json: None,
        request_id: None,
        custom_packet: false,
        timestamp: now,
    });
    if guard.len() > 3000 {
        guard.remove(0);
    }
}

pub fn chrono_now() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let hours = (now / 3600) % 24;
    let minutes = (now / 60) % 60;
    let seconds = now % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

pub fn push_log(line: impl Into<String>) {
    let mut guard = GLOBAL_LOGS.lock().unwrap();
    let msg = line.into();
    guard.push(msg);
    if guard.len() > 1000 {
        guard.remove(0);
    }
}

#[derive(Default)]
pub struct AppState {
    pub sdk_child: Mutex<Option<Child>>,
    pub game_child: Mutex<Option<Child>>,
}
