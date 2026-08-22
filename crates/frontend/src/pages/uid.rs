#[allow(dead_code)]
mod loader;
mod own;
mod page_types;
#[allow(dead_code)]
pub mod recommend;
#[allow(dead_code)]
pub mod resources;
#[allow(dead_code)]
mod types;

use gpui::*;
use gpui_component::input::InputState;
use smol::Timer;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

pub mod calc;
pub use page_types::UidPage;
pub(crate) use page_types::{AvatarEntry, PanelStash, PlayerSummary};
pub use types::schema;

type SendDetailFn = fn(u32) -> Result<(), String>;
static SEND_DETAIL: OnceLock<SendDetailFn> = OnceLock::new();
static DETAIL_INBOX: Mutex<Vec<String>> = Mutex::new(Vec::new());
static OWN_AVATAR: Mutex<Option<String>> = Mutex::new(None);
static OWN_BAG: Mutex<Option<String>> = Mutex::new(None);
static OWN_VERSION: AtomicU64 = AtomicU64::new(0);

pub fn install_transport(send: SendDetailFn) {
    let _ = SEND_DETAIL.set(send);
}

pub fn deliver_detail_json(json: String) {
    DETAIL_INBOX.lock().unwrap().push(json);
}

pub(crate) fn transport_installed() -> bool {
    SEND_DETAIL.get().is_some()
}

fn drain_detail_json() -> Vec<String> {
    std::mem::take(&mut *DETAIL_INBOX.lock().unwrap())
}

fn json_uid(json: &str) -> Option<u64> {
    serde_json::from_str::<serde_json::Value>(json)
        .ok()?
        .get("detail_info")?
        .get("uid")?
        .as_u64()
}

pub fn deliver_avatar_json(json: String) {
    *OWN_AVATAR.lock().unwrap() = Some(json);
    OWN_VERSION.fetch_add(1, Ordering::Relaxed);
}

pub fn deliver_bag_json(json: String) {
    *OWN_BAG.lock().unwrap() = Some(json);
    OWN_VERSION.fetch_add(1, Ordering::Relaxed);
}

fn own_snapshot() -> Option<(String, String)> {
    let avatar = OWN_AVATAR.lock().unwrap();
    let bag = OWN_BAG.lock().unwrap();
    match (avatar.as_ref(), bag.as_ref()) {
        (Some(a), Some(b)) => Some((a.clone(), b.clone())),
        _ => None,
    }
}

impl UidPage {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let uid_input = cx.new(|cx| InputState::new(window, cx).placeholder("UID"));
        cx.spawn(async move |this, cx| {
            loop {
                Timer::after(Duration::from_millis(200)).await;
                let alive = this
                    .update(cx, page_types::UidPage::poll_detail_inbox)
                    .is_ok();
                if !alive {
                    break;
                }
            }
        })
        .detach();

        Self {
            db: None,
            language: "CN",
            busy: false,
            status: Some("Enter a UID and press Fetch.".into()),
            progress: Arc::new(Mutex::new(String::new())),
            player: None,
            raw: Vec::new(),
            entries: Vec::new(),
            selected: 0,
            icons: HashMap::new(),
            icons_requested: HashSet::new(),
            pending_icons: RefCell::new(Vec::new()),
            uid_input,
            awaiting_response: false,
            awaiting_uid: None,
            await_ticks: 0,
            own_mode: false,
            own_built_version: 0,
            stash: PanelStash::default(),
        }
    }

    fn poll_detail_inbox(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }

        if self.own_mode {
            let version = OWN_VERSION.load(Ordering::Relaxed);
            if version != self.own_built_version {
                self.refresh_own(cx);
            }
            return;
        }

        let pending = drain_detail_json();
        if self.awaiting_response
            && let Some(target) = self.awaiting_uid
            && let Some(json) = pending
                .into_iter()
                .rev()
                .find(|j| json_uid(j) == Some(target as u64))
        {
            self.awaiting_response = false;
            self.awaiting_uid = None;
            self.load_source(json, cx);
            return;
        }

        if self.awaiting_response {
            self.await_ticks += 1;
            if self.await_ticks >= 40 {
                self.awaiting_response = false;
                self.awaiting_uid = None;
                self.status = Some(
                    "No response. Make sure the game is running, injected, and the proto is loaded."
                        .into(),
                );
                cx.notify();
            }
        }
    }

    pub(crate) fn fetch_uid(&mut self, cx: &mut Context<Self>) {
        if self.busy || self.own_mode {
            return;
        }
        let Some(&send) = SEND_DETAIL.get() else {
            return;
        };
        let raw = self.uid_input.read(cx).value().trim().to_string();
        let Ok(uid) = raw.parse::<u32>() else {
            self.status = Some("Enter a numeric UID.".into());
            cx.notify();
            return;
        };
        match send(uid) {
            Ok(()) => {
                self.awaiting_response = true;
                self.awaiting_uid = Some(uid);
                self.await_ticks = 0;
                self.status = Some(format!("Requesting UID {uid}… waiting for response."));
            }
            Err(e) => self.status = Some(format!("Cannot fetch: {e}")),
        }
        cx.notify();
    }

    pub(crate) fn toggle_own(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        std::mem::swap(&mut self.player, &mut self.stash.player);
        std::mem::swap(&mut self.raw, &mut self.stash.raw);
        std::mem::swap(&mut self.entries, &mut self.stash.entries);
        std::mem::swap(&mut self.selected, &mut self.stash.selected);
        self.own_mode = !self.own_mode;
        self.awaiting_response = false;
        self.awaiting_uid = None;

        if self.own_mode {
            let version = OWN_VERSION.load(Ordering::Relaxed);
            if self.entries.is_empty() || version != self.own_built_version {
                self.refresh_own(cx);
                return;
            }
            self.status = None;
        } else if self.entries.is_empty() {
            self.status = Some("Enter a UID and press Fetch.".into());
        } else {
            self.status = None;
        }
        cx.notify();
    }

    fn refresh_own(&mut self, cx: &mut Context<Self>) {
        self.own_built_version = OWN_VERSION.load(Ordering::Relaxed);
        if let Some((avatar, bag)) = own_snapshot() {
            self.load_own(avatar, bag, cx);
        } else {
            self.entries.clear();
            self.status = Some("Waiting for game data — open the character screen in-game.".into());
            cx.notify();
        }
    }

    pub(crate) fn tr(&self, cn: &'static str, en: &'static str) -> &'static str {
        if self.language == "EN" { en } else { cn }
    }

    pub(crate) fn set_language(&mut self, language: &'static str, cx: &mut Context<Self>) {
        if self.busy || self.language == language {
            return;
        }
        self.language = language;
        if let Some(db) = self.db.clone() {
            self.entries = self
                .raw
                .iter()
                .filter_map(|(assist, avatar)| {
                    calc::build_panel(&db, language, avatar).map(|panel| AvatarEntry {
                        panel,
                        assist: *assist,
                    })
                })
                .collect();
            if self.selected >= self.entries.len() {
                self.selected = 0;
            }
        }
        cx.notify();
    }
}
