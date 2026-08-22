use std::collections::HashMap;

pub fn hash_path(s: &str) -> i32 {
    let b = s.as_bytes();
    let mut h1: u32 = 5381;
    let mut h2: u32 = 5381;
    let mut i = 0;
    while i < b.len() {
        h1 = h1.wrapping_shl(5).wrapping_add(h1) ^ (b[i] as u32);
        if i + 1 < b.len() {
            h2 = h2.wrapping_shl(5).wrapping_add(h2) ^ (b[i + 1] as u32);
        }
        i += 2;
    }
    h1.wrapping_add(h2.wrapping_mul(1_566_083_941)) as i32
}

const KNOWN_MANIFEST_HASH: i32 = -45_104_001;

pub fn find_manifest(data_map: &HashMap<i32, Vec<u8>>) -> Option<Vec<String>> {
    if let Some(raw) = data_map.get(&KNOWN_MANIFEST_HASH)
        && let Some(paths) = try_parse_manifest(raw)
    {
        log::debug!("[lua_v] manifest via known hash");
        return Some(paths);
    }
    for raw in data_map.values() {
        if let Some(paths) = try_parse_manifest(raw) {
            log::debug!("[lua_v] manifest via content heuristic");
            return Some(paths);
        }
    }
    None
}

fn try_parse_manifest(data: &[u8]) -> Option<Vec<String>> {
    let text = std::str::from_utf8(data).ok()?;
    let mut paths = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !trimmed.starts_with('{') {
            return None;
        }
        let path = extract_path(trimmed)?;
        paths.push(path.to_owned());
    }
    if paths.is_empty() { None } else { Some(paths) }
}

fn extract_path(line: &str) -> Option<&str> {
    let key = "\"Path\":\"";
    let after = line.find(key)?;
    let start = after + key.len();
    let end = line[start..].find('"')?;
    Some(&line[start..start + end])
}
