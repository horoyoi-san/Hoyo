use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;

use super::DynamicProto;

struct Store {
    proto: Option<DynamicProto>,
    status: String,
    name: Option<String>,
    path: Option<PathBuf>,
    last_mtime: Option<SystemTime>,
}

fn store() -> &'static Mutex<Store> {
    static STORE: OnceLock<Mutex<Store>> = OnceLock::new();
    STORE.get_or_init(|| {
        Mutex::new(Store {
            proto: None,
            status: "No proto loaded".to_string(),
            name: None,
            path: None,
            last_mtime: None,
        })
    })
}

fn status_for(path: &Path, proto: &DynamicProto) -> String {
    if proto.is_decodable() {
        format!("{} ({} packets)", file_name(path), proto.packet_count())
    } else {
        format!(
            "{} — names only: {}",
            file_name(path),
            proto.descriptor_error().unwrap_or("descriptor unavailable")
        )
    }
}

fn mtime_of(path: &Path) -> Option<SystemTime> {
    std::fs::metadata(path)
        .and_then(|meta| meta.modified())
        .ok()
}

pub fn load(path: &Path) -> anyhow::Result<String> {
    let proto = DynamicProto::load(path)?;
    let status = status_for(path, &proto);
    log::info!("[Proto] loaded {status}");
    let mtime = mtime_of(path);

    let mut guard = store().lock().unwrap();
    guard.proto = Some(proto);
    guard.status = status.clone();
    guard.name = Some(file_name(path));
    guard.path = Some(path.to_path_buf());
    guard.last_mtime = mtime;
    Ok(status)
}

pub fn reload_if_changed() -> anyhow::Result<bool> {
    let (path, last_mtime) = {
        let guard = store().lock().unwrap();
        (guard.path.clone(), guard.last_mtime)
    };
    let Some(path) = path else {
        return Ok(false);
    };

    let new_mtime = mtime_of(&path);
    if new_mtime == last_mtime {
        return Ok(false);
    }

    let proto = DynamicProto::load(&path)?;
    let status = status_for(&path, &proto);
    log::info!("[Proto] reloaded {status}");

    let mut guard = store().lock().unwrap();
    guard.proto = Some(proto);
    guard.status = status;
    guard.name = Some(file_name(&path));
    guard.last_mtime = new_mtime;
    Ok(true)
}

pub fn name() -> Option<String> {
    store().lock().unwrap().name.clone()
}

pub fn clear() {
    let mut guard = store().lock().unwrap();
    guard.proto = None;
    guard.status = "No proto loaded".to_string();
    guard.name = None;
    guard.path = None;
    guard.last_mtime = None;
}

#[allow(dead_code)]
pub fn status() -> String {
    store().lock().unwrap().status.clone()
}

fn with<R>(f: impl FnOnce(&DynamicProto) -> R) -> Option<R> {
    let guard = store().lock().unwrap();
    guard.proto.as_ref().map(f)
}

pub fn snapshot() -> Option<DynamicProto> {
    store().lock().unwrap().proto.clone()
}

pub fn message_name(cmd_id: u32) -> Option<String> {
    with(|proto| proto.message_name(cmd_id).map(ToOwned::to_owned)).flatten()
}

pub fn decode_body(cmd_id: u32, body: &[u8]) -> Option<String> {
    with(|proto| proto.decode_body(cmd_id, body).ok()).flatten()
}

pub fn encode_body(cmd_id: u32, json: &str) -> Option<Vec<u8>> {
    with(|proto| proto.encode_body(cmd_id, json).ok()).flatten()
}

pub fn default_json(cmd_id: u32) -> Option<String> {
    with(|proto| proto.default_json(cmd_id).ok()).flatten()
}

pub fn packet_names() -> Vec<(u32, String)> {
    with(super::dynamic::DynamicProto::packet_names).unwrap_or_default()
}

pub fn cmd_id_for_name(name: &str) -> Option<u32> {
    with(|proto| {
        proto
            .packet_names()
            .into_iter()
            .find(|(_, candidate)| candidate == name)
            .map(|(cmd_id, _)| cmd_id)
    })
    .flatten()
}

fn file_name(path: &Path) -> String {
    path.file_name().map_or_else(|| path.display().to_string(), |name| name.to_string_lossy().to_string())
}
