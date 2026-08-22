use super::{CheatConfigField, CheatFieldType, CheatModule};

pub const MODULE_ID: &str = "hkrpg.hide_ui";
pub const TOGGLE_KEY: &str = "toggle";

pub fn module() -> CheatModule {
    CheatModule {
        id: MODULE_ID,
        name: "HideUI",
        description: "Hide game UI",
        enabled: false,
        message_names: vec![],
        handler: None,
        fields: vec![CheatConfigField {
            key: TOGGLE_KEY,
            label: "Toggle Key",
            ty: CheatFieldType::KeyBind { default: 328 }, // Mouse5 (Mouse3)
        }],
        actions: vec![],
    }
}
