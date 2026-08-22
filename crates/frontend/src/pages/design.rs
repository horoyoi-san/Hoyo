pub(crate) mod tree;

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use gpui::*;
use gpui_component::{
    input::{InputEvent, InputState},
    v_flex,
};

use crate::components::design::GraphState;
use tree::{Row, TreeNode};

pub(crate) struct ConfigEntry {
    pub(crate) rel: String,
    pub(crate) abs: PathBuf,
    pub(crate) is_lua: bool,
}

pub(crate) struct OpenEditor {
    pub(crate) path: String,
    pub(crate) title: String,
    pub(crate) pos: Point<f32>,
    pub(crate) editor: Entity<InputState>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum ViewMode {
    Json,
    Graph,
}

impl ViewMode {
    pub(crate) fn label(self) -> &'static str {
        match self {
            ViewMode::Json => "JSON",
            ViewMode::Graph => "Graph",
        }
    }
}

pub struct DesignPage {
    pub(crate) root: Option<PathBuf>,
    pub(crate) source_label: String,

    pub(crate) entries: Vec<ConfigEntry>,
    pub(crate) tree: TreeNode,
    pub(crate) expanded: HashSet<String>,
    pub(crate) search_active: bool,
    pub(crate) visible: Vec<Row>,

    pub(crate) search_input: Entity<InputState>,
    pub(crate) json_editor: Entity<InputState>,

    pub(crate) lua_editor: Entity<InputState>,
    pub(crate) open_editors: Vec<OpenEditor>,
    pub(crate) editors_file: Option<usize>,
    pub(crate) editor_drag: Option<usize>,
    pub(crate) editor_drag_last: Point<f32>,
    pub(crate) selected: Option<usize>,
    pub(crate) open: Vec<usize>,
    pub(crate) buffers: HashMap<usize, String>,
    pub(crate) original: HashMap<usize, String>,
    pub(crate) dirty: HashSet<usize>,
    pub(crate) scroll: UniformListScrollHandle,

    pub(crate) view_mode: ViewMode,
    pub(crate) graph: GraphState,
    pub(crate) fullscreen: bool,

    pub(crate) status: String,
    pub(crate) busy: bool,

    #[allow(dead_code)]
    pub(crate) search_sub: Subscription,
    #[allow(dead_code)]
    pub(crate) editor_sub: Subscription,
}

impl DesignPage {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let search_input = cx.new(|cx| InputState::new(window, cx).placeholder("Filter..."));
        let json_editor = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("json")
                .multi_line(true)
                .soft_wrap(false)
                .scroll_beyond_last_line(Some(0))
        });
        let lua_editor = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("lua")
                .multi_line(true)
                .soft_wrap(false)
                .scroll_beyond_last_line(Some(0))
        });
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

        let editor_sub = cx.subscribe_in(
            &json_editor,
            window,
            |this, _editor, ev: &InputEvent, _w, cx| {
                if matches!(ev, InputEvent::Change) {
                    this.on_editor_change(cx);
                }
            },
        );

        Self {
            root: None,
            source_label: "No folder loaded".into(),
            entries: Vec::new(),
            tree: TreeNode::default(),
            expanded: HashSet::new(),
            search_active: false,
            visible: Vec::new(),
            search_input,
            json_editor,
            lua_editor,
            open_editors: Vec::new(),
            editors_file: None,
            editor_drag: None,
            editor_drag_last: point(0.0, 0.0),
            selected: None,
            open: Vec::new(),
            buffers: HashMap::new(),
            original: HashMap::new(),
            dirty: HashSet::new(),
            scroll: UniformListScrollHandle::new(),
            view_mode: ViewMode::Json,
            graph: GraphState::default(),
            fullscreen: false,
            status: "Click Parse to parse the game design data (run Dumper -> Data first to generate data.json)."
                .into(),
            busy: false,
            search_sub,
            editor_sub,
        }
    }
}

impl Render for DesignPage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        if self.fullscreen {
            return self.fullscreen_view(cx).into_any_element();
        }
        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .child(crate::ui::page_header(
                "Design",
                "Config Parser & Editor",
                cx,
            ))
            .child(self.command_bar(cx))
            .child(
                gpui_component::h_flex()
                    .flex_1()
                    .min_h_0()
                    .gap_3()
                    .child(self.explorer_panel(cx))
                    .child(self.inspector(cx)),
            )
            .child(self.status_bar(cx))
            .into_any_element()
    }
}
