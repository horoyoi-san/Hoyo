use std::path::Path;

use hsr_ipc::{DecodedPacket, PacketSource};
use prism128::{KEY_SIZE, Key};
use rand_core::TryRngCore;

const MAGIC: &[u8; 4] = b"1337";
const SOURCE_CLIENT: u8 = 0;
const SOURCE_SERVER: u8 = 1;

#[derive(Debug)]
pub enum SniffFileError {
    Io(std::io::Error),
    Crypto(prism128::Error),
    InvalidFormat(&'static str),
}

impl std::fmt::Display for SniffFileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(err) => write!(f, "io error: {err}"),
            Self::Crypto(err) => write!(f, "crypto error: {err:?}"),
            Self::InvalidFormat(reason) => write!(f, "invalid sniff file: {reason}"),
        }
    }
}

impl std::error::Error for SniffFileError {}

impl From<std::io::Error> for SniffFileError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}

impl From<prism128::Error> for SniffFileError {
    fn from(err: prism128::Error) -> Self {
        Self::Crypto(err)
    }
}

pub type Result<T> = std::result::Result<T, SniffFileError>;
pub fn generate_key() -> Key {
    let mut key = [0u8; KEY_SIZE];
    rand_core::OsRng
        .try_fill_bytes(&mut key)
        .expect("OsRng should always succeed");
    key
}

pub fn key_to_hex(key: &Key) -> String {
    key.iter().map(|b| format!("{b:02x}")).collect()
}

pub fn hex_to_key(hex: &str) -> Option<Key> {
    let hex = hex.strip_suffix(".sniff").unwrap_or(hex);
    if hex.len() != KEY_SIZE * 2 {
        return None;
    }
    let mut key = [0u8; KEY_SIZE];
    for (i, chunk) in hex.as_bytes().as_chunks::<2>().0.iter().enumerate() {
        let chunk = std::str::from_utf8(chunk).ok()?;
        key[i] = u8::from_str_radix(chunk, 16).ok()?;
    }
    Some(key)
}

pub fn suggested_filename(key: &Key) -> String {
    format!("{}.sniff", key_to_hex(key))
}

fn serialize_packets(packets: &[DecodedPacket]) -> Vec<u8> {
    let mut buf = Vec::new();
    buf.extend_from_slice(MAGIC);
    buf.extend_from_slice(&(packets.len() as u32).to_be_bytes());

    for packet in packets {
        let source_byte = match packet.source {
            PacketSource::Client => SOURCE_CLIENT,
            PacketSource::Server => SOURCE_SERVER,
        };
        buf.push(source_byte);
        buf.extend_from_slice(&packet.cmd_id.to_be_bytes());
        buf.extend_from_slice(&(packet.head.len() as u32).to_be_bytes());
        buf.extend_from_slice(&(packet.body.len() as u32).to_be_bytes());
        buf.extend_from_slice(&packet.head);
        buf.extend_from_slice(&packet.body);
    }

    buf
}

fn deserialize_packets(data: &[u8]) -> Result<Vec<DecodedPacket>> {
    if data.len() < MAGIC.len() + 4 {
        return Err(SniffFileError::InvalidFormat("file too short"));
    }
    if &data[0..4] != MAGIC {
        return Err(SniffFileError::InvalidFormat("bad magic"));
    }

    let count = u32::from_be_bytes(data[4..8].try_into().unwrap()) as usize;
    let mut packets = Vec::with_capacity(count);
    let mut cursor = 8usize;

    for index in 0..count {
        let record = read_record(data, &mut cursor)
            .map_err(|_| SniffFileError::InvalidFormat("truncated packet record"))?;
        packets.push(DecodedPacket {
            id: index as u64 + 1,
            cmd_id: record.cmd_id,
            source: record.source,
            name: None,
            head: record.head,
            body: record.body,
            body_json: None,
            request_id: None,
            custom_packet: false,
        });
    }

    Ok(packets)
}

struct Record {
    source: PacketSource,
    cmd_id: u32,
    head: Vec<u8>,
    body: Vec<u8>,
}

fn read_record(data: &[u8], cursor: &mut usize) -> std::io::Result<Record> {
    let source = read_u8(data, cursor)?;
    let source = match source {
        SOURCE_CLIENT => PacketSource::Client,
        SOURCE_SERVER => PacketSource::Server,
        _ => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "bad source byte",
            ));
        }
    };
    let cmd_id = read_u32(data, cursor)?;
    let head_len = read_u32(data, cursor)? as usize;
    let body_len = read_u32(data, cursor)? as usize;
    let head = read_bytes(data, cursor, head_len)?;
    let body = read_bytes(data, cursor, body_len)?;
    Ok(Record {
        source,
        cmd_id,
        head,
        body,
    })
}

fn read_u8(data: &[u8], cursor: &mut usize) -> std::io::Result<u8> {
    if *cursor >= data.len() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::UnexpectedEof,
            "eof",
        ));
    }
    let value = data[*cursor];
    *cursor += 1;
    Ok(value)
}

fn read_u32(data: &[u8], cursor: &mut usize) -> std::io::Result<u32> {
    if *cursor + 4 > data.len() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::UnexpectedEof,
            "eof",
        ));
    }
    let value = u32::from_be_bytes(data[*cursor..*cursor + 4].try_into().unwrap());
    *cursor += 4;
    Ok(value)
}

fn read_bytes(data: &[u8], cursor: &mut usize, len: usize) -> std::io::Result<Vec<u8>> {
    if *cursor + len > data.len() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::UnexpectedEof,
            "eof",
        ));
    }
    let bytes = data[*cursor..*cursor + len].to_vec();
    *cursor += len;
    Ok(bytes)
}

pub fn save<P: AsRef<Path>>(packets: &[DecodedPacket], path: P, key: Key) -> Result<()> {
    let plaintext = serialize_packets(packets);
    let ciphertext = prism128::encrypt(key, plaintext)?;
    std::fs::write(path, ciphertext)?;
    Ok(())
}

pub fn load<P: AsRef<Path>>(path: P, key: Key) -> Result<Vec<DecodedPacket>> {
    let ciphertext = std::fs::read(path)?;
    let plaintext = prism128::decrypt(key, ciphertext)?;
    deserialize_packets(&plaintext)
}
