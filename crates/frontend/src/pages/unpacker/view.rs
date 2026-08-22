use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme as _, Disableable as _, Sizable as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::Input,
    menu::ContextMenuExt as _,
    scroll::{ScrollableElement as _, ScrollbarAxis},
    v_flex,
};

use super::model::ThumbReq;
use super::tree::{Row, file_label};
use super::{CopyImage, INDENT, ROW_H, THUMB_SLOT, UnpackerPage};
use crate::components::ui::PanelExt as _;

fn thumb_placeholder() -> AnyElement {
    div().size_full().into_any_element()
}

impl UnpackerPage {
    pub(super) fn toolbar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let busy = self.busy;
        h_flex()
            .gap_2()
            .items_center()
            .child(
                Button::new("unp-load")
                    .custom(crate::components::ui::gold_button_variant(cx))
                    .label("Load")
                    .disabled(busy)
                    .on_click(cx.listener(|this, _, _w, cx| this.load(cx))),
            )
            .child(
                Button::new("unp-export")
                    .custom(crate::components::ui::gold_button_variant(cx))
                    .label("Export")
                    .disabled(busy || self.assets.is_empty())
                    .on_click(cx.listener(|this, _, _w, cx| this.export(cx))),
            )
            .child(
                div()
                    .flex_1()
                    .min_w_0()
                    .truncate()
                    .text_xs()
                    .text_color(cx.theme().muted_foreground)
                    .child(self.source_label.clone()),
            )
            .when(!self.assets.is_empty(), |row| {
                row.child(
                    div()
                        .flex_none()
                        .text_xs()
                        .text_color(cx.theme().muted_foreground)
                        .child(format!("{} textures", self.assets.len())),
                )
            })
            .child(
                div()
                    .w(px(220.))
                    .flex_none()
                    .child(Input::new(&self.search_input)),
            )
    }

    pub(super) fn tree_panel(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let weak = cx.entity().downgrade();
        let count = self.visible.len();
        let selected = self.selected;
        let c_sel = crate::theme::selection();
        let c_hover = cx.theme().list_hover;
        let c_fg = cx.theme().foreground;
        let c_muted = cx.theme().muted_foreground;

        let list = uniform_list("unp-tree", count, move |range, _window, cx| {
            let Some(entity) = weak.upgrade() else {
                return Vec::new();
            };
            let this = entity.read(cx);
            range
                .filter_map(|i| {
                    let row = this.visible.get(i)?;
                    let row_weak = weak.clone();
                    let el = match row {
                        Row::Folder {
                            path,
                            label,
                            depth,
                            expanded,
                        } => {
                            let path = path.clone();
                            let chevron = if *expanded { "▾" } else { "▸" };
                            div()
                                .id(SharedString::from(format!("unp-dir-{path}")))
                                .w_full()
                                .h(px(ROW_H))
                                .px_1()
                                .flex()
                                .items_center()
                                .cursor_pointer()
                                .hover(move |r| r.bg(c_hover))
                                .on_click(move |_, _w, cx| {
                                    if let Some(e) = row_weak.upgrade() {
                                        e.update(cx, |this, cx| this.toggle_folder(&path, cx));
                                    }
                                })
                                .child(
                                    h_flex()
                                        .h_full()
                                        .w_full()
                                        .items_center()
                                        .gap_1()
                                        .pl(px(*depth as f32 * INDENT))
                                        .child(
                                            div()
                                                .w(px(14.))
                                                .flex_none()
                                                .text_xs()
                                                .text_color(c_muted)
                                                .child(chevron),
                                        )
                                        .child(
                                            div()
                                                .flex_1()
                                                .min_w_0()
                                                .truncate()
                                                .text_sm()
                                                .text_color(c_fg)
                                                .child(label.clone()),
                                        ),
                                )
                        }
                        Row::File {
                            asset_idx,
                            label,
                            depth,
                        } => {
                            let asset_idx = *asset_idx;
                            let is_sel = selected == Some(asset_idx);

                            let thumb_inner = this
                                .assets
                                .get(asset_idx).map_or_else(thumb_placeholder, |entry| {
                                    let pid = entry.path_id;
                                    match this.thumbs.get(&pid) {
                                        Some(Some(image)) => img(image.clone())
                                            .size_full()
                                            .object_fit(ObjectFit::Contain)
                                            .into_any_element(),
                                        Some(None) => thumb_placeholder(),
                                        None => {
                                            if !this.busy
                                                && this.thumb_requested.lock().unwrap().insert(pid)
                                            {
                                                let _ = this.thumb_tx.send(ThumbReq {
                                                    block: entry.block.clone(),
                                                    path_id: pid,
                                                });
                                            }
                                            thumb_placeholder()
                                        }
                                    }
                                });

                            div()
                                .id(SharedString::from(format!("unp-file-{asset_idx}")))
                                .w_full()
                                .h(px(ROW_H))
                                .px_1()
                                .flex()
                                .items_center()
                                .cursor_pointer()
                                .when(is_sel, |r| r.bg(c_sel))
                                .hover(move |r| r.bg(c_hover))
                                .on_click(move |_, _w, cx| {
                                    if let Some(e) = row_weak.upgrade() {
                                        e.update(cx, |this, cx| this.select(asset_idx, cx));
                                    }
                                })
                                .child(
                                    h_flex()
                                        .h_full()
                                        .w_full()
                                        .items_center()
                                        .gap_2()
                                        .pl(px(*depth as f32 * INDENT + 14.0))
                                        .child(
                                            div()
                                                .flex_none()
                                                .w(px(THUMB_SLOT))
                                                .h(px(THUMB_SLOT))
                                                .rounded_sm()
                                                .bg(rgb(0x222329))
                                                .child(thumb_inner),
                                        )
                                        .child(
                                            div()
                                                .flex_1()
                                                .min_w_0()
                                                .truncate()
                                                .text_sm()
                                                .text_color(c_fg)
                                                .child(label.clone()),
                                        ),
                                )
                        }
                    };
                    Some(el.into_any_element())
                })
                .collect::<Vec<_>>()
        })
        .track_scroll(&self.scroll);

        div()
            .w(px(420.))
            .flex_none()
            .h_full()
            .relative()
            .panel(cx)
            .child(list.size_full())
            .scrollbar(&self.scroll, ScrollbarAxis::Vertical)
    }

    pub(super) fn preview_pane(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let selected = self.selected.and_then(|i| self.assets.get(i));

        let mut pane = v_flex().flex_1().min_w_0().h_full().gap_3().panel(cx).p_4();

        let Some(entry) = selected else {
            return pane.child(
                div()
                    .text_sm()
                    .text_color(theme.muted_foreground)
                    .child("Select a texture to preview."),
            );
        };

        let name = if entry.name.is_empty() {
            file_label(entry)
        } else {
            entry.name.clone()
        };
        let container = entry.container.clone();
        let block_name = entry
            .block
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let has_image = self.preview_rgba.is_some();

        pane = pane.child(
            h_flex()
                .w_full()
                .items_start()
                .justify_between()
                .gap_3()
                .child(
                    v_flex()
                        .flex_1()
                        .min_w_0()
                        .gap_1()
                        .child(
                            div()
                                .text_lg()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(theme.foreground)
                                .truncate()
                                .child(name),
                        )
                        .when(!container.is_empty(), |col| {
                            col.child(
                                div()
                                    .text_xs()
                                    .text_color(theme.muted_foreground)
                                    .truncate()
                                    .child(container),
                            )
                        }),
                )
                .child(
                    h_flex()
                        .flex_none()
                        .gap_2()
                        .items_center()
                        .child(
                            Button::new("unp-copy")
                                .ghost()
                                .small()
                                .label("Copy")
                                .disabled(!has_image)
                                .on_click(cx.listener(|this, _, _w, cx| this.copy_preview(cx))),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme.muted_foreground)
                                .child(block_name),
                        ),
                ),
        );

        let image_area = div()
            .id("unp-preview-img")
            .flex_1()
            .min_h_0()
            .w_full()
            .flex()
            .items_center()
            .justify_center()
            .rounded(theme.radius)
            .bg(rgb(0x222329));

        let thumb = self.thumbs.get(&entry.path_id).cloned().flatten();
        let image_area = if let Some(image) = self.preview.clone().or(thumb) {
            image_area.child(
                img(image)
                    .object_fit(ObjectFit::Contain)
                    .max_w_full()
                    .max_h_full(),
            )
        } else {
            image_area.child(
                div().text_sm().text_color(theme.muted_foreground).child(
                    self.preview_error
                        .clone()
                        .unwrap_or_else(|| "Decoding…".into()),
                ),
            )
        };

        let image_area = image_area.context_menu(move |menu, _window, _cx| {
            menu.menu_with_disabled("Copy image", Box::new(CopyImage), !has_image)
        });

        pane.child(image_area)
    }
}
