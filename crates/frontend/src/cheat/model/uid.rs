use hsr_ipc::FrontendCommand;
use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};

use super::{CheatConfigField, CheatFieldType, CheatModule};

const MODULE_ID: &str = "hkrpg.uid";
const TEXT_KEY: &str = "text";
const DEFAULT_TEXT: &str = "NeonTeam58";
const LUA_TEMPLATE: &str = include_str!("data/lua/uid.lua");
const START_MESSAGE: &str = "PlayerGetTokenScRsp";
const SEND_INTERVAL: Duration = Duration::from_millis(300);

static SENDING_LUA: AtomicBool = AtomicBool::new(false);

pub fn module() -> CheatModule {
    CheatModule {
        id: MODULE_ID,
        name: "UID",
        description: "Modify UID",
        enabled: true,
        message_names: vec![START_MESSAGE],
        handler: Some(handle),
        fields: vec![CheatConfigField {
            key: TEXT_KEY,
            label: "UID",
            ty: CheatFieldType::Text {
                default: DEFAULT_TEXT,
            },
        }],
        actions: vec![],
    }
}

fn handle(cmd_name: &str, _body_json: &mut serde_json::Value) -> bool {
    if cmd_name == START_MESSAGE {
        start_sending_lua();
    }
    false
}

fn start_sending_lua() {
    if SENDING_LUA.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        while SENDING_LUA.load(Ordering::SeqCst) {
            if crate::cheat::is_enabled(MODULE_ID) {
                send_uid_lua();
            }
            std::thread::sleep(SEND_INTERVAL);
        }
    });
}

fn send_uid_lua() {
    let text = crate::cheat::config_value(MODULE_ID, TEXT_KEY)
        .and_then(|value| value.as_str().map(str::to_string))
        .unwrap_or_else(|| DEFAULT_TEXT.to_string());

    let script = format!("UID_TEXT = [==[{text}]==]\n{LUA_TEMPLATE}");
    crate::ipc::send(FrontendCommand::ExecuteLua { script });
}
