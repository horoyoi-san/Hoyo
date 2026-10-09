use anyhow::Result;

pub fn init_tracing() {
    #[cfg(target_os = "windows")]
    let _ = ansi_term::enable_ansi_support();

    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
}

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();
    sdkserver::start_sdkserver().await
}
