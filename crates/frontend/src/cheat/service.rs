use std::collections::HashSet;
use std::sync::{LazyLock, Mutex};
use std::time::Duration;

use hsr_ipc::{
    BackendEvent, CheatCommand, CheatEvent, FrontendCommand, SnifferCommand, sniffer::RawPacket,
};

use super::model::{CheatFieldType, CheatModule, CheatPacketRequest};

static MANUAL_HOOKS: LazyLock<Mutex<HashSet<u16>>> = LazyLock::new(|| Mutex::new(HashSet::new()));
static CHEAT_HOOKS: LazyLock<Mutex<Vec<(u32, String)>>> = LazyLock::new(|| Mutex::new(Vec::new()));

pub fn send_cheat_command(command: CheatCommand) {
    crate::ipc::send(FrontendCommand::Cheat(command));
}

pub fn run_action(module: &CheatModule, action_id: &str) {
    if !module.message_names.is_empty() && !super::is_enabled(module.id) {
        log::debug!("[Cheat] module {} is disabled", module.id);
        return;
    }
    let Some(action) = module.actions.iter().find(|action| action.id == action_id) else {
        return;
    };
    let Some(handler) = action.handler else {
        return;
    };

    super::notification::action(module, action);

    let context = super::action_context(module);
    dispatch_requests(handler(&context));
}

fn handle_keybind_trigger(name: &str, key: &str) {
    let Some(module) = super::get_modules()
        .into_iter()
        .find(|module| module.id == name)
    else {
        return;
    };

    if key == "toggle" {
        let enabled = !super::is_enabled(module.id);
        super::set_enabled(module.id, enabled);
        send_cheat_command(CheatCommand::SetEnabled {
            name: module.id.to_string(),
            enabled,
        });
        refresh_hooks();
        log::debug!("[Cheat] hotkey toggled {} -> {enabled}", module.id);
    } else {
        log::debug!("[Cheat] hotkey ran {}::{key}", module.id);
        run_action(&module, key);
    }
}

pub fn start_keybind_resync() {
    static STARTED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if STARTED.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        loop {
            std::thread::sleep(Duration::from_secs(5));
            for (name, key, key_code) in super::all_keybinds() {
                send_cheat_command(CheatCommand::SetKeyBind {
                    name,
                    key,
                    key_code,
                });
            }
        }
    });
}

pub fn start_keybind_listener() {
    static STARTED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if STARTED.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        for event in crate::ipc::subscribe() {
            if let BackendEvent::Cheat(CheatEvent::KeyTriggered { name, key }) = event {
                handle_keybind_trigger(&name, &key);
            }
        }
    });
}

pub fn set_manual_hooks(hooks: HashSet<u16>) {
    *MANUAL_HOOKS.lock().unwrap() = hooks;
    refresh_hooks();
}

pub fn cheat_hooks() -> Vec<(u32, String)> {
    CHEAT_HOOKS.lock().unwrap().clone()
}

pub fn refresh_hooks() {
    let message_names = super::enabled_message_names();
    let mut named: Vec<(u32, String)> = crate::proto::store::packet_names()
        .into_iter()
        .filter(|(_, name)| message_names.contains(name.as_str()))
        .collect();
    named.sort_by(|a, b| a.1.cmp(&b.1));
    *CHEAT_HOOKS.lock().unwrap() = named.clone();

    let mut ids: Vec<u16> = named.iter().map(|(cmd_id, _)| *cmd_id as u16).collect();
    ids.extend(MANUAL_HOOKS.lock().unwrap().iter().copied());
    ids.sort_unstable();
    ids.dedup();
    crate::ipc::send(FrontendCommand::Sniffer(SnifferCommand::SetHookCmdIds(ids)));
}

pub fn dispatch_requests(requests: Vec<CheatPacketRequest>) {
    let encoded: Vec<RawPacket> = requests.into_iter().filter_map(encode_request).collect();
    if encoded.is_empty() {
        return;
    }

    std::thread::spawn(move || {
        for chunk in encoded.chunks(100) {
            let _ = crate::ipc::request(
                FrontendCommand::SendPackets {
                    packets: chunk.to_vec(),
                },
                Duration::from_secs(3),
            );
        }
    });
}

fn encode_request(request: CheatPacketRequest) -> Option<RawPacket> {
    let cmd_id = crate::proto::store::cmd_id_for_name(request.message_name)?;
    let body = crate::proto::store::encode_body(cmd_id, &request.body_json.to_string())?;
    Some(RawPacket {
        source: request.source,
        cmd_id,
        head: vec![],
        body,
    })
}

pub fn apply_to_packet(cmd_id: u32, body: &[u8]) -> Option<Vec<u8>> {
    let name = crate::proto::store::message_name(cmd_id)?;
    let json = crate::proto::store::decode_body(cmd_id, body)?;
    let modified = super::apply_cheats(&name, &json)?;
    crate::proto::store::encode_body(cmd_id, &modified)
}

pub fn sync_initial_state() {
    static STARTED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if STARTED.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        log::debug!("[Cheat] sync_initial_state waiting for connection");
        for _ in 0..100 {
            if crate::ipc::is_connected() {
                break;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        log::debug!(
            "[Cheat] sync_initial_state connected, syncing {} modules",
            super::get_modules().len()
        );

        for module in super::get_modules() {
            send_cheat_command(CheatCommand::SetEnabled {
                name: module.id.to_string(),
                enabled: super::is_enabled(module.id),
            });

            let context = super::action_context(&module);
            for field in &module.fields {
                let Some(value) = context.config.get(field.key) else {
                    continue;
                };
                match &field.ty {
                    CheatFieldType::KeyBind { .. } => {
                        if let Some(key_code) = value.as_i64() {
                            send_cheat_command(CheatCommand::SetKeyBind {
                                name: module.id.to_string(),
                                key: field.key.to_string(),
                                key_code: key_code as i32,
                            });
                        }
                    }
                    CheatFieldType::Slider { .. } => {
                        if let Some(value) = value.as_f64() {
                            send_cheat_command(CheatCommand::SetValue {
                                name: module.id.to_string(),
                                key: field.key.to_string(),
                                value,
                            });
                        }
                    }
                    _ => {}
                }
            }
        }

        for (name, key, key_code) in super::all_keybinds() {
            send_cheat_command(CheatCommand::SetKeyBind {
                name,
                key,
                key_code,
            });
        }

        refresh_hooks();
        log::debug!("[Cheat] sync_initial_state done");
    });
}
