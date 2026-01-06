use std::collections::HashMap;
use std::net::SocketAddr;
use std::process::ExitCode;
use std::sync::OnceLock;
use std::{io, task};

use tokio::io::{AsyncReadExt, AsyncWriteExt, AsyncWrite};
use tokio::net::tcp::OwnedReadHalf;
use tokio::net::{TcpStream, UdpSocket};
use tokio::sync::mpsc;

mod kcp;

use kcp::Kcp;

const KCPSHIM_BIND_ADDRESS: &str = "127.0.0.1:20501";
const KCPSHIM_CONNECT_ADDRESS: &str = "127.0.0.1:20501";
const MTU: usize = 1400;
const KCP_HS_SIZE: usize = 20;

struct Slave {
    incoming_kcp_data_tx: mpsc::Sender<Box<[u8]>>,
}

struct SlaveSink<'udpidor> {
    socket: &'udpidor UdpSocket,
    peer_addr: SocketAddr,
}

static UDP_SOCKET: OnceLock<UdpSocket> = OnceLock::new();

#[tokio::main]
async fn main() -> ExitCode {
    let mut slave_map: HashMap<u32, Slave> = HashMap::new();

    let server = match UdpSocket::bind(KCPSHIM_BIND_ADDRESS).await {
        Ok(server) => server,
        Err(err) => {
            eprintln!("kcpshim: failed to bind at {KCPSHIM_BIND_ADDRESS}: {err}");
            return ExitCode::FAILURE;
        }
    };

    eprintln!("kcpshim is listening at {KCPSHIM_BIND_ADDRESS}");

    let server = UDP_SOCKET.get_or_init(|| server);

    let mut recv_buffer = [0u8; MTU];
    let mut conv_counter = 0u32;

    loop {
        let Ok((len, from)) = server.recv_from(&mut recv_buffer).await else {
            continue;
        };

        match len {
            KCP_HS_SIZE => {
                match recv_buffer[0..20] {
                    [0x00, 0x00, 0x00, 0xFF, .., 0xFF, 0xFF, 0xFF, 0xFF] => {
                        eprintln!("new connection from {from}");

                        conv_counter += 1;
                        let conv_id = conv_counter;
                        let token: u32 = 0x13371337;

                        let kcpidor = Kcp::new(
                            conv_id,
                            token,
                            false,
                            SlaveSink {
                                socket: server,
                                peer_addr: from,
                            },
                        );

                        let (tx, rx) = mpsc::channel(228);
                        tokio::spawn(session_task(rx, kcpidor));

                        slave_map.insert(
                            conv_id,
                            Slave {
                                incoming_kcp_data_tx: tx,
                            },
                        );

                        let _ = server.send_to(&fabricate_kcp_handshake_response(conv_id, token), from).await;
                    }
                    _ => {} // could be a disconnect but fuck that for now
                }
            }
            28.. => {
                let conv_id = u32::from_le_bytes(recv_buffer[0..4].try_into().unwrap());
                if let Some(slave) = slave_map.get_mut(&conv_id) {
                    let _ = slave
                        .incoming_kcp_data_tx
                        .send(recv_buffer[..len].into())
                        .await;
                } else {
                    eprintln!(
                        "the slave with conv_id {conv_id} doesn't exist; opinion of {from} discarded"
                    );
                }
            }
            _ => {}
        }
    }
}

fn fabricate_kcp_handshake_response(conv_id: u32, token: u32) -> [u8; 20] {
    let mut buf = [0u8; 20];
    (&mut buf[0..4]).copy_from_slice(&0x145_u32.to_be_bytes());
    (&mut buf[4..8]).copy_from_slice(&conv_id.to_be_bytes());
    (&mut buf[8..12]).copy_from_slice(&token.to_be_bytes());
    (&mut buf[12..16]).copy_from_slice(&0_u32.to_be_bytes());
    (&mut buf[16..20]).copy_from_slice(&0x14514545_u32.to_be_bytes());

    buf
}

async fn session_task(mut udp_rx: mpsc::Receiver<Box<[u8]>>, mut kcpidor: Kcp<SlaveSink<'static>>) {
    let start_ts = unix_timestamp_ms();

    let client = match TcpStream::connect(KCPSHIM_CONNECT_ADDRESS).await {
        Ok(client) => client,
        Err(err) => {
            eprintln!("failed to connect to remote TCP server: {err}");
            return;
        }
    };

    let (rh, mut wh) = client.into_split();
    let (tx, mut tcp_rx) = mpsc::channel(228);

    tokio::spawn(tcp_connection_task(rh, tx));

    loop {
        tokio::select! {
            maybe_data = tcp_rx.recv() => if let Some(data) = maybe_data {
                kcpidor.send(&data).unwrap();
                kcpidor.async_flush().await.unwrap();
            } else {
                eprintln!("TCP server closed the connection");
                return;
            },
            maybe_data = udp_rx.recv() => if let Some(data) = maybe_data {
                kcpidor.input(&data).unwrap();
                kcpidor.async_update((unix_timestamp_ms() - start_ts) as u32)
                    .await
                    .unwrap();

                let mut buf = [0u8; 65535];
                while let Ok(len) = kcpidor.recv(&mut buf) {
                    wh.write_all(buf[..len].into()).await.unwrap();
                }

                kcpidor.async_flush().await.unwrap();
            }
        }
    }
}

async fn tcp_connection_task(
    mut rh: OwnedReadHalf,
    tx: mpsc::Sender<Box<[u8]>>,
) -> io::Result<()> {
    loop {
        let mut metadata = [0u8; 12];
        rh.read_exact(&mut metadata).await?;

        let head_len = u16::from_be_bytes(metadata[6..8].try_into().unwrap()) as usize;
        let body_len = u32::from_be_bytes(metadata[8..12].try_into().unwrap()) as usize;

        let mut payload_and_tail = vec![0u8; 12 + head_len + body_len + 4];
        rh.read_exact(&mut payload_and_tail[12..]).await?;
        (&mut payload_and_tail[0..12]).copy_from_slice(&metadata);

        if tx.send(payload_and_tail.into_boxed_slice()).await.is_err() {
            break;
        }
    }

    Ok(())
}

fn unix_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as _
}

impl AsyncWrite for SlaveSink<'_> {
    fn poll_write(
        self: std::pin::Pin<&mut Self>,
        cx: &mut task::Context<'_>,
        buf: &[u8],
    ) -> task::Poll<Result<usize, std::io::Error>> {
        self.socket.poll_send_to(cx, buf, self.peer_addr)
    }

    fn poll_flush(
        self: std::pin::Pin<&mut Self>,
        _cx: &mut task::Context<'_>,
    ) -> task::Poll<Result<(), std::io::Error>> {
        task::Poll::Ready(Ok(()))
    }

    fn poll_shutdown(
        self: std::pin::Pin<&mut Self>,
        _cx: &mut task::Context<'_>,
    ) -> task::Poll<Result<(), std::io::Error>> {
        task::Poll::Ready(Ok(()))
    }
}
