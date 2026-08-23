use hsr_ipc::{BackendEvent, DumperAction, ProtoDumpMode};

fn main() {
    let event = BackendEvent::DumperStarted { action: DumperAction::Proto { mode: ProtoDumpMode::Asm } };
    match serde_json::to_string(&event) {
        Ok(json) => println!("OK: {}", json),
        Err(e) => println!("ERR: {}", e),
    }
}
