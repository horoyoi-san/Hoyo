use std::collections::{HashMap, HashSet};
use std::sync::{
    LazyLock, Mutex, RwLock,
    atomic::{AtomicU32, AtomicU64, Ordering},
    mpsc,
};

use hsr_ipc::{DecodedPacket, PacketSource};
use il2cpp::{get_cached_class, vm::array::Il2CppArray};

use super::net_packet::NetPacket;

pub static PACKET_ORDER: AtomicU32 = AtomicU32::new(0);
static PACKET_ID: AtomicU64 = AtomicU64::new(0);

static PACKET_SENDER: LazyLock<Mutex<Option<mpsc::SyncSender<DecodedPacket>>>> =
    LazyLock::new(|| Mutex::new(None));

pub static HOOKED_CMD_IDS: LazyLock<RwLock<HashSet<u16>>> =
    LazyLock::new(|| RwLock::new(HashSet::new()));

pub struct PacketModifyResponse {
    pub body: Vec<u8>,
    pub drop_packet: bool,
}

pub static PENDING_MODIFICATIONS: LazyLock<
    Mutex<HashMap<u32, mpsc::SyncSender<PacketModifyResponse>>>,
> = LazyLock::new(|| Mutex::new(HashMap::new()));
pub static REQUEST_ID: AtomicU32 = AtomicU32::new(1);

pub fn init_packet_channel() -> mpsc::Receiver<DecodedPacket> {
    let (tx, rx) = mpsc::sync_channel(8192);
    *lock_poisoned(&PACKET_SENDER) = Some(tx);
    rx
}

/// Lock a mutex even if a panic on another thread poisoned it; the guarded
/// data here is just channels/sets, so recovery is always safe.
fn lock_poisoned<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

pub fn push_packet(source: PacketSource, packet: &NetPacket<'_>, request_id: Option<u32>) {
    let decoded = DecodedPacket {
        id: PACKET_ID.fetch_add(1, Ordering::SeqCst),
        cmd_id: packet.cmd_id as u32,
        source,
        name: None,
        head: packet.header.to_vec(),
        body: packet.body.to_vec(),
        body_json: None,
        request_id,
        custom_packet: false,
    };

    if let Some(tx) = lock_poisoned(&PACKET_SENDER).as_ref() {
        let _ = tx.try_send(decoded);
    }
}

pub fn push_custom_packet(source: PacketSource, cmd_id: u32, head: Vec<u8>, body: Vec<u8>) {
    let decoded = DecodedPacket {
        id: PACKET_ID.fetch_add(1, Ordering::SeqCst),
        cmd_id,
        source,
        name: None,
        head,
        body,
        body_json: None,
        request_id: None,
        custom_packet: true,
    };

    if let Some(tx) = lock_poisoned(&PACKET_SENDER).as_ref() {
        let _ = tx.try_send(decoded);
    }
}

pub fn set_hook_cmd_ids(cmd_ids: Vec<u16>) {
    *HOOKED_CMD_IDS
        .write()
        .unwrap_or_else(|e| e.into_inner()) = cmd_ids.into_iter().collect();
}

pub fn handle_packet_modify_response(request_id: u32, body: Vec<u8>, drop_packet: bool) {
    if let Some(tx) = lock_poisoned(&PENDING_MODIFICATIONS).remove(&request_id) {
        let _ = tx.try_send(PacketModifyResponse { body, drop_packet });
    }
}

pub fn replace_packet_data(ser: Vec<u8>, reg: &mut ilhook::x64::Registers) {
    let Some(byte_class) = get_cached_class("System.Byte") else {
        // Leaving the registers untouched lets the original packet pass
        // through unmodified instead of crashing the game process.
        log::error!("replace_packet_data: System.Byte class not cached, packet left unmodified");
        return;
    };
    let mut array = Il2CppArray::new(byte_class.get_array_class(1), ser.len());
    array.as_mut_slice().copy_from_slice(&ser);

    reg.rdx = array.0 as u64;
    reg.r9 = ser.len() as u64;
}
