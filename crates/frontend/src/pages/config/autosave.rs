use std::time::Duration;

use gpui::*;

use crate::config_store;

use super::ConfigPage;

pub(super) fn spawn_auto_save_task(cx: &mut Context<ConfigPage>) {
    cx.spawn(async move |this, cx| {
        loop {
            smol::Timer::after(Duration::from_millis(300)).await;
            let still_alive = this
                .update(cx, |page, cx| {
                    page.try_auto_save(cx);
                })
                .is_ok();
            if !still_alive {
                break;
            }
        }
    })
    .detach();
}

impl ConfigPage {
    pub(crate) fn try_auto_save(&mut self, cx: &App) {
        let Some(name) = self.active_config.clone() else {
            return;
        };

        let mut config = self.collect_current_config(cx);
        if let Some(last) = &self.last_saved {
            if last.equivalent(&config) {
                return;
            }
            config.created_at = last.created_at;
        }

        match config_store::save(&name, &config) {
            Ok(()) => {
                self.last_saved = Some(config);
                log::debug!("[Config] auto-saved '{name}'");
            }
            Err(error) => {
                log::error!("[Config] auto-save failed for '{name}': {error}");
            }
        }
    }
}
