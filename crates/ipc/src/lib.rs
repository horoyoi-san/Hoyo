use serde::{Deserialize, Serialize};

pub mod cheat;
pub mod config;
pub mod dumper;
pub mod frame;
pub mod packet;
pub mod sniffer;
pub mod transport;
pub mod ws;

pub use cheat::{CheatCommand, CheatEvent};
pub use config::{ConfigCommand, ConfigEvent};
pub use dumper::{DumperAction, DumperCommand, DumperEvent, ProtoDumpMode};
pub use frame::{read_frame, read_json_frame, write_frame, write_json_frame};
pub use packet::{DecodedPacket, PacketSource};
pub use sniffer::{SnifferCommand, SnifferEvent};
pub use transport::{ClientFrame, DEFAULT_ADDR, RpcClient, ServerFrame, endpoint};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl From<log::Level> for LogLevel {
    fn from(level: log::Level) -> Self {
        match level {
            log::Level::Error => Self::Error,
            log::Level::Warn => Self::Warn,
            log::Level::Info => Self::Info,
            log::Level::Debug => Self::Debug,
            log::Level::Trace => Self::Trace,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp_ms: u64,
    pub level: LogLevel,
    pub target: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FrontendCommand {
    Dumper(DumperCommand),
    Sniffer(SnifferCommand),
    Cheat(CheatCommand),
    Config(ConfigCommand),

    #[serde(alias = "run_dumper")]
    RunDumper {
        action: DumperAction,
    },
    #[serde(alias = "start_sniffer")]
    StartSniffer,
    #[serde(alias = "stop_sniffer")]
    StopSniffer,
    SendPacket {
        source: PacketSource,
        cmd_id: u32,
        head: Vec<u8>,
        body: Vec<u8>,
    },
    SendPackets {
        packets: Vec<sniffer::RawPacket>,
    },
    ExecuteLua {
        script: String,
    },
    ExecuteLuaOnLoad {
        script: String,
    },
    #[serde(alias = "set_dumper_enabled")]
    SetDumperEnabled {
        enabled: bool,
    },
    #[serde(alias = "set_cheat_enabled")]
    SetCheatEnabled {
        name: String,
        enabled: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum BackendEvent {
    Dumper(DumperEvent),
    Sniffer(SnifferEvent),
    Cheat(CheatEvent),
    Config(ConfigEvent),
    Log { entry: LogEntry },

    Packet(DecodedPacket),
    DumperStarted { action: DumperAction },
    DumperFinished { action: DumperAction, seconds: u64 },
    DumperFailed { action: DumperAction, error: String },
    DumperStatus { enabled: bool },
    CheatStatus { name: String, enabled: bool },
}
