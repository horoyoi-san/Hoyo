use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};

use hsr_ipc::FrontendCommand;

use super::{CheatFieldType, CheatModule};

const MODULE_ID: &str = "hkrpg.hud";
const LUA_TEMPLATE: &str = include_str!("data/lua/hud.lua");
const START_MESSAGE: &str = "SceneEntityMoveScRsp";
const UPDATE_INTERVAL: Duration = Duration::from_millis(100);

static SENDING: AtomicBool = AtomicBool::new(false);
static INIT_SENT: AtomicBool = AtomicBool::new(false);

pub fn module() -> CheatModule {
    CheatModule {
        id: MODULE_ID,
        name: "HUD",
        description: "Show enabled modules overlay",
        enabled: true,
        message_names: vec![START_MESSAGE],
        handler: Some(handle),
        fields: vec![super::CheatConfigField {
            key: "theme",
            label: "Color Theme",
            ty: super::CheatFieldType::Select {
                default: 0,
                options: vec![
                    ("Chroma Wave", 0),
                    ("Rainbow Array", 1),
                    ("White", 2),
                    ("Red", 3),
                    ("Green", 4),
                    ("Blue", 5),
                ],
            },
        }],
        actions: vec![],
    }
}

fn handle(cmd_name: &str, _body: &mut serde_json::Value) -> bool {
    if cmd_name == START_MESSAGE {
        INIT_SENT.store(false, Ordering::SeqCst);
        start_worker();
    }
    false
}

fn start_worker() {
    if SENDING.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        loop {
            if crate::cheat::is_enabled(MODULE_ID) {
                if !INIT_SENT.swap(true, Ordering::SeqCst) {
                    send_init();
                }
                send_state_update();
            }
            std::thread::sleep(UPDATE_INTERVAL);
        }
    });
}

fn send_init() {
    crate::ipc::send(FrontendCommand::ExecuteLua {
        script: LUA_TEMPLATE.to_string(),
    });
}

static LAST_STATE: std::sync::LazyLock<std::sync::Mutex<String>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(String::new()));

fn send_state_update() {
    let modules = crate::cheat::get_modules();
    let entries: Vec<String> = modules
        .iter()
        .filter(|m| m.id != MODULE_ID)
        .map(|m| {
            let param = get_module_param(m);
            let enabled = crate::cheat::is_enabled(m.id);
            format!("{{name={:?},param={:?},on={}}}", m.name, param, enabled)
        })
        .collect();

    let theme_id = crate::cheat::config_value(MODULE_ID, "theme")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let state_str = entries.join(",");
    let cache_key = format!("{theme_id}:{state_str}");

    let mut last = LAST_STATE.lock().unwrap();
    if *last == cache_key {
        return;
    }
    *last = cache_key;

    let script = format!(
        "_G.HUD_THEME = {theme_id}; _G.HUD_STATE = {{{state_str}}}"
    );
    crate::ipc::send(FrontendCommand::ExecuteLua { script });
}

fn get_module_param(module: &CheatModule) -> String {
    for field in &module.fields {
        match &field.ty {
            CheatFieldType::Slider { .. } => {
                if let Some(val) = crate::cheat::config_value(module.id, field.key)
                    && let Some(num) = val.as_f64()
                {
                    return format!("{num:.1}x");
                }
            }
            CheatFieldType::Text { .. } => {
                if let Some(val) = crate::cheat::config_value(module.id, field.key)
                    && let Some(s) = val.as_str()
                {
                    return s.to_string();
                }
            }
            _ => {}
        }
    }
    String::new()
}
