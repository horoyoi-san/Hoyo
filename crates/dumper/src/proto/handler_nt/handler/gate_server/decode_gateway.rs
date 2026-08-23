use std::collections::HashMap;
use std::sync::OnceLock;

use super::{decoder, dispatch};
use crate::version::GAME_VERSION;

static PROTO_FIELDS: OnceLock<HashMap<u32, String>> = OnceLock::new();

pub fn set_proto_fields(fields: HashMap<u32, String>) {
    let _ = PROTO_FIELDS.set(fields);
}

pub fn run() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let version = &*GAME_VERSION;
    let seed = &*dispatch::DISPATCH_SEED;

    let Some(dispatch_url) = dispatch::get_dispatch_url() else {
        return HashMap::new();
    };
    let full_dispatch_url = format!(
        "{dispatch_url}?version={version}&language_type=3&platform_type=3&channel_id=1&sub_channel_id=1&is_new_format=1"
    );
    log::debug!("[Gateway] dispatch_url = {full_dispatch_url}");

    let Some(gateway_url) = dispatch::fetch_gateway_url(&dispatch_url, version) else {
        return HashMap::new();
    };

    let full_gateway_url = format!(
        "{gateway_url}?version={version}&platform_type=1&language_type=3&dispatch_seed={seed}&channel_id=1&sub_channel_id=1&is_need_url=1"
    );
    log::debug!("[Gateway] gateway_url = {full_gateway_url}");

    let Some(result) = dispatch::fetch_gateway_response(&gateway_url, version, seed) else {
        return HashMap::new();
    };

    let proto_fields = PROTO_FIELDS.get();

    let mut pairs: Vec<(String, &str)> = Vec::new();

    for f in &result.fields {
        match &f.value {
            decoder::DecodedValue::Buffer(bytes) => {
                let Ok(s) = String::from_utf8(bytes.clone()) else {
                    continue;
                };
                let deobf_name = if is_ip(&s) {
                    "GateServerAddress"
                } else if is_ec2b(&s) {
                    "client_secret_key"
                } else if s.contains("/asb/") {
                    "asset_bundle_url"
                } else if s.contains("/design_data/") {
                    "ex_resource_url"
                } else if s.contains("/lua/") {
                    "lua_url"
                } else if s.contains("/ifix/") {
                    "ifix_url"
                } else {
                    continue;
                };

                if let Some(obf_name) = proto_fields.and_then(|pf| pf.get(&f.field)) {
                    pairs.push((obf_name.clone(), deobf_name));
                }
            }
            decoder::DecodedValue::BigInt(num) => {
                if *num < 23301 || *num > 23302 {
                    continue;
                }
                if let Some(obf_name) = proto_fields.and_then(|pf| pf.get(&f.field)) {
                    pairs.push((obf_name.clone(), "port"));
                }
            }
            _ => {}
        }
    }

    let mut name_counts: HashMap<&str, usize> = HashMap::new();
    for (_, name) in &pairs {
        *name_counts.entry(name).or_insert(0) += 1;
    }

    let mut name_idxs: HashMap<&str, usize> = HashMap::new();
    for (obf_name, name) in &pairs {
        let count = name_counts[name];
        let final_name = if count > 1 {
            let idx = name_idxs.entry(name).or_insert(0);
            *idx += 1;
            format!("{idx}_{name}")
        } else {
            name.to_string()
        };
        log::debug!("[Gateway] {obf_name} -> {final_name}");
        map.insert(obf_name.clone(), final_name);
    }

    map
}

fn is_ip(s: &str) -> bool {
    s.parse::<std::net::Ipv4Addr>().is_ok()
}

fn is_ec2b(s: &str) -> bool {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(s.trim())
        .is_ok_and(|v| v.starts_with(b"Ec2b"))
}
