use gpui::*;
use serde_json::Value;

use crate::config_store;

use super::ConfigPage;

impl ConfigPage {
    pub(crate) fn save_current(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let name = self.new_name_input.read(cx).value().trim().to_string();
        if name.is_empty() {
            return;
        }

        let config = self.collect_current_config(cx);
        match config_store::save(&name, &config) {
            Ok(()) => {
                self.new_name_input
                    .update(cx, |state, cx| state.set_value("", window, cx));
                self.refresh_configs();
                cx.notify();
                log::info!("[Config] saved '{name}'");
            }
            Err(error) => {
                log::error!("[Config] failed to save '{name}': {error}");
            }
        }
    }

    pub(crate) fn load_config(&mut self, name: &str, window: &mut Window, cx: &mut Context<Self>) {
        match config_store::load(name) {
            Ok(config) => {
                log::debug!(
                    "[Config] loading '{}': filtered={}, hooked={}, cheats={}, keybinds={}",
                    name,
                    config.filtered_message_names.len(),
                    config.hooked_message_names.len(),
                    config.enabled_cheats.len(),
                    config.keybinds.len()
                );

                let filtered: std::collections::HashSet<String> =
                    config.filtered_message_names.iter().cloned().collect();

                let hooked: std::collections::HashSet<String> =
                    config.hooked_message_names.iter().cloned().collect();

                if let Err(error) = self.sniffer.update(cx, |page, cx| {
                    page.apply_config(&filtered, &hooked, cx);
                }) {
                    log::error!("[Config] failed to apply sniffer config: {error:#}");
                }

                let keybinds: Vec<(String, String, i32)> = config
                    .keybinds
                    .iter()
                    .map(|entry| (entry.module_id.clone(), entry.key.clone(), entry.key_code))
                    .collect();

                let cheat_values: Vec<(String, String, Value)> = config
                    .cheat_values
                    .iter()
                    .map(|entry| {
                        (
                            entry.module_id.clone(),
                            entry.key.clone(),
                            entry.value.clone(),
                        )
                    })
                    .collect();

                if let Err(error) = self.cheat.update(cx, |page, cx| {
                    page.apply_config(window, &config.enabled_cheats, keybinds, cheat_values, cx);
                }) {
                    log::error!("[Config] failed to apply cheat config: {error:#}");
                }

                self.dumper_enabled = config.dumper_enabled;
                crate::ipc::send(hsr_ipc::FrontendCommand::SetDumperEnabled {
                    enabled: self.dumper_enabled,
                });

                self.active_config = Some(name.to_string());
                self.last_saved = Some(config);
                let _ = config_store::set_last_loaded_name(Some(name));
                cx.notify();
                log::info!("[Config] loaded '{name}'");
            }
            Err(error) => {
                log::error!("[Config] failed to load '{name}': {error}");
            }
        }
    }

    pub(crate) fn unload_config(&mut self, name: &str, cx: &mut Context<Self>) {
        if self.active_config.as_deref() != Some(name) {
            return;
        }
        self.active_config = None;
        self.last_saved = None;
        let _ = config_store::set_last_loaded_name(None);
        cx.notify();
        log::info!("[Config] unloaded '{name}'");
    }

    pub(crate) fn delete_config(&mut self, name: &str, cx: &mut Context<Self>) {
        match config_store::delete(name) {
            Ok(()) => {
                if self.active_config.as_deref() == Some(name) {
                    self.active_config = None;
                    self.last_saved = None;
                }
                if config_store::last_loaded_name().as_deref() == Some(name) {
                    let _ = config_store::set_last_loaded_name(None);
                }
                self.refresh_configs();
                cx.notify();
                log::info!("[Config] deleted '{name}'");
            }
            Err(error) => {
                log::error!("[Config] failed to delete '{name}': {error}");
            }
        }
    }

    pub(crate) fn start_rename(&mut self, name: &str, window: &mut Window, cx: &mut Context<Self>) {
        self.renaming = Some(name.to_string());
        self.rename_input
            .update(cx, |state, cx| state.set_value(name, window, cx));
        cx.notify();
    }

    pub(crate) fn confirm_rename(&mut self, cx: &mut Context<Self>) {
        let Some(old_name) = self.renaming.take() else {
            return;
        };
        let new_name = self.rename_input.read(cx).value().trim().to_string();
        if new_name.is_empty() || new_name == old_name {
            cx.notify();
            return;
        }

        match config_store::rename(&old_name, &new_name) {
            Ok(()) => {
                if self.active_config.as_deref() == Some(&old_name) {
                    self.active_config = Some(new_name.clone());
                }
                self.refresh_configs();
                cx.notify();
                log::info!("[Config] renamed '{old_name}' -> '{new_name}'");
            }
            Err(error) => {
                log::error!(
                    "[Config] failed to rename '{old_name}' -> '{new_name}': {error}"
                );
            }
        }
    }

    pub(crate) fn cancel_rename(&mut self, cx: &mut Context<Self>) {
        self.renaming = None;
        cx.notify();
    }
}
