use std::{
    collections::HashMap,
    net::TcpStream,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc::{self, Receiver, Sender, SyncSender},
    },
    thread,
    time::{Duration, Instant},
};

use anyhow::{Context, Result, anyhow};
use serde::{Deserialize, Serialize};

use crate::{BackendEvent, FrontendCommand, frame};

pub const DEFAULT_ADDR: &str = "127.0.0.1:42857";
pub const ADDR_ENV: &str = "HSR_OWNER_ADDR";
const RECONNECT_INTERVAL: Duration = Duration::from_millis(250);

pub fn endpoint() -> String {
    std::env::var(ADDR_ENV).unwrap_or_else(|_| DEFAULT_ADDR.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClientFrame {
    Command { id: u64, command: FrontendCommand },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServerFrame {
    Reply { id: u64, event: BackendEvent },
    Event { event: BackendEvent },
}

#[derive(Clone)]
pub struct RpcClient {
    inner: Arc<ClientInner>,
}

struct ClientInner {
    addr: String,
    writer: Mutex<Option<TcpStream>>,
    pending: Mutex<HashMap<u64, SyncSender<BackendEvent>>>,
    subscribers: Mutex<Vec<Sender<BackendEvent>>>,
    next_id: AtomicU64,
    connected: AtomicBool,
}

impl RpcClient {
    pub fn start() -> Self {
        Self::start_with(endpoint())
    }

    pub fn start_with(addr: String) -> Self {
        let inner = Arc::new(ClientInner {
            addr,
            writer: Mutex::new(None),
            pending: Mutex::new(HashMap::new()),
            subscribers: Mutex::new(Vec::new()),
            next_id: AtomicU64::new(1),
            connected: AtomicBool::new(false),
        });

        let reader = inner.clone();
        thread::spawn(move || reader.run());

        Self { inner }
    }

    pub fn is_connected(&self) -> bool {
        self.inner.connected.load(Ordering::SeqCst)
    }

    pub fn wait_connected(&self, timeout: Duration) -> bool {
        self.inner.wait_connected(timeout)
    }

    pub fn subscribe(&self) -> Receiver<BackendEvent> {
        let (tx, rx) = mpsc::channel();
        self.inner.subscribers.lock().unwrap().push(tx);
        rx
    }

    pub fn send(&self, command: FrontendCommand) -> Result<()> {
        let id = self.inner.next_id.fetch_add(1, Ordering::SeqCst);
        self.inner.write_command(id, command)
    }

    pub fn request(&self, command: FrontendCommand, timeout: Duration) -> Result<BackendEvent> {
        let deadline = Instant::now() + timeout;
        let id = self.inner.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = mpsc::sync_channel(1);
        self.inner.pending.lock().unwrap().insert(id, tx);

        if !self.inner.wait_connected(timeout) {
            self.inner.pending.lock().unwrap().remove(&id);
            return Err(anyhow!("tunnel request {id} failed: not connected"));
        }

        if let Err(error) = self.inner.write_command(id, command) {
            self.inner.pending.lock().unwrap().remove(&id);
            return Err(error);
        }

        let remaining = deadline
            .saturating_duration_since(Instant::now())
            .max(Duration::from_millis(1));
        match rx.recv_timeout(remaining) {
            Ok(event) => Ok(event),
            Err(error) => {
                self.inner.pending.lock().unwrap().remove(&id);
                Err(anyhow!("tunnel request {id} failed: {error}"))
            }
        }
    }
}

impl ClientInner {
    fn write_command(&self, id: u64, command: FrontendCommand) -> Result<()> {
        let mut guard = self.writer.lock().unwrap();
        let stream = guard.as_mut().context("tunnel is not connected")?;
        match frame::write_json_frame(stream, &ClientFrame::Command { id, command }) {
            Ok(()) => Ok(()),
            Err(error) => {
                *guard = None;
                self.connected.store(false, Ordering::SeqCst);
                Err(error)
            }
        }
    }

    fn run(self: Arc<Self>) {
        loop {
            match TcpStream::connect(&self.addr) {
                Ok(stream) => match stream.try_clone() {
                    Ok(write_half) => {
                        let _ = stream.set_nodelay(true);
                        *self.writer.lock().unwrap() = Some(write_half);
                        self.connected.store(true, Ordering::SeqCst);
                        log::debug!("[Tunnel] connected to {}", self.addr);

                        self.read_loop(stream);

                        self.connected.store(false, Ordering::SeqCst);
                        *self.writer.lock().unwrap() = None;
                        self.fail_pending();
                        log::debug!("[Tunnel] disconnected from {}", self.addr);
                    }
                    Err(error) => log::debug!("[Tunnel] clone failed: {error:#}"),
                },
                Err(error) => log::trace!("[Tunnel] connect {} failed: {error:#}", self.addr),
            }

            thread::sleep(RECONNECT_INTERVAL);
        }
    }

    fn read_loop(&self, mut stream: TcpStream) {
        loop {
            let frame: ServerFrame = match frame::read_json_frame(&mut stream) {
                Ok(frame) => frame,
                Err(_) => break,
            };

            match frame {
                ServerFrame::Reply { id, event } => {
                    if let Some(tx) = self.pending.lock().unwrap().remove(&id) {
                        let _ = tx.try_send(event.clone());
                    }
                    self.broadcast(event);
                }
                ServerFrame::Event { event } => self.broadcast(event),
            }
        }
    }

    fn broadcast(&self, event: BackendEvent) {
        let mut subscribers = self.subscribers.lock().unwrap();
        subscribers.retain(|tx| tx.send(event.clone()).is_ok());
    }

    fn fail_pending(&self) {
        self.pending.lock().unwrap().clear();
    }

    fn wait_connected(&self, timeout: Duration) -> bool {
        if self.connected.load(Ordering::SeqCst) {
            return true;
        }
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            thread::sleep(Duration::from_millis(10));
            if self.connected.load(Ordering::SeqCst) {
                return true;
            }
        }
        self.connected.load(Ordering::SeqCst)
    }
}
