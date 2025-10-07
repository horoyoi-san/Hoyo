use std::{
    process::ExitCode,
    sync::{LazyLock, OnceLock},
    time::Duration,
};

use axum::Router;
use config::SdkConfig;
use database::DbContext;
use handlers::{combo_granter, mdk_shield_api, register, risky_api};
use tokio::{net::TcpListener, time, task};
use tracing::error;

use crossterm::{
    execute,
    style::{Color, Print, ResetColor, SetForegroundColor},
};
use std::io::stdout;

mod config;
mod database;
mod handlers;
mod util;

struct AppState {
    db: DbContext,
    #[expect(dead_code)]
    config: &'static SdkConfig,
}

type AppStateRef = &'static AppState;

#[tokio::main]
async fn main() -> ExitCode {
    static CONFIG: LazyLock<SdkConfig> =
        LazyLock::new(|| config::load_or_create("sdk_server.toml"));
    static STATE: OnceLock<AppState> = OnceLock::new();

    // 🌈 เรียกฟังก์ชันพิมพ์โลโก้แบบวนสี
    task::spawn(async {
        print_color_logo_loop().await;
    });

    init_tracing();
    let db = match DbContext::connect(&CONFIG.db_file).await {
        Ok(db) => db,
        Err(err) => {
            error!("Failed to open SQLite database. Error: {err}");
            return ExitCode::FAILURE;
        }
    };

    let _ = STATE.set(AppState {
        db,
        config: &CONFIG,
    });

    let router = Router::new()
        .merge(risky_api::routes())
        .merge(register::routes())
        .merge(mdk_shield_api::routes())
        .merge(combo_granter::routes())
        .with_state(STATE.get().unwrap());

    let listener = TcpListener::bind(&CONFIG.http_addr)
        .await
        .expect("TcpListener::bind failed. Is another instance of this server already running?");

    axum::serve(listener, router).await.unwrap();

    ExitCode::SUCCESS
}

// 🌈 ฟังก์ชันวนเปลี่ยนสีทุก ๆ 1 วินาที
async fn print_color_logo_loop() {
    let logo = r#"
██╗  ██╗ ██████╗ ██████╗  ██████╗ ██╗   ██╗ ██████╗ ██╗      ███████╗ █████╗ ███╗   ██╗
██║  ██║██╔═══██╗██╔══██╗██╔═══██╗╚██╗ ██╔╝██╔═══██╗██║      ██╔════╝██╔══██╗████╗  ██║
███████║██║   ██║██████╔╝██║   ██║ ╚████╔╝ ██║   ██║██║█████╗███████╗███████║██╔██╗ ██║
██╔══██║██║   ██║██╔══██╗██║   ██║  ╚██╔╝  ██║   ██║██║╚════╝╚════██║██╔══██║██║╚██╗██║
██║  ██║╚██████╔╝██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║      ███████║██║  ██║██║ ╚████║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝      ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
"#;

    let colors = [
        Color::Red, Color::Yellow, Color::Green, Color::Cyan, Color::Blue, Color::Magenta,
    ];

    let mut i = 0;
    loop {
        let color = colors[i % colors.len()];
        print!("\x1B[2J\x1B[1;1H"); // ล้างหน้าจอ

        execute!(
            stdout(),
            SetForegroundColor(color),
            Print(logo),
            ResetColor
        )
        .unwrap();

        i += 1;
        time::sleep(Duration::from_secs(1)).await;
    }
}

fn init_tracing() {
    tracing_subscriber::fmt().without_time().init();
}
