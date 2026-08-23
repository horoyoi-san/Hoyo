use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::diskcache::KeyCollector;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Server {
    Official,
    Oversea,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Endpoint {
    Standard,
    Collaboration,
}

#[derive(Clone, Debug)]
pub struct GachaUrl {
    pub raw: String,
    pub base: String,
    pub server: Server,
    pub creation_time: u64,
    query: Vec<(String, String)>,
}

impl GachaUrl {
    pub fn is_fresh(&self) -> bool {
        is_fresh(self.creation_time)
    }

    pub fn is_full_history(&self) -> bool {
        self.query
            .iter()
            .any(|(k, v)| k == "gacha_id" && !v.is_empty() && v != "0")
    }

    pub fn short_history(&self) -> GachaUrl {
        let mut out = self.clone();
        out.query.retain(|(k, _)| k != "gacha_id");
        out
    }

    pub fn cached_gacha_type(&self) -> Option<u32> {
        let find = |key: &str| {
            self.query
                .iter()
                .find(|(k, _)| k == key)
                .and_then(|(_, v)| v.parse::<u32>().ok())
        };
        find("gacha_type").or_else(|| find("default_gacha_type"))
    }

    fn full_history_endpoint(&self) -> &'static str {
        match self.server {
            Server::Official => {
                "https://public-operation-hkrpg.mihoyo.com/common/hkrpg_gacha_record/api/getGachaLog"
            }
            Server::Oversea => {
                "https://public-operation-hkrpg-sg.hoyoverse.com/common/hkrpg_gacha_record/api/getGachaLog"
            }
        }
    }

    pub fn endpoint_url(&self, endpoint: Endpoint) -> &'static str {
        match (self.server, endpoint) {
            (Server::Official, Endpoint::Standard) => {
                "https://public-operation-hkrpg.mihoyo.com/common/gacha_record/api/getGachaLog"
            }
            (Server::Oversea, Endpoint::Standard) => {
                "https://public-operation-hkrpg-sg.hoyoverse.com/common/gacha_record/api/getGachaLog"
            }
            (Server::Official, Endpoint::Collaboration) => {
                "https://public-operation-hkrpg.mihoyo.com/common/gacha_record/api/getLdGachaLog"
            }
            (Server::Oversea, Endpoint::Collaboration) => {
                "https://public-operation-hkrpg-sg.hoyoverse.com/common/gacha_record/api/getLdGachaLog"
            }
        }
    }

    pub fn request_url(
        &self,
        endpoint: Endpoint,
        gacha_type: u32,
        page: u32,
        end_id: &str,
        size: u32,
    ) -> String {
        let full = self.is_full_history();
        let gacha_type = gacha_type.to_string();
        let page_s = page.to_string();
        let size = size.to_string();
        let mut out = String::with_capacity(self.raw.len() + 32);
        if full {
            out.push_str(self.full_history_endpoint());
        } else {
            out.push_str(self.endpoint_url(endpoint));
        }
        let mut first = true;
        let mut sep = |out: &mut String| {
            out.push(if first { '?' } else { '&' });
            first = false;
        };
        let mut wrote_gacha_type = false;
        let mut wrote_end_id = false;
        let mut wrote_size = false;
        let mut wrote_page = false;
        for (k, v) in &self.query {
            let (k, v): (&str, &str) = match k.as_str() {
                "page" => {
                    if full {
                        wrote_page = true;
                        (k.as_str(), page_s.as_str())
                    } else {
                        continue;
                    }
                }
                "gacha_type" => {
                    wrote_gacha_type = true;
                    (k, gacha_type.as_str())
                }
                "end_id" => {
                    wrote_end_id = true;
                    (k, end_id)
                }
                "size" => {
                    wrote_size = true;
                    (k, size.as_str())
                }
                _ => (k.as_str(), v.as_str()),
            };
            sep(&mut out);
            out.push_str(k);
            out.push('=');
            out.push_str(v);
        }
        if !wrote_gacha_type {
            sep(&mut out);
            out.push_str("gacha_type=");
            out.push_str(&gacha_type);
        }
        if !wrote_end_id {
            sep(&mut out);
            out.push_str("end_id=");
            out.push_str(end_id);
        }
        if !wrote_size {
            sep(&mut out);
            out.push_str("size=");
            out.push_str(&size);
        }
        if full && !wrote_page {
            sep(&mut out);
            out.push_str("page=");
            out.push_str(&page_s);
        }
        out
    }
}

fn webcaches_dir(game_dir: &Path) -> PathBuf {
    game_dir.join("StarRail_Data").join("webCaches")
}

fn latest_cache_data(webcaches: &Path) -> Option<PathBuf> {
    let mut best: Option<(Vec<u16>, PathBuf)> = None;
    for entry in std::fs::read_dir(webcaches).ok()?.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let Some(ver) = parse_version(&name) else {
            continue;
        };
        if best.as_ref().is_none_or(|(b, _)| ver > *b) {
            best = Some((ver, path));
        }
    }
    let (_, dir) = best?;
    Some(dir.join("Cache").join("Cache_Data"))
}

fn parse_version(s: &str) -> Option<Vec<u16>> {
    let parts: Vec<u16> = s
        .split('.')
        .map(str::parse::<u16>)
        .collect::<Result<_, _>>()
        .ok()?;
    if (3..=4).contains(&parts.len()) {
        Some(parts)
    } else {
        None
    }
}

pub fn find_gacha_urls(game_dir: &Path) -> Result<Vec<GachaUrl>, String> {
    let webcaches = webcaches_dir(game_dir);
    if !webcaches.is_dir() {
        return Err(format!(
            "webCaches not found: {} — launch the game and open the Warp history at least once.",
            webcaches.display()
        ));
    }
    let cache_data = latest_cache_data(&webcaches)
        .ok_or_else(|| "No valid webCaches version directory found.".to_string())?;

    let collector = KeyCollector::long_key_only(&cache_data)
        .map_err(|e| format!("Failed to open disk cache ({}): {e}", cache_data.display()))?;

    let mut dirty: Vec<(u64, String)> = collector
        .collect(|key| {
            let data: &str = &key.data;
            let url = match data.find("http") {
                Some(n) => &data[n..],
                None => data,
            };
            if is_gacha_url(url) {
                Some((key.timestamp, url.to_owned()))
            } else {
                None
            }
        })
        .map_err(|e| format!("Failed to read disk cache: {e}"))?;

    dirty.sort_by_key(|b| std::cmp::Reverse(b.0));

    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for (ts, value) in dirty {
        if !seen.insert(value.clone()) {
            continue;
        }
        if let Some(mut url) = parse_gacha_url(&value) {
            url.creation_time = ts;
            out.push(url);
        }
    }
    Ok(out)
}

pub fn is_fresh(creation_time: u64) -> bool {
    if creation_time == 0 {
        return false;
    }
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    now.saturating_sub(creation_time) <= 24 * 60 * 60
}

fn is_gacha_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("https://")
        && (lower.contains("mihoyo.com") || lower.contains("hoyoverse.com"))
        && lower.contains("authkey=")
        && lower.contains('?')
}

fn parse_gacha_url(raw: &str) -> Option<GachaUrl> {
    let q = raw.find('?')?;
    let base = raw[..q].to_string();
    let query_str = &raw[q + 1..];

    let mut query: Vec<(String, String)> = Vec::new();
    for pair in query_str.split('&') {
        if pair.is_empty() {
            continue;
        }
        let (k, v) = match pair.split_once('=') {
            Some((k, v)) => (k.to_string(), v.to_string()),
            None => (pair.to_string(), String::new()),
        };
        query.push((k, v));
    }

    let get = |name: &str| {
        query
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.as_str())
            .filter(|v| !v.is_empty())
    };

    for required in [
        "authkey",
        "sign_type",
        "authkey_ver",
        "game_biz",
        "region",
        "lang",
    ] {
        get(required)?;
    }

    let game_biz = get("game_biz").unwrap_or_default().to_ascii_lowercase();
    let server = if game_biz.contains("global") {
        Server::Oversea
    } else if game_biz.contains("cn") {
        Server::Official
    } else if raw.to_ascii_lowercase().contains("hoyoverse.com") {
        Server::Oversea
    } else {
        Server::Official
    };

    Some(GachaUrl {
        raw: raw.to_string(),
        base,
        server,
        creation_time: 0,
        query,
    })
}
