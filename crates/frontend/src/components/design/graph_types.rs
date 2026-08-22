use gpui::*;

pub(crate) const NODE_W: f32 = 234.0;
pub(crate) const COL_GAP: f32 = 92.0;
pub(crate) const ROW_GAP: f32 = 22.0;
pub(crate) const HEADER_H: f32 = 28.0;
pub(crate) const FIELD_H: f32 = 16.0;
pub(crate) const BODY_PAD: f32 = 10.0;
pub(crate) const MAX_FIELDS: usize = 6;
pub(crate) const MAX_FLOW_NODES: usize = 320;
pub(crate) const MAX_GENERIC_NODES: usize = 64;
pub(crate) const ZOOM_MIN: f32 = 0.4;
pub(crate) const ZOOM_MAX: f32 = 2.0;
pub(crate) const CULL_W: f32 = 2600.0;
pub(crate) const CULL_H: f32 = 1600.0;
pub(crate) const CULL_MARGIN: f32 = 240.0;
pub(crate) const EDITOR_W: f32 = 460.0;
pub(crate) const EDITOR_H: f32 = 360.0;
pub(crate) const EDITOR_HEADER: f32 = 30.0;

pub(crate) type GroupList<'a> = Vec<(String, Vec<(String, &'a serde_json::Value, String)>)>;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum NodeCat {
    Container,
    Action,
    Predicate,
}

impl NodeCat {
    pub(crate) fn tag(self) -> &'static str {
        match self {
            NodeCat::Container => "GROUP",
            NodeCat::Action => "TASK",
            NodeCat::Predicate => "BRANCH",
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum WireCat {
    Sequence,
    Branch,
    Success,
    Failed,
    Reference,
}

pub(crate) struct GraphNode {
    pub(crate) title: String,
    pub(crate) subtitle: String,
    pub(crate) cat: NodeCat,
    pub(crate) fields: Vec<(String, String)>,
    pub(crate) path: String,
    pub(crate) owner: usize,
    pub(crate) world: Point<f32>,
    pub(crate) h: f32,
}

pub(crate) struct Edge {
    pub(crate) from: usize,
    pub(crate) to: usize,
    pub(crate) cat: WireCat,
}

pub(crate) struct GraphState {
    pub(crate) pan: Point<f32>,
    pub(crate) zoom: f32,
    pub(crate) panning: bool,
    pub(crate) last: Point<f32>,
    pub(crate) source: Option<usize>,
    pub(crate) nodes: Vec<GraphNode>,
    pub(crate) edges: Vec<Edge>,
    pub(crate) doc: Option<serde_json::Value>,
    pub(crate) flow: bool,
    pub(crate) truncated: bool,
    pub(crate) error: Option<String>,
}

impl Default for GraphState {
    fn default() -> Self {
        Self {
            pan: point(40.0, 48.0),
            zoom: 1.0,
            panning: false,
            last: point(0.0, 0.0),
            source: None,
            nodes: Vec::new(),
            edges: Vec::new(),
            doc: None,
            flow: false,
            truncated: false,
            error: None,
        }
    }
}
