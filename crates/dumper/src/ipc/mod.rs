use std::{
    collections::{HashMap, VecDeque},
    net::{TcpListener, TcpStream},
    sync::{
        Arc, LazyLock, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc::{self, Receiver, SyncSender},
    },
    thread,
    time::{Duration, Instant},
};

use hsr_ipc::{
    BackendEvent, CheatCommand, CheatEvent, ConfigCommand, DumperAction, DumperCommand,
    FrontendCommand, LogEntry, PacketSource, SnifferCommand, SnifferEvent,
    transport::{ClientFrame, ServerFrame, endpoint},
};

pub(crate) mod actions;
pub(crate) mod frontend;

const CUSTOM_PACKET_TASK_TIMEOUT: Duration = Duration::from_secs(10);
const CLIENT_QUEUE_CAPACITY: usize = 16384;
const LOG_BACKLOG_CAPACITY: usize = 4096;

static CLIENTS: LazyLock<Mutex<HashMap<u64, SyncSender<ServerFrame>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_CLIENT_ID: AtomicU64 = AtomicU64::new(1);
static LOG_BACKLOG: LazyLock<Mutex<VecDeque<LogEntry>>> =
    LazyLock::new(|| Mutex::new(VecDeque::new()));

struct SendPacketsResult {
    all_ok: bool,
    first_error: Option<String>,
}

#[derive(Clone)]
struct Responder {
    id: u64,
    out: SyncSender<ServerFrame>,
}

fn register_client(out: SyncSender<ServerFrame>) -> u64 {
    {
        let backlog = LOG_BACKLOG.lock().unwrap();
        for entry in backlog.iter() {
            let _ = out.try_send(ServerFrame::Event {
                event: BackendEvent::Log {
                    entry: entry.clone(),
                },
            });
        }
    }
    let id = NEXT_CLIENT_ID.fetch_add(1, Ordering::SeqCst);
    CLIENTS.lock().unwrap().insert(id, out);
    id
}

fn unregister_client(id: u64) {
    CLIENTS.lock().unwrap().remove(&id);
}

fn broadcast(event: BackendEvent) {
    let frame = ServerFrame::Event { event };
    let clients = CLIENTS.lock().unwrap();
    for out in clients.values() {
        let _ = out.try_send(frame.clone());
    }
}

pub fn flush_keybind_triggers() {
    for (name, key) in cheat::take_triggered() {
        broadcast(BackendEvent::Cheat(CheatEvent::KeyTriggered { name, key }));
    }
}

impl Responder {
    fn reply(&self, event: BackendEvent) {
        let _ = self.out.try_send(ServerFrame::Reply { id: self.id, event });
    }
}

pub fn start_server() {
    thread::spawn(|| {
        if let Err(error) = serve_forever() {
            log::debug!("[Tunnel] server stopped: {error:#}");
        }
    });
}

pub fn start_packet_stream() {
    let rx = sniffer::init_packet_channel();

    thread::spawn(move || {
        log::debug!("[Tunnel] packet stream broadcasting");
        for packet in rx {
            broadcast(BackendEvent::Sniffer(SnifferEvent::Packet(packet)));
        }
        log::debug!("[Tunnel] packet channel closed");
    });
}

pub fn start_log_stream(rx: Receiver<LogEntry>) {
    thread::spawn(move || {
        for entry in rx {
            {
                let mut backlog = LOG_BACKLOG.lock().unwrap();
                if backlog.len() >= LOG_BACKLOG_CAPACITY {
                    backlog.pop_front();
                }
                backlog.push_back(entry.clone());
            }
            broadcast(BackendEvent::Log { entry });
        }
        log::warn!("[Tunnel] log channel closed");
    });
}

fn serve_forever() -> anyhow::Result<()> {
    let addr = endpoint();
    let listener = TcpListener::bind(&addr)
        .map_err(|error| anyhow::anyhow!("failed to bind tunnel {addr}: {error}"))?;
    log::debug!("[Tunnel] listening on {addr}");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || handle_connection(stream));
            }
            Err(error) => {
                log::debug!("[Tunnel] accept failed: {error:#}");
                thread::sleep(Duration::from_millis(200));
            }
        }
    }

    Ok(())
}

fn handle_connection(stream: TcpStream) {
    let _ = stream.set_nodelay(true);

    let mut peek_buf = [0u8; 4];
    let is_ws = match stream.peek(&mut peek_buf) {
        Ok(n) if n >= 3 && (&peek_buf[..3] == b"GET" || (n >= 4 && &peek_buf[..4] == b"HTTP")) => true,
        _ => false,
    };

    if is_ws {
        handle_websocket_connection(stream);
    } else {
        handle_tcp_connection(stream);
    }
}

fn handle_websocket_connection(stream: TcpStream) {
    let ws_session = match hsr_ipc::ws::WebSocketSession::accept(stream) {
        Ok(ws) => ws,
        Err(error) => {
            log::debug!("[Tunnel] WebSocket handshake failed: {error:#}");
            return;
        }
    };

    let (out_tx, out_rx) = mpsc::sync_channel::<ServerFrame>(CLIENT_QUEUE_CAPACITY);
    let client_id = register_client(out_tx.clone());
    log::debug!("[Tunnel] WebSocket client {client_id} connected");

    let session = Arc::new(Mutex::new(ws_session));
    let write_session = session.clone();
    let alive = Arc::new(AtomicBool::new(true));
    let writer_alive = alive.clone();

    let writer = thread::spawn(move || {
        while let Ok(frame) = out_rx.recv() {
            let event = match frame {
                ServerFrame::Reply { event, .. } => event,
                ServerFrame::Event { event } => event,
            };
            let mut guard = match write_session.lock() {
                Ok(g) => g,
                Err(_) => break,
            };
            if guard.send_event(&event).is_err() {
                break;
            }
        }
        writer_alive.store(false, Ordering::SeqCst);
    });

    loop {
        if !alive.load(Ordering::SeqCst) {
            break;
        }

        let cmd = {
            let mut guard = match session.lock() {
                Ok(g) => g,
                Err(_) => break,
            };
            match guard.read_command() {
                Ok(Some(cmd)) => cmd,
                Ok(None) => continue,
                Err(_) => break,
            }
        };

        let responder = Responder {
            id: 0,
            out: out_tx.clone(),
        };
        thread::spawn(move || handle_command(&responder, cmd));
    }

    unregister_client(client_id);
    drop(out_tx);
    let _ = writer.join();
    log::debug!("[Tunnel] WebSocket client {client_id} disconnected");
}

fn handle_tcp_connection(stream: TcpStream) {
    let write_half = match stream.try_clone() {
        Ok(half) => half,
        Err(error) => {
            log::debug!("[Tunnel] clone failed: {error:#}");
            return;
        }
    };

    let (out_tx, out_rx) = mpsc::sync_channel::<ServerFrame>(CLIENT_QUEUE_CAPACITY);
    let client_id = register_client(out_tx.clone());
    let alive = Arc::new(AtomicBool::new(true));

    let writer_alive = alive.clone();
    let writer = thread::spawn(move || {
        let mut socket = write_half;
        while let Ok(frame) = out_rx.recv() {
            if hsr_ipc::write_json_frame(&mut socket, &frame).is_err() {
                break;
            }
        }
        writer_alive.store(false, Ordering::SeqCst);
    });

    log::debug!("[Tunnel] TCP client {client_id} connected");

    let mut socket = stream;
    loop {
        let frame: ClientFrame = match hsr_ipc::read_json_frame(&mut socket) {
            Ok(frame) => frame,
            Err(_) => break,
        };

        if !alive.load(Ordering::SeqCst) {
            break;
        }

        match frame {
            ClientFrame::Command { id, command } => {
                let responder = Responder {
                    id,
                    out: out_tx.clone(),
                };
                thread::spawn(move || handle_command(&responder, command));
            }
        }
    }

    unregister_client(client_id);
    drop(out_tx);
    let _ = writer.join();
    log::debug!("[Tunnel] TCP client {client_id} disconnected");
}

fn handle_command(responder: &Responder, command: FrontendCommand) {
    match command {
        FrontendCommand::Dumper(DumperCommand::Run { action }) => {
            handle_dumper(responder, action);
        }
        FrontendCommand::Sniffer(command) => handle_sniffer(responder, command),
        FrontendCommand::Cheat(command) => handle_cheat(responder, command),
        FrontendCommand::Config(command) => handle_config(responder, command),
        FrontendCommand::RunDumper { action } => handle_dumper(responder, action),
        FrontendCommand::StartSniffer => handle_sniffer(responder, SnifferCommand::Start),
        FrontendCommand::StopSniffer => handle_sniffer(responder, SnifferCommand::Stop),
        FrontendCommand::SendPacket {
            source,
            cmd_id,
            head,
            body,
        } => {
            handle_sniffer(
                responder,
                SnifferCommand::SendPacket {
                    source,
                    cmd_id,
                    head,
                    body,
                },
            );
        }
        FrontendCommand::SendPackets { packets } => {
            handle_sniffer(responder, SnifferCommand::SendPackets { packets });
        }
        FrontendCommand::ExecuteLua { script } => {
            let _ = crate::xluau::xlua::execute_script_string(script);
        }
        FrontendCommand::ExecuteLuaOnLoad { script } => {
            if let Err(e) = crate::xluau::xlua::execute_script_on_load_string(script) {
                log::debug!("[Tunnel] ExecuteLuaOnLoad failed: {e}");
            }
        }
        FrontendCommand::SetDumperEnabled { enabled } => {
            handle_config(responder, ConfigCommand::SetDumperEnabled { enabled });
        }
        FrontendCommand::SetCheatEnabled { name, enabled } => {
            handle_cheat(responder, CheatCommand::SetEnabled { name, enabled });
        }
    }
}

fn handle_dumper(responder: &Responder, action: DumperAction) {
    log::debug!("[Tunnel] run dumper: {}", action.label());
    let start = Instant::now();
    responder.reply(BackendEvent::DumperStarted { action });

    match actions::run(action) {
        Ok(()) => {
            let seconds = start.elapsed().as_secs();
            log::debug!("[Tunnel] dumper finished: {} ({seconds}s)", action.label());
            responder.reply(BackendEvent::DumperFinished { action, seconds });
        }
        Err(error) => {
            log::debug!("[Tunnel] dumper failed: {}: {error:#}", action.label());
            responder.reply(BackendEvent::DumperFailed {
                action,
                error: format!("{error:#}"),
            });
        }
    }
}

fn handle_sniffer(responder: &Responder, command: SnifferCommand) {
    match command {
        SnifferCommand::Start => log::debug!("[Tunnel] start sniffer requested"),
        SnifferCommand::Stop => log::debug!("[Tunnel] stop sniffer requested"),
        SnifferCommand::ClearPackets => {
            responder.reply(BackendEvent::Sniffer(SnifferEvent::Cleared));
        }
        SnifferCommand::SendPacket {
            source,
            cmd_id,
            head,
            body,
        } => {
            let result = u16::try_from(cmd_id)
                .map_err(|_| anyhow::anyhow!("cmd_id out of range: {cmd_id}"))
                .and_then(|cmd_id| send_custom_packet_on_game_thread(source, cmd_id, head, body));
            responder.reply(BackendEvent::Sniffer(SnifferEvent::SendPacketResult {
                ok: result.is_ok(),
                error: result.err().map(|error| format!("{error:#}")),
            }));
        }
        SnifferCommand::SendPackets { packets } => {
            let result = send_custom_packets_on_game_thread(packets);
            responder.reply(BackendEvent::Sniffer(SnifferEvent::SendPacketsResult {
                ok: result.all_ok,
                error: result.first_error,
            }));
        }
        SnifferCommand::SetHookCmdIds(cmd_ids) => {
            sniffer::set_hook_cmd_ids(cmd_ids);
        }
        SnifferCommand::PacketModifyResponse {
            request_id,
            body,
            drop_packet,
        } => {
            sniffer::handle_packet_modify_response(request_id, body, drop_packet);
        }
    }
}

fn send_custom_packet_on_game_thread(
    source: PacketSource,
    cmd_id: u16,
    head: Vec<u8>,
    body: Vec<u8>,
) -> anyhow::Result<()> {
    let (result_tx, result_rx) = std::sync::mpsc::channel();
    let active = Arc::new(AtomicBool::new(true));
    let active_for_task = active.clone();

    crate::apc_thread::call_in_thread(move || {
        if active_for_task
            .compare_exchange(true, false, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        let result = match source {
            PacketSource::Client => sniffer::send_custom_packet(cmd_id, &body),
            PacketSource::Server => sniffer::recv_custom_packet(cmd_id, &body),
        };

        if result.is_ok() {
            sniffer::push_custom_packet(source, cmd_id as u32, head, body);
        }

        let _ = result_tx.send(result);
    });

    match result_rx.recv_timeout(CUSTOM_PACKET_TASK_TIMEOUT) {
        Ok(result) => result,
        Err(error) => {
            active.store(false, Ordering::SeqCst);
            Err(anyhow::anyhow!(
                "custom packet main-thread task timed out: {error}"
            ))
        }
    }
}

fn send_custom_packets_on_game_thread(
    packets: Vec<hsr_ipc::sniffer::RawPacket>,
) -> SendPacketsResult {
    let (result_tx, result_rx) = std::sync::mpsc::channel();
    let active = Arc::new(AtomicBool::new(true));
    let active_for_task = active.clone();

    crate::apc_thread::call_in_thread(move || {
        if active_for_task
            .compare_exchange(true, false, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        let mut all_ok = true;
        let mut first_error = None;

        for packet in packets {
            let source = packet.source;
            let Ok(cmd_id) = u16::try_from(packet.cmd_id) else {
                all_ok = false;
                if first_error.is_none() {
                    first_error = Some(format!("cmd_id out of range: {}", packet.cmd_id));
                }
                continue;
            };

            let result = match source {
                PacketSource::Client => sniffer::send_custom_packet(cmd_id, &packet.body),
                PacketSource::Server => sniffer::recv_custom_packet(cmd_id, &packet.body),
            };

            if let Err(error) = result {
                all_ok = false;
                if first_error.is_none() {
                    first_error = Some(format!("{error:#}"));
                }
            } else {
                sniffer::push_custom_packet(source, cmd_id as u32, packet.head, packet.body);
            }
        }

        let _ = result_tx.send(SendPacketsResult {
            all_ok,
            first_error,
        });
    });

    match result_rx.recv_timeout(CUSTOM_PACKET_TASK_TIMEOUT) {
        Ok(result) => result,
        Err(error) => {
            active.store(false, Ordering::SeqCst);
            SendPacketsResult {
                all_ok: false,
                first_error: Some(format!(
                    "custom packet batch main-thread task timed out: {error}"
                )),
            }
        }
    }
}

fn handle_cheat(responder: &Responder, command: CheatCommand) {
    match command {
        CheatCommand::SetEnabled { name, enabled } => {
            if name == "hkrpg.hide_ui" || name == "hide_ui" {
                cheat::set_hide_ui_enabled(enabled);
            } else if name == "hkrpg.censorship" || name == "dither_patch" || name == "censorship" {
                cheat::set_censorship_enabled(enabled);
            } else if name == "fov_unlock" || name == "hkrpg.fov" {
                cheat::set_fov_unlock_enabled(enabled);
            } else if name == "fps_unlock" || name == "hkrpg.fps" {
                cheat::set_fps_unlock_enabled(enabled);
            } else if name == "battle_speed" || name == "hkrpg.battle_speed" {
                cheat::set_battle_speed_enabled(enabled);
            }
            responder.reply(BackendEvent::CheatStatus { name, enabled });
        }
        CheatCommand::SetValue { name, key, value } => {
            responder.reply(BackendEvent::Cheat(CheatEvent::Value { name, key, value }));
        }
        CheatCommand::SetKeyBind {
            name,
            key,
            key_code,
        } => {
            cheat::register_keybind(name.clone(), key.clone(), key_code);
            responder.reply(BackendEvent::Cheat(CheatEvent::KeyBind {
                name,
                key,
                key_code,
            }));
        }
        CheatCommand::RunAction { name, action } => {
            responder.reply(BackendEvent::Cheat(CheatEvent::Action { name, action }));
        }
    }
}

fn handle_config(responder: &Responder, command: ConfigCommand) {
    match command {
        ConfigCommand::SetDumperEnabled { enabled } => {
            responder.reply(BackendEvent::DumperStatus { enabled });
        }
    }
}
