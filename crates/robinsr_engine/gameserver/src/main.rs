use anyhow::Result;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::sync::Mutex;

pub fn init_tracing() {
    #[cfg(target_os = "windows")]
    let _ = ansi_term::enable_ansi_support();

    let _ = fs::create_dir_all("logs");
    let log_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open("logs/gameserver.log")
        .ok();

    let file_mutex = log_file.map(Mutex::new);

    env_logger::Builder::from_env(env_logger::Env::new().default_filter_or("info"))
        .format(move |buf, record| {
            let ts = buf.timestamp();
            let level = record.level();
            let target = record.target();
            let args = record.args();
            let line = format!("[{ts} {level} {target}] {args}\n");

            if let Some(ref m) = file_mutex {
                if let Ok(mut f) = m.lock() {
                    let _ = f.write_all(line.as_bytes());
                    let _ = f.flush();
                }
            }

            write!(buf, "{line}")
        })
        .init();
}

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();
    tracing::info!("AstralOS GameServer started with Full Packet DB and File Logging");
    gameserver::start_gameserver().await
}
