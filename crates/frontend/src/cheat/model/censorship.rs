use super::CheatModule;

pub const MODULE_ID: &str = "hkrpg.censorship";

pub fn module() -> CheatModule {
    CheatModule {
        id: MODULE_ID,
        name: "Censorship",
        description: "Goon",
        enabled: true,
        message_names: vec![],
        handler: None,
        fields: vec![],
        actions: vec![],
    }
}
