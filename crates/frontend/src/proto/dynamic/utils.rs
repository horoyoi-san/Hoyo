use std::{any::Any, collections::HashMap};

pub fn read_varint(bytes: &[u8], cursor: &mut usize) -> anyhow::Result<u64> {
    let mut shift = 0u32;
    let mut value = 0u64;
    loop {
        if *cursor >= bytes.len() || shift >= 64 {
            anyhow::bail!("invalid protobuf varint at offset {}", *cursor);
        }
        let byte = bytes[*cursor];
        *cursor += 1;
        value |= ((byte & 0x7f) as u64) << shift;
        if byte & 0x80 == 0 {
            return Ok(value);
        }
        shift += 7;
    }
}

pub fn read_fixed32(bytes: &[u8], cursor: &mut usize) -> anyhow::Result<u32> {
    let data = read_exact(bytes, cursor, 4)?;
    Ok(u32::from_le_bytes(data.try_into().unwrap()))
}

pub fn read_fixed64(bytes: &[u8], cursor: &mut usize) -> anyhow::Result<u64> {
    let data = read_exact(bytes, cursor, 8)?;
    Ok(u64::from_le_bytes(data.try_into().unwrap()))
}

pub fn read_len<'a>(bytes: &'a [u8], cursor: &mut usize) -> anyhow::Result<&'a [u8]> {
    let len = read_varint(bytes, cursor)? as usize;
    read_exact(bytes, cursor, len)
}

pub fn read_exact<'a>(bytes: &'a [u8], cursor: &mut usize, len: usize) -> anyhow::Result<&'a [u8]> {
    let end = cursor
        .checked_add(len)
        .ok_or_else(|| anyhow::anyhow!("protobuf length overflow"))?;
    if end > bytes.len() {
        anyhow::bail!("protobuf field overruns packet body at offset {}", *cursor);
    }
    let data = &bytes[*cursor..end];
    *cursor = end;
    Ok(data)
}

pub fn zigzag32(value: u32) -> i32 {
    ((value >> 1) as i32) ^ (-((value & 1) as i32))
}

pub fn zigzag64(value: u64) -> i64 {
    ((value >> 1) as i64) ^ (-((value & 1) as i64))
}

pub fn hex_bytes(bytes: &[u8]) -> String {
    const TABLE: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(TABLE[(byte >> 4) as usize] as char);
        output.push(TABLE[(byte & 0x0f) as usize] as char);
    }
    output
}

pub fn parse_hex(hex: &str) -> Vec<u8> {
    let hex = hex.replace(' ', "").replace("0x", "").replace("0X", "");
    (0..hex.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(&hex[i..hex.len().min(i + 2)], 16).ok())
        .collect()
}

pub fn base64_encode(bytes: &[u8]) -> String {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    STANDARD.encode(bytes)
}

pub fn base64_decode(s: &str) -> Vec<u8> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    if let Ok(b) = STANDARD.decode(s) {
        b
    } else {
        parse_hex(s)
    }
}

pub fn write_varint(bytes: &mut Vec<u8>, mut value: u64) {
    while value >= 0x80 {
        bytes.push((value as u8) | 0x80);
        value >>= 7;
    }
    bytes.push(value as u8);
}

pub fn parse_cmd_ids(source: &str) -> HashMap<u32, String> {
    let mut map = HashMap::new();
    let mut pending_cmd_id = None;

    for line in source.lines() {
        if let Some(cmd_id) = parse_cmd_id_comment(line) {
            pending_cmd_id = Some(cmd_id);
            continue;
        }

        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("message ")
            && let Some(cmd_id) = pending_cmd_id.take()
        {
            let name = rest
                .split(|ch: char| ch.is_whitespace() || ch == '{')
                .next()
                .unwrap_or_default();
            if !name.is_empty() {
                map.insert(cmd_id, name.to_string());
            }
        }
    }

    map
}

fn parse_cmd_id_comment(line: &str) -> Option<u32> {
    let comment = line.split_once("//")?.1;
    let lower = comment.to_ascii_lowercase();
    let index = lower.find("cmdid")?;
    let digits = comment[index..]
        .chars()
        .skip_while(|ch| !ch.is_ascii_digit())
        .take_while(char::is_ascii_digit)
        .collect::<String>();
    digits.parse().ok()
}

pub fn panic_message(panic: &Box<dyn Any + Send>) -> String {
    panic
        .downcast_ref::<&str>()
        .map(|message| (*message).to_string())
        .or_else(|| panic.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "unknown panic payload".to_string())
}
