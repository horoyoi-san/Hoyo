use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};

use hsr_ipc::PacketSource;
use serde_json::json;

use super::{CheatModule, CheatPacketRequest};

const MODULE_ID: &str = "hkrpg.speed";
const SEND_INTERVAL: Duration = Duration::from_secs(13);
const TICK_INTERVAL: Duration = Duration::from_millis(50);

static WORKER_STARTED: AtomicBool = AtomicBool::new(false);

pub fn module() -> CheatModule {
    start_worker_once();

    CheatModule {
        id: MODULE_ID,
        name: "Speed",
        description: "Refresh movement speed buff every 10 seconds",
        enabled: false,
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
        let mut last_sent: Option<Instant> = None;

        loop {
            if crate::cheat::is_enabled(MODULE_ID) {
                let should_send =
                    last_sent.is_none_or(|sent_at| sent_at.elapsed() >= SEND_INTERVAL);

                if should_send {
                    crate::cheat::service::dispatch_requests(vec![speed_buff_packet()]);
                    last_sent = Some(Instant::now());
                }
            } else {
                last_sent = None;
            }

            std::thread::sleep(TICK_INTERVAL);
        }
    });
}

fn speed_buff_packet() -> CheatPacketRequest {
    CheatPacketRequest {
        message_name: "SyncEntityBuffChangeList",
        source: PacketSource::Server,
        body_json: json!({
            "entity_buff_info": [
                {
                    "buff_info": {
                        "level": 1,
                        "life_time": 15.0,
                        "buff_id": 2051101,
                        "trigger_time": "253402187707000" // ms
                    }
                }
            ]
        }),
    }
}
