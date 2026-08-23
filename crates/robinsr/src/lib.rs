pub mod auto;
pub mod dispatch;
pub mod gameserver;
pub mod gm;
pub mod handlers;
pub mod protocol;

pub use gameserver::GameServer;
pub use protocol::DynamicOpcodeRegistry;

use std::sync::RwLock;

type LogCallback = Box<dyn Fn(&str) + Send + Sync + 'static>;
static LOG_SINK: RwLock<Option<LogCallback>> = RwLock::new(None);

pub fn set_log_sink<F>(f: F)
where
    F: Fn(&str) + Send + Sync + 'static,
{
    let mut guard = LOG_SINK.write().unwrap();
    *guard = Some(Box::new(f));
}

pub fn emit_log(msg: impl AsRef<str>) {
    let s = msg.as_ref();
    log::info!("{}", s);
    if let Ok(guard) = LOG_SINK.read() {
        if let Some(cb) = guard.as_ref() {
            cb(s);
        }
    }
}
