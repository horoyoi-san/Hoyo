use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;

use serde::Deserialize;

use crate::url::{Endpoint, GachaUrl};

pub(crate) const BANNERS: &[(u32, Endpoint)] = &[
    (1, Endpoint::Standard),
    (11, Endpoint::Standard),
    (12, Endpoint::Standard),
    (2, Endpoint::Standard),
    (21, Endpoint::Collaboration),
    (22, Endpoint::Collaboration),
];

const PAGE_SIZE: u32 = 20;
const NET_RETRIES: u32 = 15;
const CONCURRENCY: usize = 3;

#[derive(Clone, Debug, Default, Deserialize)]
pub struct Record {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub uid: String,
    #[serde(default)]
    pub gacha_id: String,
    #[serde(default)]
    pub gacha_type: String,
    #[serde(default)]
    pub item_id: String,
    #[serde(default)]
    pub count: String,
    #[serde(default)]
    pub time: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub lang: String,
    #[serde(default)]
    pub item_type: String,
    #[serde(default)]
    pub rank_type: String,
}

#[derive(Deserialize)]
struct ApiResponse {
    retcode: i32,
    #[serde(default)]
    message: String,
    #[serde(default)]
    data: Option<ApiData>,
}

#[derive(Deserialize)]
struct ApiData {
    #[serde(default)]
    list: Vec<Record>,
}

#[derive(Debug)]
pub enum FetchError {
    Authkey,
    Network(String),
    Api { retcode: i32, message: String },
}

impl std::fmt::Display for FetchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FetchError::Authkey => write!(f, "authkey expired (re-open Warp history in-game)"),
            FetchError::Network(e) => write!(f, "network: {e}"),
            FetchError::Api { retcode, message } => write!(f, "API {retcode}: {message}"),
        }
    }
}

pub(crate) fn build_agent() -> ureq::Agent {
    let cfg = ureq::Agent::config_builder()
        .proxy(None)
        .user_agent("astralos-gacha/0.1")
        .timeout_global(Some(Duration::from_secs(20)))
        .timeout_connect(Some(Duration::from_secs(10)))
        .max_idle_connections(64)
        .max_idle_connections_per_host(16)
        .build();
    ureq::Agent::new_with_config(cfg)
}

fn request_raw(agent: &ureq::Agent, url: &str) -> Result<ApiResponse, FetchError> {
    let body = agent
        .get(url)
        .call()
        .map_err(|e| match e {
            ureq::Error::Timeout(_) => FetchError::Network("timeout".into()),
            other => FetchError::Network(other.to_string()),
        })?
        .into_body()
        .read_to_string()
        .map_err(|e| FetchError::Network(e.to_string()))?;

    serde_json::from_str(&body).map_err(|e| FetchError::Network(format!("bad JSON: {e}")))
}

fn request_retry(agent: &ureq::Agent, url: &str) -> Result<ApiResponse, FetchError> {
    let mut net_delay = Duration::from_millis(50);

    for attempt in 0..NET_RETRIES {
        match request_raw(agent, url) {
            Ok(resp) => {
                if resp.retcode == -110 || resp.message.contains("frequently") {
                    let wait =
                        Duration::from_millis((100 * attempt.saturating_add(1) as u64).min(6_000));
                    thread::sleep(wait);
                    continue;
                }
                if resp.retcode == -101
                    || resp.message.contains("authkey")
                    || resp.message.contains("auth key")
                {
                    return Err(FetchError::Authkey);
                }
                if resp.retcode != 0 {
                    return Err(FetchError::Api {
                        retcode: resp.retcode,
                        message: resp.message,
                    });
                }
                return Ok(resp);
            }
            Err(FetchError::Network(_)) if attempt + 1 < NET_RETRIES => {
                thread::sleep(net_delay);
                net_delay = (net_delay * 2).min(Duration::from_secs(5));
            }
            Err(FetchError::Network(_)) => {
                return Err(FetchError::Network("max retries exceeded".into()));
            }
            Err(e) => return Err(e),
        }
    }

    Err(FetchError::Network("max retries exceeded".into()))
}

pub(crate) fn probe(agent: &ureq::Agent, url: &GachaUrl) -> Result<(), FetchError> {
    let gt = url.cached_gacha_type().unwrap_or(1);
    let req = url.request_url(Endpoint::Standard, gt, 1, "0", 1);
    request_retry(agent, &req).map(|_| ())
}

fn fetch_one(
    agent: &ureq::Agent,
    url: &GachaUrl,
    endpoint: Endpoint,
    gacha_type: u32,
) -> Result<Vec<Record>, FetchError> {
    let mut out = Vec::new();
    let mut end_id = "0".to_string();

    for page in 1.. {
        if page > 1 {
            thread::sleep(Duration::from_millis(150));
        }
        let req = url.request_url(endpoint, gacha_type, page, &end_id, PAGE_SIZE);
        let resp = match request_retry(agent, &req) {
            Ok(r) => r,
            Err(e) if out.is_empty() => return Err(e),
            Err(_) => break,
        };
        let list = resp.data.map(|d| d.list).unwrap_or_default();
        if list.is_empty() {
            break;
        }
        end_id = list.last().map(|r| r.id.clone()).unwrap_or_default();
        out.extend(list);
    }

    Ok(out)
}

pub fn fetch_all(
    agent: &ureq::Agent,
    banners: &[(u32, Endpoint, GachaUrl)],
    progress: Option<&crate::Progress>,
) -> Result<Vec<Record>, FetchError> {
    if let Some(p) = progress {
        p.banners_total.store(banners.len(), Ordering::Relaxed);
    }

    let mut results: Vec<(u32, Result<Vec<Record>, FetchError>)> =
        Vec::with_capacity(banners.len());

    for chunk in banners.chunks(CONCURRENCY) {
        let chunk_out: Vec<_> = thread::scope(|s| {
            chunk
                .iter()
                .map(|(gt, ep, url)| {
                    s.spawn(move || {
                        let result = fetch_one(agent, url, *ep, *gt);
                        if let Some(p) = progress {
                            p.banners_done.fetch_add(1, Ordering::Relaxed);
                            if let Ok(recs) = &result {
                                p.records.fetch_add(recs.len(), Ordering::Relaxed);
                            }
                        }
                        (*gt, result)
                    })
                })
                .collect::<Vec<_>>()
                .into_iter()
                .map(|h| {
                    h.join()
                        .unwrap_or((0, Err(FetchError::Network("thread panic".into()))))
                })
                .collect()
        });
        results.extend(chunk_out);
    }

    if results
        .iter()
        .all(|(_, r)| matches!(r, Err(FetchError::Authkey)))
    {
        return Err(FetchError::Authkey);
    }

    let mut records = Vec::new();
    let mut first_err = None;
    for (_, result) in results {
        match result {
            Ok(mut recs) => records.append(&mut recs),
            Err(e) => {
                let _ = first_err.get_or_insert(e);
            }
        }
    }

    if records.is_empty()
        && let Some(e) = first_err
    {
        return Err(e);
    }
    Ok(records)
}
