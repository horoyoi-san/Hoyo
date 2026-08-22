use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};

use gpui::{Entity, RenderImage};
use gpui_component::input::InputState;

use super::calc::AvatarPanel;
use super::resources::ResourceDb;
use super::schema::DisplayAvatar;

pub(crate) struct PlayerSummary {
    pub(crate) nickname: String,
    pub(crate) uid: u64,
    pub(crate) level: u32,
    pub(crate) world_level: u32,
    pub(crate) signature: String,
    pub(crate) friend_count: u32,
    pub(crate) birthday: Option<u32>,
    pub(crate) achievement_count: u32,
    pub(crate) avatar_count: u32,
    pub(crate) lightcone_count: u32,
    pub(crate) su_count: u32,
}

pub(crate) struct AvatarEntry {
    pub(crate) panel: AvatarPanel,
    pub(crate) assist: bool,
}

#[derive(Default)]
pub(crate) struct PanelStash {
    pub(crate) player: Option<PlayerSummary>,
    pub(crate) raw: Vec<(bool, DisplayAvatar)>,
    pub(crate) entries: Vec<AvatarEntry>,
    pub(crate) selected: usize,
}

pub struct UidPage {
    pub(crate) db: Option<Arc<ResourceDb>>,
    pub(crate) language: &'static str,
    pub(crate) busy: bool,
    pub(crate) status: Option<String>,
    pub(crate) progress: Arc<Mutex<String>>,
    pub(crate) player: Option<PlayerSummary>,
    pub(crate) raw: Vec<(bool, DisplayAvatar)>,
    pub(crate) entries: Vec<AvatarEntry>,
    pub(crate) selected: usize,
    pub(crate) icons: HashMap<String, Arc<RenderImage>>,
    pub(crate) icons_requested: HashSet<String>,
    pub(crate) pending_icons: RefCell<Vec<(String, u32)>>,
    pub(crate) uid_input: Entity<InputState>,
    pub(crate) awaiting_response: bool,
    pub(crate) awaiting_uid: Option<u32>,
    pub(crate) await_ticks: u32,
    pub(crate) own_mode: bool,
    pub(crate) own_built_version: u64,
    pub(crate) stash: PanelStash,
}
