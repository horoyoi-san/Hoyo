use std::net::TcpStream;
use anyhow::{Context, Result};
use tungstenite::{WebSocket, Message, accept};
use crate::{BackendEvent, FrontendCommand};

pub struct WebSocketSession {
    ws: WebSocket<TcpStream>,
}

impl WebSocketSession {
    pub fn accept(stream: TcpStream) -> Result<Self> {
        let ws = accept(stream).context("failed to perform websocket handshake")?;
        Ok(Self { ws })
    }

    pub fn read_command(&mut self) -> Result<Option<FrontendCommand>> {
        match self.ws.read()? {
            Message::Text(text) => {
                let cmd: FrontendCommand = serde_json::from_str(&text)
                    .with_context(|| format!("failed to parse frontend command from websocket: {text}"))?;
                Ok(Some(cmd))
            }
            Message::Binary(bin) => {
                let cmd: FrontendCommand = serde_json::from_slice(&bin)
                    .context("failed to parse binary frontend command from websocket")?;
                Ok(Some(cmd))
            }
            Message::Ping(payload) => {
                let _ = self.ws.send(Message::Pong(payload));
                Ok(None)
            }
            Message::Close(_) => Ok(None),
            _ => Ok(None),
        }
    }

    pub fn send_event(&mut self, event: &BackendEvent) -> Result<()> {
        let json = serde_json::to_string(event)?;
        self.ws.send(Message::Text(json.into()))?;
        Ok(())
    }
}
