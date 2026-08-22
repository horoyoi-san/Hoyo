use std::sync::{LazyLock, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use hsr_ipc::{BackendEvent, LogEntry, LogLevel};

static BUFFER: LazyLock<Mutex<Vec<LogEntry>>> = LazyLock::new(|| Mutex::new(Vec::new()));
static LOGGER: FrontendLogger = FrontendLogger;
const MAX_BUFFER: usize = 20_000;

const NOISY_TARGETS: &[&str] = &[
    "gpui",
    "wgpu",
    "naga",
    "blade",
    "cosmic_text",
    "font_kit",
    "winit",
    "calloop",
    "zbus",
    "smol",
    "polling",
    "async_io",
    "async_executor",
    "tracing",
    "metal",
    "ash",
    "objc",
    "ureq",
    "rustls",
    "h2",
    "hyper",
    "webpki",
];

struct FrontendLogger;

impl log::Log for FrontendLogger {
    fn enabled(&self, metadata: &log::Metadata<'_>) -> bool {
        metadata.level() <= log::Level::Debug
    }

    fn log(&self, record: &log::Record<'_>) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let target = record.target();
        if NOISY_TARGETS
            .iter()
            .any(|prefix| target.starts_with(prefix))
        {
            return;
        }

        push(LogEntry {
            timestamp_ms: now_ms(),
            level: LogLevel::from(record.level()),
            target: target.to_string(),
            message: record.args().to_string(),
        });
    }

    fn flush(&self) {}
}

pub fn init() {
    if log::set_logger(&LOGGER).is_ok() {
        log::set_max_level(log::LevelFilter::Debug);
    }
}

pub fn start_backend_log_stream() {
    std::thread::spawn(|| {
        for event in crate::ipc::subscribe() {
            if let BackendEvent::Log { entry } = event {
                push(entry);
            }
        }
    });
}

fn push(entry: LogEntry) {
    let mut buffer = BUFFER.lock().unwrap();
    buffer.push(entry);
    let len = buffer.len();
    if len > MAX_BUFFER {
        buffer.drain(..len - MAX_BUFFER);
    }
}

pub fn drain() -> Vec<LogEntry> {
    std::mem::take(&mut *BUFFER.lock().unwrap())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}
