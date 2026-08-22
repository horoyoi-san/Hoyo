#![allow(dead_code)]
pub mod censorship;
pub mod hide_ui;
pub mod hud;
pub mod loading_scene;
pub mod notification;
pub mod speed;
pub mod uid;
pub mod uid_import;
pub mod unlock_fps;

pub type CheatHandler = fn(cmd_name: &str, body_json: &mut serde_json::Value) -> bool;
pub type CheatActionHandler = fn(&CheatActionContext) -> Vec<CheatPacketRequest>;

#[derive(Clone)]
pub struct CheatActionContext {
    pub module_id: &'static str,
    pub config: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct CheatPacketRequest {
    pub message_name: &'static str,
    pub body_json: serde_json::Value,
    pub source: hsr_ipc::PacketSource,
}

#[derive(Clone)]
pub struct CheatModule {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub enabled: bool,
    pub message_names: Vec<&'static str>,
    pub handler: Option<CheatHandler>,
    pub fields: Vec<CheatConfigField>,
    pub actions: Vec<CheatAction>,
}

#[derive(Debug, Clone)]
pub struct CheatConfigField {
    pub key: &'static str,
    pub label: &'static str,
    pub ty: CheatFieldType,
}

#[derive(Debug, Clone)]
pub enum CheatFieldType {
    Boolean {
        default: bool,
    },
    Number {
        default: i64,
    },
    Slider {
        default: f64,
        min: f64,
        max: f64,
        step: f64,
    },
    KeyBind {
        default: i32,
    },
    Select {
        default: i64,
        options: Vec<(&'static str, i64)>,
    },
    Text {
        default: &'static str,
    },
}

#[derive(Debug, Clone)]
pub struct CheatAction {
    pub id: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub handler: Option<CheatActionHandler>,
}
