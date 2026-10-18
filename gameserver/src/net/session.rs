use std::{
    collections::HashSet,
    io::Error,
    net::SocketAddr,
    pin::Pin,
    sync::{Arc, OnceLock},
    task::{Context, Poll},
    time::SystemTime,
};

use anyhow::Result;
use common::sr_tools::FreesrData;
use mhy_kcp::Kcp;
use prost::Message;
use proto::{AvatarSync, CmdID, CmdPlayerType, PlayerSyncScNotify};
use tokio::{
    io::AsyncWrite,
    net::UdpSocket,
    sync::{Mutex, watch},
};

use crate::{net::handlers::BASE_AVATAR_IDS, util};

use super::{NetPacket, packet::CommandHandler};

struct RemoteEndPoint {
    socket: Arc<UdpSocket>,
    addr: SocketAddr,
}

pub struct PlayerSession {
    pub token: u32,
    kcp: Arc<Mutex<Kcp<RemoteEndPoint>>>,
    start_time: u64,
    pub shutdown_tx: watch::Sender<()>,
    _shutdown_rx: watch::Receiver<()>,
    pub json_data: OnceLock<FreesrData>,
    pub freesr_data_signature: Option<(SystemTime, u64)>,
    pub next_scene_save: u64,
    pub pending_spawned_monsters: bool,
    pub next_spawned_monster_entity_id: u32,
    pub used_spawned_monster_entity_ids: HashSet<u32>,
}

impl PlayerSession {
    pub fn new(socket: Arc<UdpSocket>, addr: SocketAddr, conv: u32, token: u32) -> Self {
        let (shutdown_tx, shutdown_rx) = watch::channel(());
        Self {
            token,
            kcp: Arc::new(Mutex::new(Kcp::new(
                conv,
                token,
                false,
                RemoteEndPoint { socket, addr },
            ))),
            start_time: util::cur_timestamp_secs(),
            json_data: OnceLock::new(),
            freesr_data_signature: None,
            _shutdown_rx: shutdown_rx,
            shutdown_tx,
            next_scene_save: 0,
            pending_spawned_monsters: false,
            next_spawned_monster_entity_id: 40_000,
            used_spawned_monster_entity_ids: HashSet::new(),
        }
    }

    pub async fn consume(&mut self, buffer: &[u8]) -> Result<()> {
        let mut kcp = self.kcp.lock().await;
        kcp.input(buffer)?;
        kcp.async_update(self.session_time() as u32).await?;
        kcp.async_flush().await?;

        let mut packets = Vec::new();
        let mut buf = [0; 24756];
        while let Ok(length) = kcp.recv(&mut buf) {
            packets.push(NetPacket::from(&buf[..length]));
        }

        drop(kcp);

        for packet in packets {
            if packet.cmd_type == CmdPlayerType::CmdPlayerLogoutCsReq as u16 {
                tracing::info!("Player logged out");
                if let Some(player) = self.json_data.get() {
                    player.save_persistent().await;
                }
                let _ = self.shutdown_tx.send(());
                return Ok(());
            };
            Self::on_message(self, packet.cmd_type, packet.body).await?;
        }

        self.kcp
            .lock()
            .await
            .async_update(self.session_time() as u32)
            .await?;
        Ok(())
    }

    pub async fn send(&self, body: impl Message + CmdID) -> Result<()> {
        let mut buf = Vec::new();
        body.encode(&mut buf)?;
        tracing::info!("sent packet with CmdID: {}", body.get_cmd_id());

        let payload: Vec<u8> = NetPacket {
            cmd_type: body.get_cmd_id(),
            head: Vec::new(),
            body: buf,
        }
        .into();

        let mut kcp = self.kcp.lock().await;
        kcp.send(&payload)?;
        kcp.async_flush().await?;
        kcp.async_update(self.session_time() as u32).await?;

        Ok(())
    }

    pub async fn send_raw(&self, payload: NetPacket) -> Result<()> {
        let mut kcp = self.kcp.lock().await;
        let payload: Vec<u8> = payload.into();
        kcp.send(&payload)?;
        kcp.async_flush().await?;
        kcp.async_update(self.session_time() as u32).await?;

        Ok(())
    }

    pub async fn sync_player(&self) -> Result<()> {
        let Some(json) = self.json_data.get() else {
            tracing::error!("data is not init!");
            return Ok(());
        };

        // clear relics & lightcones
        self.send(PlayerSyncScNotify {
            del_relic_list: (1..=3000).collect(),
            del_equipment_list: (3001..=3500).collect(),
            ..Default::default()
        })
        .await?;

        // clear all avatars equip item
        self.send(PlayerSyncScNotify {
            avatar_sync: Some(AvatarSync {
                avatar_list: BASE_AVATAR_IDS
                    .into_iter()
                    .filter_map(|id| {
                        json.avatars.get(&id).map(|v| {
                            v.to_avatar_proto(
                                Option::None,
                                json.main_character as u32,
                                json.march_type as u32,
                            )
                        })
                    })
                    .collect(),
                avatar_path_data_info_list: json
                    .avatars
                    .values()
                    .map(|avatar| {
                        avatar.to_avatar_path_data_proto(Option::None, Vec::with_capacity(0))
                    })
                    .collect::<Vec<_>>(),
            }),

            ..Default::default()
        })
        .await?;

        // Sync new relics & lightcones
        self.send(PlayerSyncScNotify {
            relic_list: json.relics.iter().map(|v| v.into()).collect(),
            equipment_list: json.lightcones.iter().map(|v| v.into()).collect(),
            ..Default::default()
        })
        .await?;

        // Sync new avatars equip item
        self.send(PlayerSyncScNotify {
            avatar_sync: Some(AvatarSync {
                avatar_list: BASE_AVATAR_IDS
                    .into_iter()
                    .filter_map(|avatar_id| {
                        json.avatars.get(&avatar_id).map(|v| {
                            v.to_avatar_proto(
                                json.lightcones.iter().find(|v| v.equip_avatar == avatar_id),
                                json.main_character as u32,
                                json.march_type as u32,
                            )
                        })
                    })
                    .collect(),
                avatar_path_data_info_list: json
                    .avatars
                    .values()
                    .map(|avatar| {
                        avatar.to_avatar_path_data_proto(
                            json.lightcones
                                .iter()
                                .find(|v| v.equip_avatar == avatar.avatar_id),
                            json.relics
                                .iter()
                                .filter(|r| r.equip_avatar == avatar.avatar_id)
                                .collect(),
                        )
                    })
                    .collect::<Vec<_>>(),
            }),
            ..Default::default()
        })
        .await
    }

    pub async fn reload_and_sync_player(&mut self) -> Result<()> {
        let Some(json) = self.json_data.get_mut() else {
            anyhow::bail!("player data is not initialized");
        };
        json.update().await?;
        self.freesr_data_signature = match tokio::fs::metadata("freesr-data.json").await {
            Ok(metadata) => Some((metadata.modified()?, metadata.len())),
            Err(err) => {
                tracing::warn!("Could not read freesr-data.json metadata after reload: {err}");
                None
            }
        };
        self.sync_player().await
    }

    pub async fn sync_player_if_data_changed(&mut self) -> Result<bool> {
        let metadata = match tokio::fs::metadata("freesr-data.json").await {
            Ok(metadata) => metadata,
            Err(err) => {
                tracing::warn!("Could not check freesr-data.json for changes: {err}");
                return Ok(false);
            }
        };
        let signature = (metadata.modified()?, metadata.len());
        if self.freesr_data_signature == Some(signature) {
            return Ok(false);
        }

        self.reload_and_sync_player().await?;
        tracing::info!("Reloaded changed freesr-data.json and synced it to the client");
        Ok(true)
    }

    fn session_time(&self) -> u64 {
        util::cur_timestamp_secs() - self.start_time
    }
}

// Auto implemented
impl CommandHandler for PlayerSession {}

impl AsyncWrite for RemoteEndPoint {
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<Result<usize, Error>> {
        self.socket.poll_send_to(cx, buf, self.addr)
    }

    fn poll_flush(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Result<(), Error>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Result<(), Error>> {
        Poll::Ready(Ok(()))
    }
}
