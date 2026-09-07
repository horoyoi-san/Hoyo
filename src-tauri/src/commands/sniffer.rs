use crate::state::{DecodedPacketDto, GLOBAL_PACKETS};

#[tauri::command]
pub fn get_sniffer_packets(since_id: usize) -> Vec<DecodedPacketDto> {
    let guard = GLOBAL_PACKETS.lock().unwrap();
    guard.iter().filter(|p| p.id > since_id).cloned().collect()
}

#[tauri::command]
pub fn clear_sniffer_packets() {
    let mut guard = GLOBAL_PACKETS.lock().unwrap();
    guard.clear();
}
