mod analyze;
mod diskcache;
mod fetch;
mod icons;
mod probability;
mod types;
mod url;

use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};

pub use fetch::{FetchError, Record};
pub use icons::fetch_icon_bytes;
pub use probability::{PullOdds, pity_odds};
pub use types::{Category, CategoryReport, Pull, Report, Tags};
pub use url::{Endpoint, GachaUrl, Server};

#[derive(Default)]
pub struct Progress {
    pub phase: AtomicUsize,
    pub banners_done: AtomicUsize,
    pub banners_total: AtomicUsize,
    pub records: AtomicUsize,
    pub icons_done: AtomicUsize,
    pub icons_total: AtomicUsize,
}

#[derive(Clone, Copy, Default)]
pub struct ProgressSnapshot {
    pub phase: usize,
    pub banners_done: usize,
    pub banners_total: usize,
    pub records: usize,
    pub icons_done: usize,
    pub icons_total: usize,
}

impl Progress {
    pub fn new() -> Self {
        Self::default()
    }

    fn set_phase(&self, p: usize) {
        self.phase.store(p, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> ProgressSnapshot {
        ProgressSnapshot {
            phase: self.phase.load(Ordering::Relaxed),
            banners_done: self.banners_done.load(Ordering::Relaxed),
            banners_total: self.banners_total.load(Ordering::Relaxed),
            records: self.records.load(Ordering::Relaxed),
            icons_done: self.icons_done.load(Ordering::Relaxed),
            icons_total: self.icons_total.load(Ordering::Relaxed),
        }
    }
}

pub struct GachaData {
    pub url: GachaUrl,
    pub records: Vec<Record>,
    pub report: Report,
}

pub fn find_link(game_dir: &Path) -> Result<GachaUrl, String> {
    url::find_gacha_urls(game_dir)?
        .into_iter()
        .next()
        .ok_or_else(|| {
            "No Warp link found. Open the in-game Warp history once, then retry.".to_string()
        })
}

pub fn fetch_and_analyze(game_dir: &Path) -> Result<GachaData, String> {
    fetch_and_analyze_with_progress(game_dir, &Progress::new())
}

pub fn fetch_and_analyze_with_progress(
    game_dir: &Path,
    progress: &Progress,
) -> Result<GachaData, String> {
    progress.set_phase(1);
    let candidates = url::find_gacha_urls(game_dir)?;
    assert!(
        !candidates.is_empty(),
        "No Warp link found. Open the in-game Warp history once, then retry."
    );

    let agent = fetch::build_agent();

    let mut live: Option<GachaUrl> = None;
    let mut last_err = "authkey expired".to_string();
    for cand in &candidates {
        match fetch::probe(&agent, cand) {
            Ok(()) => {
                live = Some(cand.clone());
                break;
            }
            Err(FetchError::Authkey) => last_err = "authkey expired".to_string(),
            Err(e) => last_err = e.to_string(),
        }
    }
    let live = live.ok_or_else(|| {
        format!("No usable Warp link. Last error: {last_err}. Re-open Warp history and retry.")
    })?;

    let standard_url = candidates
        .iter()
        .find(|u| !u.is_full_history())
        .cloned()
        .unwrap_or_else(|| live.clone());
    let collab_url = standard_url.short_history();

    let mut full_map: HashMap<u32, GachaUrl> = HashMap::new();
    for cand in &candidates {
        if cand.is_full_history()
            && let Some(gt) = cand.cached_gacha_type()
        {
            full_map.entry(gt).or_insert_with(|| cand.clone());
        }
    }

    let banners: Vec<_> = fetch::BANNERS
        .iter()
        .map(|(gt, ep)| {
            let url = match ep {
                Endpoint::Collaboration => collab_url.clone(),
                Endpoint::Standard => full_map
                    .get(gt)
                    .cloned()
                    .unwrap_or_else(|| standard_url.clone()),
            };
            (*gt, *ep, url)
        })
        .collect();

    progress.set_phase(2);
    let records = fetch::fetch_all(&agent, &banners, Some(progress)).map_err(|e| e.to_string())?;
    let report = analyze::analyze(&records);

    Ok(GachaData {
        url: live,
        records,
        report,
    })
}
