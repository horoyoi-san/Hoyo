use gpui::App;

use crate::config_store::{AppConfig, CheatValueEntry};

use super::ConfigPage;

impl ConfigPage {
    pub(crate) fn collect_current_config(&self, cx: &App) -> AppConfig {
        let filtered_message_names: Vec<String> = self
            .sniffer
            .upgrade()
            .map(|entity| entity.read(cx).filtered_names().into_iter().collect())
            .unwrap_or_default();

        let hooked_message_names: Vec<String> = self
            .sniffer
            .upgrade()
            .map(|entity| entity.read(cx).hooked_names().into_iter().collect())
            .unwrap_or_default();

        let enabled_cheats: Vec<String> = crate::cheat::get_modules()
            .into_iter()
            .filter(|module| crate::cheat::is_enabled(module.id))
            .map(|module| module.id.to_string())
            .collect();

        let keybinds = crate::cheat::all_keybinds();

        let cheat_values: Vec<CheatValueEntry> = crate::cheat::get_modules()
            .into_iter()
            .flat_map(|module| {
                let module_id = module.id.to_string();
                module
                    .fields
                    .iter()
                    .filter(|field| !matches!(field.ty, crate::cheat::model::CheatFieldType::KeyBind { .. }))
                    .filter_map(move |field| {
                        crate::cheat::config_value(module_id.as_str(), field.key).map(|value| {
                            CheatValueEntry {
                                module_id: module_id.clone(),
                                key: field.key.to_string(),
                                value,
                            }
                        })
                    })
                    .collect::<Vec<_>>()
            })
            .collect();

        AppConfig::new(
            filtered_message_names,
            hooked_message_names,
            enabled_cheats,
            keybinds,
            cheat_values,
            self.dumper_enabled,
        )
    }
}
