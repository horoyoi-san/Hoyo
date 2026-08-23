use hsr_ipc::FrontendCommand;

fn main() {
    let json = r#"{"type":"run_dumper","action":{"type":"c_sharp"}}"#;
    match serde_json::from_str::<FrontendCommand>(json) {
        Ok(cmd) => println!("OK: {:?}", cmd),
        Err(e) => println!("ERR: {}", e),
    }
}
