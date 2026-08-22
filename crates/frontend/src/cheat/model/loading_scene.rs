use super::CheatModule;
use hsr_ipc::FrontendCommand;
use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};

const LUA_SCRIPT: &str = include_str!("data/lua/load_scene.lua");
const START_MESSAGE: &str = "PlayerGetTokenCsReq";
const STOP_MESSAGE: &str = "SceneEntityMoveScRsp";
const SEND_INTERVAL: Duration = Duration::from_millis(50);

static SENDING_LUA: AtomicBool = AtomicBool::new(false);

pub fn module() -> CheatModule {
    CheatModule {
        id: "hkrpg.loading_scene",
        name: "Loading Scene Lua",
        description: "Loading Page",
        enabled: true,
        message_names: vec![START_MESSAGE, STOP_MESSAGE],
        handler: Some(handle),
        fields: vec![],
        actions: vec![],
    }
}

fn handle(cmd_name: &str, _body_json: &mut serde_json::Value) -> bool {
    match cmd_name {
        START_MESSAGE => start_sending_lua(),
        STOP_MESSAGE => stop_sending_lua(),
        _ => {}
    }

    false
}

fn start_sending_lua() {
    if SENDING_LUA.swap(true, Ordering::SeqCst) {
        return;
    }

    log::debug!("[Cheat] {START_MESSAGE} received, start sending load_scene.lua");
    std::thread::spawn(|| {
        while SENDING_LUA.load(Ordering::SeqCst) {
            send_lua_once();
            std::thread::sleep(SEND_INTERVAL);
        }
    });
}

fn stop_sending_lua() {
    if SENDING_LUA.swap(false, Ordering::SeqCst) {
        log::debug!("[Cheat] {STOP_MESSAGE} received, stop sending load_scene.lua");
    }
}

fn send_lua_once() {
    crate::ipc::send(FrontendCommand::ExecuteLuaOnLoad {
        script: LUA_SCRIPT.to_string(),
    });
}
