use anyhow::Result;
use dashmap::DashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::UdpSocket;
use crate::protocol::{DynamicOpcodeRegistry, NetPacket};
use crate::handlers::{PlayerSession, route_packet_dynamic};

pub struct GameServer {
    pub port: u16,
    pub sessions: Arc<DashMap<SocketAddr, PlayerSession>>,
    pub opcode_registry: Arc<DynamicOpcodeRegistry>,
}

impl GameServer {
    pub fn new(port: u16) -> Self {
        let registry = Arc::new(DynamicOpcodeRegistry::default());
        // Auto-scan local dump directories for newly extracted opcodes
        let dump_candidates = ["./DUMP", "../DUMP", "./dumps", "../dumps"];
        for dir in dump_candidates {
            if std::path::Path::new(dir).is_dir() {
                let count = registry.load_from_dump_dir(dir);
                if count > 0 {
                    log::info!("[Gameserver] Auto-loaded {} dynamic opcodes from '{}'", count, dir);
                    break;
                }
            }
        }

        Self {
            port,
            sessions: Arc::new(DashMap::new()),
            opcode_registry: registry,
        }
    }

    pub fn with_registry(port: u16, registry: Arc<DynamicOpcodeRegistry>) -> Self {
        Self {
            port,
            sessions: Arc::new(DashMap::new()),
            opcode_registry: registry,
        }
    }

    pub async fn run(&self) -> Result<()> {
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let socket = Arc::new(UdpSocket::bind(addr).await?);
        crate::emit_log(format!(
            "[GAMESERVER KCP] 🎮 UDP Socket bound to 0.0.0.0:{} (Dynamic Opcode Router: {} opcodes ready)",
            self.port,
            self.opcode_registry.name_to_id.len()
        ));

        let mut buf = [0u8; 65535];
        loop {
            let (len, peer) = match socket.recv_from(&mut buf).await {
                Ok(res) => res,
                Err(err) => {
                    crate::emit_log(format!("[GAMESERVER KCP] ⚠ UDP recv error: {err}"));
                    continue;
                }
            };

            let data = &buf[..len];
            let mut session = self.sessions.entry(peer).or_insert_with(PlayerSession::default);

            if let Ok(packet) = NetPacket::deserialize(data) {
                if let Ok(Some(rsp)) = route_packet_dynamic(&mut session, &packet, &self.opcode_registry).await {
                    let ser = rsp.serialize();
                    let _ = socket.send_to(&ser, peer).await;
                }
            } else {
                crate::emit_log(format!("[GAMESERVER KCP] 📦 Received {len} raw bytes from client {peer}"));
            }
        }
    }
}
