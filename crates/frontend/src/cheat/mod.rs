pub mod keycode;
pub mod model;
pub mod notification;
pub mod service;

use std::{
    collections::{HashMap, HashSet},
    sync::{Mutex, OnceLock},
};

pub use model::CheatModule;
use model::{CheatActionContext, CheatConfigField, CheatFieldType};

#[derive(Default)]
struct CheatRuntime {
    enabled: HashSet<&'static str>,
    configs: HashMap<&'static str, serde_json::Map<String, serde_json::Value>>,
    keybinds: HashMap<(String, String), i32>,
}

fn runtime() -> &'static Mutex<CheatRuntime> {
    static RUNTIME: OnceLock<Mutex<CheatRuntime>> = OnceLock::new();
    RUNTIME.get_or_init(|| Mutex::new(CheatRuntime::default()))
}

pub fn get_modules() -> Vec<CheatModule> {
    vec![
        model::unlock_fps::module(),
        model::speed::module(),
        model::loading_scene::module(),
        model::hide_ui::module(),
        model::uid::module(),
        model::hud::module(),
        model::censorship::module(),
    ]
}

pub fn init_module(module: &CheatModule) {
    let mut runtime = runtime().lock().unwrap();
    if module.enabled {
        runtime.enabled.insert(module.id);
    }
    runtime
        .configs
        .entry(module.id)
        .or_insert_with(|| default_config(&module.fields));
}

pub fn is_enabled(module_id: &'static str) -> bool {
    runtime().lock().unwrap().enabled.contains(module_id)
}

pub fn set_enabled(module_id: &'static str, enabled: bool) {
    {
        let mut runtime = runtime().lock().unwrap();
        if enabled {
            runtime.enabled.insert(module_id);
        } else {
            runtime.enabled.remove(module_id);
        }
    }

    notification::toggle(module_id, enabled);
}

pub fn config_value(module_id: &str, key: &str) -> Option<serde_json::Value> {
    runtime()
        .lock()
        .unwrap()
        .configs
        .get(module_id)
        .and_then(|config| config.get(key))
        .cloned()
}

pub fn set_config_value(module_id: &'static str, key: &'static str, value: serde_json::Value) {
    runtime()
        .lock()
        .unwrap()
        .configs
        .entry(module_id)
        .or_default()
        .insert(key.to_string(), value);
}

pub fn set_keybind(module_id: &str, key: &str, key_code: i32) {
    runtime()
        .lock()
        .unwrap()
        .keybinds
        .insert((module_id.to_string(), key.to_string()), key_code);
}

pub fn all_keybinds() -> Vec<(String, String, i32)> {
    runtime()
        .lock()
        .unwrap()
        .keybinds
        .iter()
        .map(|((module, key), code)| (module.clone(), key.clone(), *code))
        .collect()
}

pub fn action_context(module: &CheatModule) -> CheatActionContext {
    let config = runtime()
        .lock()
        .unwrap()
        .configs
        .get(module.id)
        .cloned()
        .unwrap_or_else(|| default_config(&module.fields));

    CheatActionContext {
        module_id: module.id,
        config,
    }
}

pub fn enabled_message_names() -> HashSet<&'static str> {
    let runtime = runtime().lock().unwrap();
    get_modules()
        .into_iter()
        .filter(|module| runtime.enabled.contains(module.id))
        .flat_map(|module| module.message_names)
        .collect()
}

pub fn apply_cheats(cmd_name: &str, json_str: &str) -> Option<String> {
    let mut json_val = serde_json::from_str::<serde_json::Value>(json_str).ok()?;
    let mut modified = false;

    for module in get_modules() {
        if !is_enabled(module.id) {
            continue;
        }

        if module.message_names.contains(&cmd_name)
            && let Some(handler) = module.handler
            && handler(cmd_name, &mut json_val)
        {
            modified = true;
        }
    }

    if modified {
        serde_json::to_string(&json_val).ok()
    } else {
        None
    }
}

fn default_config(fields: &[CheatConfigField]) -> serde_json::Map<String, serde_json::Value> {
    fields
        .iter()
        .map(|field| {
            let value = match &field.ty {
                CheatFieldType::Boolean { default } => serde_json::json!(default),
                CheatFieldType::Number { default } => serde_json::json!(default),
                CheatFieldType::Slider { default, .. } => serde_json::json!(default),
                CheatFieldType::KeyBind { default } => serde_json::json!(default),
                CheatFieldType::Select { default, .. } => serde_json::json!(default),
                CheatFieldType::Text { default } => serde_json::json!(default),
            };
            (field.key.to_string(), value)
        })
        .collect()
}
