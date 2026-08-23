use std::io::Read;
use std::os::windows::io::FromRawHandle;
use std::sync::{LazyLock, Mutex, mpsc};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use hsr_ipc::{LogEntry, LogLevel};
use windows::Win32::Foundation::HANDLE;
use windows::Win32::System::Console::{STD_ERROR_HANDLE, STD_OUTPUT_HANDLE, SetStdHandle};
use windows::Win32::System::Pipes::CreatePipe;

static LOG_SENDER: LazyLock<Mutex<Option<mpsc::SyncSender<LogEntry>>>> =
    LazyLock::new(|| Mutex::new(None));
static LOGGER: IpcLogger = IpcLogger;

const NOISY_TARGETS: &[&str] = &["ureq", "rustls", "h2", "hyper", "webpki"];

struct IpcLogger;

impl log::Log for IpcLogger {
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

        let entry = LogEntry {
            timestamp_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or_default(),
            level: LogLevel::from(record.level()),
            target: record.target().to_string(),
            message: record.args().to_string(),
        };

        if let Some(sender) = LOG_SENDER.lock().unwrap().as_ref() {
            let _ = sender.try_send(entry);
        }
    }

    fn flush(&self) {}
}

pub fn init() -> mpsc::Receiver<LogEntry> {
    let (tx, rx) = mpsc::sync_channel(8192);
    *LOG_SENDER.lock().unwrap() = Some(tx);

    if log::set_logger(&LOGGER).is_ok() {
        log::set_max_level(log::LevelFilter::Debug);
    }

    capture_stdout_stderr();

    rx
}

fn capture_stdout_stderr() {
    let mut read_pipe = HANDLE::default();
    let mut write_pipe = HANDLE::default();

    if unsafe { CreatePipe(&mut read_pipe, &mut write_pipe, None, 0) }.is_err() {
        return;
    }

    unsafe {
        let _ = SetStdHandle(STD_OUTPUT_HANDLE, write_pipe);
        let _ = SetStdHandle(STD_ERROR_HANDLE, write_pipe);
    }

    let read_handle = read_pipe.0 as usize;
    thread::spawn(move || {
        let mut file = unsafe { std::fs::File::from_raw_handle(read_handle as _) };
        let mut buffer = [0u8; 4096];
        let mut pending = String::new();

        while let Ok(read) = file.read(&mut buffer) {
            if read == 0 {
                break;
            }

            pending.push_str(&String::from_utf8_lossy(&buffer[..read]));
            while let Some(index) = pending.find('\n') {
                let line = pending[..index].trim_end_matches('\r').to_string();
                pending = pending[index + 1..].to_string();
                if !line.is_empty() {
                    push_line(line);
                }
            }
        }
    });
}

fn push_line(message: String) {
    if let Some(sender) = LOG_SENDER.lock().unwrap().as_ref() {
        let _ = sender.try_send(LogEntry {
            timestamp_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or_default(),
            level: LogLevel::Debug,
            target: "stdout".to_string(),
            message,
        });
    }
}
