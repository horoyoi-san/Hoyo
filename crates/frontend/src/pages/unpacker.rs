mod actions;
mod model;
mod runtime;
mod tree;
mod view;
mod workers;

use std::collections::{HashMap, HashSet, VecDeque};
use std::path::PathBuf;
use std::sync::mpsc::{Receiver, Sender, channel};
use std::sync::{Arc, Mutex};

use gpui::{actions, *};
use gpui_component::{
    ActiveTheme as _, h_flex,
    input::{InputEvent, InputState},
    v_flex,
};
use unpacker::AssetEntry;

use model::{PreviewReq, ThumbReq, UnpackMsg};
use tree::{Row, TreeNode};

actions!(hsr_unpacker, [CopyImage]);

const KEEP_FILTER: &str = "SpriteOutput";
const INDENT: f32 = 14.0;
const ROW_H: f32 = 24.0;
const THUMB_SLOT: f32 = 20.0;
const THUMB_CAP: usize = 512;

pub struct UnpackerPage {
    roots: Vec<PathBuf>,
    source_label: String,

    assets: Vec<AssetEntry>,
    tree: TreeNode,
    expanded: HashSet<String>,
    search_active: bool,
    visible: Vec<Row>,

    search_input: Entity<InputState>,
    selected: Option<usize>,
    scroll: UniformListScrollHandle,

    preview: Option<Arc<RenderImage>>,
    preview_error: Option<String>,
    preview_rgba: Option<Arc<image::RgbaImage>>,

    thumbs: HashMap<i64, Option<Arc<RenderImage>>>,
    thumb_order: VecDeque<i64>,
    thumb_tx: Sender<ThumbReq>,
    thumb_requested: Arc<Mutex<HashSet<i64>>>,
    pending_drops: Vec<Arc<RenderImage>>,

    status: String,
    busy: bool,

    tx: Sender<UnpackMsg>,
    rx: Option<Receiver<UnpackMsg>>,
    preview_tx: Sender<PreviewReq>,
    #[allow(dead_code)]
    search_sub: Subscription,
    pump: Option<Task<()>>,
}

impl UnpackerPage {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let search_input = cx.new(|cx| InputState::new(window, cx).placeholder("Filter…"));
        let search_sub = cx.subscribe_in(
            &search_input,
            window,
            |this, _input, ev: &InputEvent, _w, cx| {
                if matches!(ev, InputEvent::Change) {
                    this.rebuild_tree(cx);
                    cx.notify();
                }
            },
        );

        let (tx, rx) = channel();
        let (thumb_tx, thumb_rx) = channel::<ThumbReq>();
        workers::spawn_thumb_worker(thumb_rx, tx.clone());
        let (preview_tx, preview_rx) = channel::<PreviewReq>();
        workers::spawn_preview_worker(preview_rx, tx.clone());

        let mut initial_roots = Vec::new();
        let mut initial_source = "No folder loaded".to_string();
        let mut initial_status = "Click Load and pick your StreamingAssets\\Asb\\Windows folder.".to_string();

        if let Some(game_dir) = crate::game_manager::get_game_dir() {
            let asb = game_dir
                .join("StarRail_Data")
                .join("StreamingAssets")
                .join("Asb")
                .join("Windows");
            if asb.exists() {
                initial_source = asb.display().to_string();
                initial_status = format!("Detected game assets: {}", asb.display());
                initial_roots.push(asb);
            }
        }

        let mut page = Self {
            roots: initial_roots,
            source_label: initial_source,
            assets: Vec::new(),
            tree: TreeNode::default(),
            expanded: HashSet::new(),
            search_active: false,
            visible: Vec::new(),
            search_input,
            selected: None,
            scroll: UniformListScrollHandle::new(),
            preview: None,
            preview_error: None,
            preview_rgba: None,
            thumbs: HashMap::new(),
            thumb_order: VecDeque::new(),
            thumb_tx,
            thumb_requested: Arc::new(Mutex::new(HashSet::new())),
            pending_drops: Vec::new(),
            status: initial_status,
            busy: false,
            tx,
            rx: Some(rx),
            preview_tx,
            search_sub,
            pump: None,
        };
        page.start_pump(cx);
        page
    }
}

impl Render for UnpackerPage {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        for tile in self.pending_drops.drain(..) {
            let _ = window.drop_image(tile);
        }

        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .on_action(cx.listener(|this, _: &CopyImage, _window, cx| this.copy_preview(cx)))
            .child(crate::ui::page_header("Unpacker", "Assets Unpacker", cx))
            .child(self.toolbar(cx))
            .child(
                h_flex()
                    .flex_1()
                    .min_h_0()
                    .gap_3()
                    .child(self.tree_panel(cx))
                    .child(self.preview_pane(cx)),
            )
            .child(
                div()
                    .text_sm()
                    .text_color(cx.theme().muted_foreground)
                    .child(self.status.clone()),
            )
    }
}
