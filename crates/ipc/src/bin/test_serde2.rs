use hsr_ipc::{FrontendCommand, DumperAction, ProtoDumpMode};

fn main() {
    let json = r#"{"type":"run_dumper","action":{"type":"proto","mode":"asm"}}"#;
    match serde_json::from_str::<FrontendCommand>(json) {
        Ok(cmd) => println!("OK: {:?}", cmd),
        Err(e) => println!("ERR: {}", e),
    }
}
