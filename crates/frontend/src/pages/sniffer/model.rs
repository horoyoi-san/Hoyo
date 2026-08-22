use std::rc::Rc;

use hsr_ipc::DecodedPacket;

use super::utils;

#[derive(Clone)]
pub(super) struct PacketRowCache {
    pub(super) cmd_id_text: String,
    pub(super) name: String,
    pub(super) name_lower: String,
    pub(super) pid_text: String,
    pub(super) len_text: String,
    pub(super) body_preview: String,
}

#[derive(Clone)]
pub(super) struct PacketInfoCache {
    pub(super) name: String,
    pub(super) cmd_id: String,
    pub(super) source: String,
    pub(super) pid: String,
    pub(super) cs_sc: String,
    pub(super) body_len: String,
    pub(super) raw_head_base64: String,
    pub(super) decoded_head: String,
}

#[derive(Clone)]
pub(super) struct PacketNameEntry {
    pub(super) cmd_id: u32,
    pub(super) cmd_id_text: String,
    pub(super) name: String,
    pub(super) search_name: String,
}

pub(super) struct RedecodePacket {
    pub(super) id: u64,
    pub(super) cmd_id: u32,
    pub(super) body: Vec<u8>,
}

pub(super) struct RedecodeResult {
    pub(super) id: u64,
    pub(super) name: Option<String>,
    pub(super) body_json: Option<String>,
}

impl PacketNameEntry {
    fn new(cmd_id: u32, name: String) -> Self {
        Self {
            cmd_id,
            cmd_id_text: cmd_id.to_string(),
            search_name: name.to_lowercase(),
            name,
        }
    }
}

#[allow(dead_code)]
pub(super) fn resolve_cmd(input: &str) -> Option<u32> {
    input
        .parse::<u32>()
        .ok()
        .or_else(|| crate::proto::store::cmd_id_for_name(input))
}

pub(super) fn sorted_packet_names() -> Vec<PacketNameEntry> {
    let mut names = crate::proto::store::packet_names();
    names.sort_by(|a, b| a.1.cmp(&b.1));
    names
        .into_iter()
        .map(|(cmd_id, name)| PacketNameEntry::new(cmd_id, name))
        .collect()
}

pub(super) fn all_indices(len: usize) -> Rc<[usize]> {
    Rc::from((0..len).collect::<Vec<_>>().into_boxed_slice())
}

pub(super) fn packet_row_cache(packet: &DecodedPacket) -> PacketRowCache {
    let name = packet
        .name
        .clone()
        .or_else(|| crate::proto::store::message_name(packet.cmd_id))
        .unwrap_or_else(|| format!("Cmd {}", packet.cmd_id));
    let body_preview = packet
        .body_json
        .as_deref()
        .map(utils::compact_preview)
        .unwrap_or_default();

    PacketRowCache {
        cmd_id_text: packet.cmd_id.to_string(),
        name_lower: name.to_lowercase(),
        name,
        pid_text: utils::packet_head_pid(&packet.head).to_string(),
        len_text: packet.body.len().to_string(),
        body_preview,
    }
}
