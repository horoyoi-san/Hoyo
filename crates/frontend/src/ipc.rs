use std::sync::{LazyLock, mpsc::Receiver};
use std::time::Duration;

use anyhow::Result;
use hsr_ipc::{BackendEvent, FrontendCommand, RpcClient};

static CLIENT: LazyLock<RpcClient> = LazyLock::new(RpcClient::start);
static COMMAND_TX: LazyLock<std::sync::mpsc::Sender<FrontendCommand>> =
    LazyLock::new(spawn_sender_thread);

fn spawn_sender_thread() -> std::sync::mpsc::Sender<FrontendCommand> {
    let (tx, rx) = std::sync::mpsc::channel::<FrontendCommand>();

    std::thread::spawn(move || {
        log::debug!("[IPC] sender thread started");
        loop {
            if !is_connected() {
                std::thread::sleep(Duration::from_millis(100));
                continue;
            }

            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(command) => {
                    let name = command_name(&command);
                    if let Err(error) = CLIENT.send(command) {
                        log::debug!("[IPC] send failed for {name}: {error:#}");
                    } else {
                        log::trace!("[IPC] sent {name}");
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    log::debug!("[IPC] sender channel disconnected, exiting");
                    break;
                }
            }
        }
    });

    tx
}

fn command_name(command: &FrontendCommand) -> &'static str {
    match command {
        FrontendCommand::Cheat(_) => "Cheat",
        FrontendCommand::Sniffer(_) => "Sniffer",
        FrontendCommand::Config(_) => "Config",
        FrontendCommand::Dumper(_) => "Dumper",
        FrontendCommand::RunDumper { .. } => "RunDumper",
        FrontendCommand::StartSniffer => "StartSniffer",
        FrontendCommand::StopSniffer => "StopSniffer",
        FrontendCommand::SendPacket { .. } => "SendPacket",
        FrontendCommand::SendPackets { .. } => "SendPackets",
        FrontendCommand::ExecuteLua { .. } => "ExecuteLua",
        FrontendCommand::ExecuteLuaOnLoad { .. } => "ExecuteLuaOnLoad",
        FrontendCommand::SetDumperEnabled { .. } => "SetDumperEnabled",
        FrontendCommand::SetCheatEnabled { .. } => "SetCheatEnabled",
    }
}

pub fn send(command: FrontendCommand) {
    let name = command_name(&command);
    if COMMAND_TX.send(command).is_err() {
        log::error!("[IPC] failed to queue {name}: sender dropped");
    } else {
        log::trace!("[IPC] queued {name}");
    }
}

pub fn request(command: FrontendCommand, timeout: Duration) -> Result<BackendEvent> {
    CLIENT.request(command, timeout)
}

pub fn subscribe() -> Receiver<BackendEvent> {
    CLIENT.subscribe()
}

pub fn is_connected() -> bool {
    CLIENT.is_connected()
}
