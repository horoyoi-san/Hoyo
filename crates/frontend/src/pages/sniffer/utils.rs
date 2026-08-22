use gpui::{Pixels, Window, px};

pub(super) fn centered_top(window: &Window, dialog_height: f32) -> Pixels {
    let viewport = window.viewport_size().height;
    let top = (viewport - px(dialog_height)) / 2.;
    let min = px(24.);
    if top > min { top } else { min }
}

pub fn compact_preview(value: &str) -> String {
    const MAX_PREVIEW_CHARS: usize = 220;
    const MAX_PARSE_BYTES: usize = 16 * 1024;

    let compacted = if value.len() <= MAX_PARSE_BYTES {
        serde_json::from_str::<serde_json::Value>(value)
            .and_then(|value| serde_json::to_string(&value))
            .unwrap_or_else(|_| value.split_whitespace().collect::<Vec<_>>().join(" "))
    } else {
        value.split_whitespace().collect::<Vec<_>>().join(" ")
    };

    for (count, (index, _)) in compacted.char_indices().enumerate() {
        if count == MAX_PREVIEW_CHARS {
            let mut result = String::with_capacity(index + 3);
            result.push_str(&compacted[..index]);
            result.push_str("...");
            return result;
        }
    }

    compacted
}

pub fn hex_encode(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn packet_head_pid(head: &[u8]) -> u64 {
    find_protobuf_field_number(head, 1, 0).unwrap_or(0)
}

pub fn raw_protobuf_json(bytes: &[u8]) -> String {
    let value = decode_raw_protobuf(bytes, 0).unwrap_or_else(|| serde_json::json!({}));
    serde_json::to_string_pretty(&value).unwrap_or_else(|_| "{}".to_string())
}

fn decode_raw_protobuf(bytes: &[u8], depth: usize) -> Option<serde_json::Value> {
    if depth > 4 {
        return None;
    }

    let mut cursor = 0usize;
    let mut object = serde_json::Map::new();

    while cursor < bytes.len() {
        let key = read_varint(bytes, &mut cursor)?;
        let field = (key >> 3).to_string();
        let wire = (key & 0x07) as u8;
        let value = match wire {
            0 => serde_json::json!(read_varint(bytes, &mut cursor)?),
            1 if cursor + 8 <= bytes.len() => {
                let mut raw = [0u8; 8];
                raw.copy_from_slice(&bytes[cursor..cursor + 8]);
                cursor += 8;
                serde_json::json!(u64::from_le_bytes(raw))
            }
            2 => {
                let data = read_len_delimited(bytes, &mut cursor)?;
                if let Some(nested) = decode_raw_protobuf(data, depth + 1) {
                    nested
                } else if let Ok(text) = std::str::from_utf8(data) {
                    serde_json::json!(text)
                } else {
                    serde_json::json!(base64_encode(data))
                }
            }
            5 if cursor + 4 <= bytes.len() => {
                let mut raw = [0u8; 4];
                raw.copy_from_slice(&bytes[cursor..cursor + 4]);
                cursor += 4;
                serde_json::json!(u32::from_le_bytes(raw))
            }
            _ => return None,
        };
        insert_raw_field(&mut object, field, value);
    }

    Some(serde_json::Value::Object(object))
}

fn insert_raw_field(
    object: &mut serde_json::Map<String, serde_json::Value>,
    field: String,
    value: serde_json::Value,
) {
    match object.get_mut(&field) {
        Some(serde_json::Value::Array(values)) => values.push(value),
        Some(existing) => {
            let previous = std::mem::take(existing);
            *existing = serde_json::Value::Array(vec![previous, value]);
        }
        None => {
            object.insert(field, value);
        }
    }
}

pub fn base64_encode(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

fn find_protobuf_field_number(bytes: &[u8], target_field: u64, depth: usize) -> Option<u64> {
    if depth > 3 {
        return None;
    }

    let mut cursor = 0usize;

    while cursor < bytes.len() {
        let key = read_varint(bytes, &mut cursor)?;
        let field = key >> 3;
        let wire = (key & 0x07) as u8;

        if field == target_field {
            return match wire {
                0 => read_varint(bytes, &mut cursor),
                1 if cursor + 8 <= bytes.len() => {
                    let mut raw = [0u8; 8];
                    raw.copy_from_slice(&bytes[cursor..cursor + 8]);
                    Some(u64::from_le_bytes(raw))
                }
                2 => read_len_delimited_number(bytes, &mut cursor, depth + 1, target_field),
                5 if cursor + 4 <= bytes.len() => {
                    let mut raw = [0u8; 4];
                    raw.copy_from_slice(&bytes[cursor..cursor + 4]);
                    Some(u32::from_le_bytes(raw) as u64)
                }
                _ => None,
            };
        }

        if wire == 2 {
            let data = read_len_delimited(bytes, &mut cursor)?;
            if let Some(value) = find_protobuf_field_number(data, target_field, depth + 1) {
                return Some(value);
            }
        } else if !skip_wire_value(bytes, &mut cursor, wire) {
            return None;
        }
    }

    None
}

fn read_len_delimited_number(
    bytes: &[u8],
    cursor: &mut usize,
    depth: usize,
    target_field: u64,
) -> Option<u64> {
    let data = read_len_delimited(bytes, cursor)?;
    if let Ok(text) = std::str::from_utf8(data)
        && let Ok(value) = text.trim().parse::<u64>()
    {
        return Some(value);
    }
    find_protobuf_field_number(data, target_field, depth)
}

fn read_len_delimited<'a>(bytes: &'a [u8], cursor: &mut usize) -> Option<&'a [u8]> {
    let len = read_varint(bytes, cursor)? as usize;
    if cursor.saturating_add(len) > bytes.len() {
        return None;
    }
    let data = &bytes[*cursor..*cursor + len];
    *cursor += len;
    Some(data)
}

fn read_varint(bytes: &[u8], cursor: &mut usize) -> Option<u64> {
    let mut value = 0u64;
    let mut shift = 0u32;

    while *cursor < bytes.len() && shift < 64 {
        let byte = bytes[*cursor];
        *cursor += 1;
        value |= ((byte & 0x7F) as u64) << shift;

        if byte & 0x80 == 0 {
            return Some(value);
        }

        shift += 7;
    }

    None
}

fn skip_wire_value(bytes: &[u8], cursor: &mut usize, wire: u8) -> bool {
    match wire {
        0 => read_varint(bytes, cursor).is_some(),
        1 => advance(cursor, bytes.len(), 8),
        2 => read_len_delimited(bytes, cursor).is_some(),
        5 => advance(cursor, bytes.len(), 4),
        _ => false,
    }
}

fn advance(cursor: &mut usize, len: usize, amount: usize) -> bool {
    if cursor.saturating_add(amount) > len {
        return false;
    }

    *cursor += amount;
    true
}
