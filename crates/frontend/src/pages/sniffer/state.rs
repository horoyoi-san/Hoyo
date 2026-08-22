use std::collections::{HashMap, HashSet};

use gpui::*;
use hsr_ipc::DecodedPacket;

use super::model::{RedecodePacket, RedecodeResult, packet_row_cache, sorted_packet_names};
use super::{SnifferPage, utils};

impl SnifferPage {
    pub(super) fn resolve_name(&self, packet: &DecodedPacket) -> String {
        packet
            .name
            .clone()
            .or_else(|| crate::proto::store::message_name(packet.cmd_id))
            .unwrap_or_else(|| format!("Cmd {}", packet.cmd_id))
    }

    pub(super) fn packet_matches_index(&self, index: usize, query: &str) -> bool {
        if query.is_empty() {
            return true;
        }
        self.packets
            .get(index)
            .zip(self.packet_rows.get(index))
            .is_some_and(|(packet, row)| {
                row.cmd_id_text.contains(query)
                    || row.name_lower.contains(query)
                    || packet
                        .body_json
                        .as_deref()
                        .is_some_and(|body| body.to_lowercase().contains(query))
            })
    }

    pub(super) fn recompute_filtered(&mut self, cx: &App) {
        let query = self.search.read(cx).value().to_lowercase();
        if !self.filtered_dirty && query == self.filtered_query {
            return;
        }
        self.filtered_query = query;
        self.filtered_idx = self
            .packets
            .iter()
            .enumerate()
            .filter(|(index, packet)| {
                !self.excluded.contains(&packet.cmd_id)
                    && self.packet_matches_index(*index, &self.filtered_query)
            })
            .map(|(index, _)| index)
            .collect();
        self.filtered_dirty = false;
    }

    pub fn filtered_names(&self) -> HashSet<String> {
        self.excluded_names.clone()
    }

    pub fn hooked_names(&self) -> HashSet<String> {
        self.hooked_names.clone()
    }

    pub fn apply_config(
        &mut self,
        filtered_names: &HashSet<String>,
        hooked_names: &HashSet<String>,
        cx: &mut Context<Self>,
    ) {
        log::debug!(
            "[SnifferPage] apply_config start: filtered={} hooked={}",
            filtered_names.len(),
            hooked_names.len()
        );
        self.excluded_names.clone_from(filtered_names);
        self.hooked_names.clone_from(hooked_names);
        self.resolve_names();
        self.filtered_dirty = true;
        self.base_dirty = true;
        self.sync_manual_hooks();
        cx.notify();
        log::debug!("[SnifferPage] apply_config done");
    }

    pub(super) fn resolve_names(&mut self) {
        let filtered: HashSet<u32> = self
            .excluded_names
            .iter()
            .filter_map(|name| crate::proto::store::cmd_id_for_name(name))
            .collect();
        let hooked: HashSet<u32> = self
            .hooked_names
            .iter()
            .filter_map(|name| crate::proto::store::cmd_id_for_name(name))
            .collect();
        self.excluded = filtered;
        self.hooked = hooked;
    }

    pub(super) fn recompute_base(&mut self) {
        if !self.base_dirty {
            return;
        }
        self.base_idx = self
            .packets
            .iter()
            .enumerate()
            .filter(|(_, packet)| !self.excluded.contains(&packet.cmd_id))
            .map(|(index, _)| index)
            .collect();
        self.base_dirty = false;
    }

    pub(super) fn base_position(&self, id: u64) -> Option<usize> {
        self.base_idx
            .iter()
            .position(|&p| self.packets.get(p).is_some_and(|packet| packet.id == id))
    }

    pub(super) fn selected_packet(&self) -> Option<&DecodedPacket> {
        self.selected
            .and_then(|id| self.packets.iter().find(|packet| packet.id == id))
    }

    pub(super) fn inspector_text(&self) -> String {
        self.selected_packet().map_or_else(String::new, |packet| {
            packet.body_json.clone().unwrap_or_else(|| {
                serde_json::to_string_pretty(&serde_json::json!({
                    "cmd_id": packet.cmd_id,
                    "source": format!("{:?}", packet.source),
                    "head_hex": utils::hex_encode(&packet.head),
                    "body_hex": utils::hex_encode(&packet.body),
                }))
                .unwrap_or_default()
            })
        })
    }

    pub(super) fn sync_inspector(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected == self.last_inspected {
            return;
        }
        self.last_inspected = self.selected;
        self.info_cache = None;
        let text = self.inspector_text();
        self.inspector_preview = inspector_preview(&text);
        let viewer = self.inspector.clone();
        viewer.update(cx, |state, cx| state.set_value(text, window, cx));
    }

    pub(super) fn redecode_all(&mut self) {
        for packet in &mut self.packets {
            packet.name = crate::proto::store::message_name(packet.cmd_id);
            packet.body_json = crate::proto::store::decode_body(packet.cmd_id, &packet.body);
        }
        self.packet_rows = self.packets.iter().map(packet_row_cache).collect();
        self.refresh_send_names();
        self.last_inspected = None;
        self.filtered_dirty = true;
        self.info_cache = None;
        self.resolve_names();
    }

    pub(super) fn redecode_snapshot(&self) -> Vec<RedecodePacket> {
        self.packets
            .iter()
            .map(|packet| RedecodePacket {
                id: packet.id,
                cmd_id: packet.cmd_id,
                body: packet.body.clone(),
            })
            .collect()
    }

    pub(super) fn decode_snapshot(snapshot: Vec<RedecodePacket>) -> Vec<RedecodeResult> {
        let Some(proto) = crate::proto::store::snapshot() else {
            return snapshot
                .into_iter()
                .map(|packet| RedecodeResult {
                    id: packet.id,
                    name: None,
                    body_json: None,
                })
                .collect();
        };

        snapshot
            .into_iter()
            .map(|packet| RedecodeResult {
                id: packet.id,
                name: proto.message_name(packet.cmd_id).map(ToOwned::to_owned),
                body_json: proto.decode_body(packet.cmd_id, &packet.body).ok(),
            })
            .collect()
    }

    pub(super) fn apply_redecode_results(&mut self, results: Vec<RedecodeResult>) {
        let mut by_id: HashMap<u64, RedecodeResult> = results
            .into_iter()
            .map(|result| (result.id, result))
            .collect();

        for packet in &mut self.packets {
            if let Some(result) = by_id.remove(&packet.id) {
                packet.name = result.name;
                packet.body_json = result.body_json;
            }
        }

        self.packet_rows = self.packets.iter().map(packet_row_cache).collect();
        self.refresh_send_names();
        self.last_inspected = None;
        self.filtered_dirty = true;
        self.info_cache = None;
        self.resolve_names();
    }

    pub(super) fn refresh_send_names(&mut self) {
        self.send_names = sorted_packet_names();
        self.send_filter_dirty = true;
    }

    pub(super) fn recompute_send_filtered(&mut self, cx: &App) {
        let query = self.send_search.read(cx).value().to_lowercase();
        if !self.send_filter_dirty && query == self.send_filter_query {
            return;
        }

        self.send_filter_query = query;
        let indices: Vec<usize> = self
            .send_names
            .iter()
            .enumerate()
            .filter(|(_, entry)| {
                self.send_filter_query.is_empty()
                    || entry.search_name.contains(&self.send_filter_query)
                    || entry.cmd_id_text.contains(&self.send_filter_query)
            })
            .map(|(index, _)| index)
            .collect();
        self.send_filtered = std::rc::Rc::from(indices.into_boxed_slice());
        self.send_filter_dirty = false;
    }

    pub(super) fn begin_send_dialog(&mut self) {
        self.send_dialog_open = true;
        self.send_context_pending = false;
        self.send_context_from = None;
    }

    pub(super) fn end_send_dialog(&mut self) {
        self.send_dialog_open = false;
        self.send_context_pending = false;
        self.send_context_from = None;
    }

    pub(super) fn mark_send_context_pending(&mut self) {
        self.send_context_pending = true;
        self.send_context_from = None;
    }

    pub(super) fn sync_manual_hooks(&self) {
        let hooks = self.hooked.iter().map(|&id| id as u16).collect();
        crate::cheat::service::set_manual_hooks(hooks);
    }
}

pub(super) fn inspector_preview(text: &str) -> String {
    const MAX_LINES: usize = 200;
    let mut out = text.lines().take(MAX_LINES).collect::<Vec<_>>().join("\n");
    if text.lines().nth(MAX_LINES).is_some() {
        out.push_str("\n…");
    }
    out
}
