use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheatCommand {
    SetEnabled {
        name: String,
        enabled: bool,
    },
    SetValue {
        name: String,
        key: String,
        value: f64,
    },
    SetKeyBind {
        name: String,
        key: String,
        key_code: i32,
    },
    RunAction {
        name: String,
        action: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheatEvent {
    Status {
        name: String,
        enabled: bool,
    },
    Value {
        name: String,
        key: String,
        value: f64,
    },
    KeyBind {
        name: String,
        key: String,
        key_code: i32,
    },
    KeyTriggered {
        name: String,
        key: String,
    },
    Action {
        name: String,
        action: String,
    },
}
