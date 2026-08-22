mod actions;
mod autosave;
mod card;
mod create_row;
mod state;
mod status_card;

use gpui::*;
use gpui_component::{ActiveTheme, input::InputState, v_flex};

use crate::config_store;
use crate::pages::{CheatPage, SnifferPage};

pub struct ConfigPage {
    pub(crate) dumper_enabled: bool,
    pub(crate) configs: Vec<String>,
    pub(crate) active_config: Option<String>,
    pub(crate) last_saved: Option<crate::config_store::AppConfig>,
    pub(crate) new_name_input: Entity<InputState>,
    pub(crate) rename_input: Entity<InputState>,
    pub(crate) renaming: Option<String>,
    pub(crate) sniffer: WeakEntity<SnifferPage>,
    pub(crate) cheat: WeakEntity<CheatPage>,
}

impl ConfigPage {
    pub fn new(
        window: &mut Window,
        cx: &mut Context<Self>,
        sniffer: WeakEntity<SnifferPage>,
        cheat: WeakEntity<CheatPage>,
    ) -> Self {
        let new_name_input =
            cx.new(|cx| InputState::new(window, cx).placeholder("New config name…"));
        let rename_input = cx.new(|cx| InputState::new(window, cx));
        let configs = config_store::list().unwrap_or_default();

        autosave::spawn_auto_save_task(cx);

        let mut page = Self {
            dumper_enabled: true,
            configs,
            active_config: None,
            last_saved: None,
            new_name_input,
            rename_input,
            renaming: None,
            sniffer,
            cheat,
        };

        if let Some(last) = config_store::last_loaded_name() {
            log::debug!("[Config] startup: will load last config '{last}'");
            if std::fs::metadata(config_store::config_dir().join(format!("{last}.json"))).is_ok() {
                page.load_config(&last, window, cx);
            } else {
                log::warn!(
                    "[Config] startup: last config '{last}' file missing, skipping"
                );
                let _ = config_store::set_last_loaded_name(None);
            }
        } else {
            log::debug!("[Config] startup: no last config to load");
        }

        page
    }

    pub(crate) fn refresh_configs(&mut self) {
        self.configs = config_store::list().unwrap_or_default();
    }

    fn build_config_list(&mut self, window: &mut Window, cx: &mut Context<Self>) -> AnyElement {
        let theme = cx.theme();
        if self.configs.is_empty() {
            div()
                .flex()
                .flex_col()
                .items_center()
                .justify_center()
                .p_10()
                .rounded(px(6.))
                .border_1()
                .border_color(rgba(0xffffff1a))
                .bg(rgba(0x14182499))
                .child(
                    div().text_sm().text_color(theme.muted_foreground).child(
                        "No saved configs yet. Use the input above to save the current state.",
                    ),
                )
                .into_any_element()
        } else {
            let names = self.configs.clone();
            let cards: Vec<AnyElement> = names
                .iter()
                .map(|name| self.render_config_card(name, window, cx).into_any_element())
                .collect();

            div()
                .flex()
                .flex_row()
                .flex_wrap()
                .justify_start()
                .gap_3()
                .children(cards)
                .into_any_element()
        }
    }
}

impl Render for ConfigPage {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let header = crate::ui::page_header(
            "Config",
            "Claude is AI and can make mistakes. Please double-check responses.",
            cx,
        );

        let config_list = self.build_config_list(window, cx);

        div()
            .relative()
            .size_full()
            .p_4()
            .child(self.render_status_widget(cx))
            .child(
                v_flex()
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap_4()
                    .w_full()
                    .child(
                        v_flex()
                            .w(px(720.))
                            .gap_4()
                            .child(header)
                            .child(crate::ui::card(cx).child(self.render_create_row(window, cx)))
                            .child(config_list),
                    ),
            )
            .into_any_element()
    }
}
