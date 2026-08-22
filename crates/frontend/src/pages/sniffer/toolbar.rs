use gpui::*;
use gpui_component::{
    ActiveTheme, IconName, Sizable as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::Input,
    switch::Switch,
};

use super::{SnifferPage, sniff_file};

impl SnifferPage {
    pub(super) fn list_actions(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let paused = self.paused;

        h_flex()
            .gap_1()
            .items_center()
            .child(self.send_dialog(cx))
            .child(
                Button::new("snf-save")
                    .ghost()
                    .small()
                    .icon(IconName::ArrowDown)
                    .tooltip("Save Sniff")
                    .on_click(cx.listener(|this, _, _window, cx| {
                        let packets = this.packets.clone();
                        cx.spawn(async move |_this, cx| {
                            let key = sniff_file::generate_key();
                            let filename = sniff_file::suggested_filename(&key);
                            let Some(handle) = rfd::AsyncFileDialog::new()
                                .add_filter("sniff", &["sniff"])
                                .set_file_name(&filename)
                                .save_file()
                                .await
                            else {
                                return;
                            };

                            let path = handle.path().to_path_buf();
                            let packet_count = packets.len();
                            let path_for_log = path.clone();
                            let key_for_log = key;
                            let save_task = cx
                                .background_executor()
                                .spawn(async move { sniff_file::save(&packets, &path, key) });

                            match save_task.await {
                                Ok(()) => {
                                    log::info!(
                                        "[Sniffer] saved {} packets to {} with key {}",
                                        packet_count,
                                        path_for_log.display(),
                                        sniff_file::key_to_hex(&key_for_log)
                                    );
                                }
                                Err(error) => {
                                    log::error!("[Sniffer] failed to save sniff: {error}");
                                }
                            }
                        })
                        .detach();
                    })),
            )
            .child(
                Button::new("snf-pause")
                    .ghost()
                    .small()
                    .icon(if paused {
                        IconName::Play
                    } else {
                        IconName::Pause
                    })
                    .tooltip(if paused { "Resume" } else { "Pause" })
                    .on_click(cx.listener(|this, _, _, cx| {
                        this.paused = !this.paused;
                        cx.notify();
                    })),
            )
            .child(
                Button::new("snf-clear")
                    .ghost()
                    .small()
                    .icon(IconName::Delete)
                    .tooltip("Clear")
                    .on_click(cx.listener(|this, _, _, cx| {
                        this.packets.clear();
                        this.packet_rows.clear();
                        this.filtered_idx.clear();
                        this.filtered_dirty = true;
                        this.base_idx.clear();
                        this.base_dirty = false;
                        this.selected = None;
                        this.last_inspected = None;
                        this.info_cache = None;
                        cx.notify();
                    })),
            )
            .child(self.settings_dialog(cx))
    }

    pub(super) fn toolbar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();

        h_flex()
            .gap_2()
            .items_center()
            .child(div().w(px(260.)).child(Input::new(&self.search)))
            .child(
                Switch::new("snf-follow")
                    .checked(self.follow)
                    .label("Follow")
                    .on_click(cx.listener(|this, checked: &bool, _, cx| {
                        this.follow = *checked;
                        if this.follow {
                            this.list_scroll.scroll_to_bottom();
                        }
                        cx.notify();
                    })),
            )
            .child(
                div()
                    .text_xs()
                    .text_color(theme.muted_foreground)
                    .child(format!(
                        "{} / {} packets",
                        self.filtered_idx.len(),
                        self.packets.len()
                    )),
            )
    }
}
