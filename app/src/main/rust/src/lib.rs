#![feature(once_cell_get_mut)]

use std::sync::{OnceLock, mpsc};
use std::thread;

use jni::JNIEnv;
use jni::objects::{GlobalRef, JClass, JString};
use logger::{LogHandler, LogLayer};

use tokio::runtime::Runtime;
use tokio::sync::oneshot;
use tracing::info;
use tracing_subscriber::Registry;
use tracing_subscriber::layer::SubscriberExt as _;

mod logger;

struct AppData {
    pub stop_signal_gs: Option<oneshot::Sender<()>>,
    pub stop_signal_sdk: Option<oneshot::Sender<()>>,
}

static IS_INIT: OnceLock<()> = OnceLock::new();

fn log_handler(jvm: jni::JavaVM, global_callback: GlobalRef) -> &'static LogHandler {
    static LOG_HANDLER: OnceLock<LogHandler> = OnceLock::new();
    LOG_HANDLER.get_or_init(|| LogHandler::new(jvm, global_callback))
}

fn app_state() -> &'static mut AppData {
    static mut APP_STATE: OnceLock<AppData> = OnceLock::new();
    unsafe {
        #[allow(static_mut_refs)]
        APP_STATE.get_mut_or_init(|| AppData {
            stop_signal_gs: None,
            stop_signal_sdk: None,
        })
    }
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_dev_amizing25_robinsr_RustLib_init(
    mut env: JNIEnv,
    class: JClass,
    path: JString,
) {
    if IS_INIT.get().is_some() {
        return;
    }
    let _ = IS_INIT.set(());

    let jvm = env.get_java_vm().unwrap();
    let global_callback = env.new_global_ref(class).unwrap();
    let (sender, receiver) = mpsc::channel();

    let subscriber = Registry::default().with(LogLayer::new(sender));
    tracing::subscriber::set_global_default(subscriber).unwrap();

    thread::spawn(move || {
        let handler = log_handler(jvm, global_callback);
        for message in receiver {
            handler.send_log(message);
        }
    });

    let path: String = env.get_string(&path).unwrap().into();
    std::env::set_current_dir(&path).unwrap();

    info!("set current working dir on {}", path);

    check_assets();

    info!("rust init finished");
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_dev_amizing25_robinsr_RustLib_startServer(
    _env: JNIEnv,
    _class: JClass,
) {
    let state = app_state();
    if state.stop_signal_gs.is_some() || state.stop_signal_sdk.is_some() {
        return;
    }

    let (shutdown_tx, mut shutdown_rx) = oneshot::channel();
    state.stop_signal_sdk.replace(shutdown_tx);
    thread::spawn(move || {
        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            tokio::select! {
                _ = &mut shutdown_rx => {},
                _ = sdkserver::start_sdkserver() => {},
            }
        });
    });

    let (shutdown_tx, mut shutdown_rx) = oneshot::channel();
    state.stop_signal_gs.replace(shutdown_tx);
    thread::spawn(move || {
        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            tokio::select! {
                _ = &mut shutdown_rx => {},
                _ = gameserver::start_gameserver() => {},
            }
        });
    });

    info!("Server started")
}

#[unsafe(no_mangle)]
#[allow(static_mut_refs)]
pub extern "system" fn Java_dev_amizing25_robinsr_RustLib_stopServer(_env: JNIEnv, _class: JClass) {
    let state = app_state();

    if let Some(stop_signal) = state.stop_signal_sdk.take() {
        let _ = stop_signal.send(());
        info!("sdkserver stopped")
    }

    if let Some(stop_signal) = state.stop_signal_gs.take() {
        let _ = stop_signal.send(());
        info!("gameserver stopped")
    }
}

fn check_assets() {
    if std::fs::read("res.json").is_err() {
        let _ = std::fs::write("res.json", include_str!("../assets/res.json"));
    };

    if std::fs::read("freesr_data.json").is_err() {
        let _ = std::fs::write(
            "freesr-data.json",
            include_str!("../assets/freesr-data.json"),
        );
    };

    if std::fs::read("persistent").is_err() {
        let _ = std::fs::write("res.json", include_str!("../assets/persistent"));
    };

    if std::fs::read("versions.json").is_err() {
        let _ = std::fs::write("versions.json", include_str!("../assets/versions.json"));
    };

    if let Ok(dir) = std::fs::read_dir(".") {
        for file in dir {
            info!("data: {:#?}", file.map(|f| f.file_name()));
        }
    }
}
