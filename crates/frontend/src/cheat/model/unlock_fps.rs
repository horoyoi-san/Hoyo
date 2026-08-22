use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};

use hsr_ipc::FrontendCommand;

use super::CheatModule;

const MODULE_ID: &str = "hkrpg.unlock_fps";
const LUA_SCRIPT: &str = include_str!("data/lua/fps.lua");
const SEND_INTERVAL: Duration = Duration::from_millis(20);

static WORKER_STARTED: AtomicBool = AtomicBool::new(false);

pub fn module() -> CheatModule {
    start_worker_once();

    CheatModule {
        id: MODULE_ID,
        name: "Unlock FPS",
        description: "Set target FPS to 144",
        enabled: true,
        message_names: vec![],
        handler: None,
        fields: vec![],
        actions: vec![],
    }
}

fn start_worker_once() {
    if WORKER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        loop {
            if crate::cheat::is_enabled(MODULE_ID) {
                send_lua_once();
            }
            std::thread::sleep(SEND_INTERVAL);
        }
    });
}

fn send_lua_once() {
    crate::ipc::send(FrontendCommand::ExecuteLua {
        script: LUA_SCRIPT.to_string(),
    });
}
