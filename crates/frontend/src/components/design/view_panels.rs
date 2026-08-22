use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme as _,
    h_flex,
    scroll::{ScrollableElement as _, ScrollbarAxis},
    v_flex,
};

use crate::components::ui::{PanelExt as _, pill};
use crate::pages::design::tree::Row;
use crate::pages::design::DesignPage;

const INDENT: f32 = 14.0;
const ROW_H: f32 = 24.0;

impl DesignPage {
    pub(crate) fn explorer_panel(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let weak = cx.entity().downgrade();
        let count = self.visible.len();
        let selected = self.selected;
        let c_accent = crate::theme::selection();
        let c_sel_bg = crate::theme::selection().opacity(0.28);
        let c_hover = cx.theme().list_hover;
        let c_fg = cx.theme().foreground;
        let c_muted = cx.theme().muted_foreground;
        let c_dirty = crate::theme::danger();
        let border = cx.theme().border;
        let total = self.entries.len();

        let list = uniform_list("design-tree", count, move |range, _window, cx| {
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
                                .id(SharedString::from(format!("design-dir-{path}")))
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
                            entry_idx,
                            label,
                            depth,
                        } => {
                            let entry_idx = *entry_idx;
                            let is_sel = selected == Some(entry_idx);
                            let is_dirty = this.dirty.contains(&entry_idx);
                            let label_color = if is_dirty { c_dirty } else { c_fg };
                            div()
                                .id(SharedString::from(format!("design-file-{entry_idx}")))
                                .relative()
                                .w_full()
                                .h(px(ROW_H))
                                .px_1()
                                .flex()
                                .items_center()
                                .cursor_pointer()
                                .when(is_sel, |r| r.bg(c_sel_bg))
                                .hover(move |r| r.bg(c_hover))
                                .when(is_sel, |r| {
                                    r.child(
                                        div()
                                            .absolute()
                                            .left(px(0.))
                                            .top(px(0.))
                                            .h_full()
                                            .w(px(2.5))
                                            .bg(c_accent),
                                    )
                                })
                                .on_click(move |_, window, cx| {
                                    if let Some(e) = row_weak.upgrade() {
                                        e.update(cx, |this, cx| {
                                            this.select(entry_idx, window, cx);
                                        });
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
                                                .text_xs()
                                                .text_color(if is_dirty {
                                                    c_dirty
                                                } else {
                                                    c_muted
                                                })
                                                .child(if is_dirty { "●" } else { "{}" }),
                                        )
                                        .child(
                                            div()
                                                .flex_1()
                                                .min_w_0()
                                                .truncate()
                                                .text_sm()
                                                .text_color(label_color)
                                                .when(is_sel, |s| {
                                                    s.font_weight(FontWeight::MEDIUM)
                                                })
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

        v_flex()
            .w(px(320.))
            .flex_none()
            .h_full()
            .overflow_hidden()
            .panel(cx)
            .child(
                h_flex()
                    .w_full()
                    .flex_none()
                    .items_center()
                    .justify_between()
                    .px_3()
                    .py_2()
                    .border_b_1()
                    .border_color(border)
                    .child(
                        div()
                            .text_xs()
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(c_muted)
                            .child("EXPLORER"),
                    )
                    .when(total > 0, |h| {
                        h.child(pill(format!("{total}"), c_muted).text_xs())
                    }),
            )
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .relative()
                    .child(list.size_full())
                    .scrollbar(&self.scroll, ScrollbarAxis::Vertical),
            )
    }

    pub(crate) fn tab_strip(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let c_active = cx.theme().secondary;
        let c_fg = cx.theme().foreground;
        let c_muted = cx.theme().muted_foreground;
        let c_accent = crate::theme::gold_strong();
        let c_dirty = crate::theme::danger();
        let active = self.selected;
        let weak = cx.entity().downgrade();

        h_flex()
            .w_full()
            .flex_none()
            .gap_1()
            .overflow_hidden()
            .children(self.open.iter().filter_map(|&idx| {
                let entry = self.entries.get(idx)?;
                let name = entry
                    .rel
                    .rsplit('/')
                    .next()
                    .unwrap_or(entry.rel.as_str())
                    .to_string();
                let is_active = active == Some(idx);
                let is_dirty = self.dirty.contains(&idx);
                let w_name = weak.clone();
                let w_close = weak.clone();
                Some(
                    h_flex()
                        .id(SharedString::from(format!("design-tab-{idx}")))
                        .relative()
                        .flex_none()
                        .h(px(26.))
                        .px_2()
                        .gap_1()
                        .items_center()
                        .rounded(px(4.))
                        .when(is_active, |t| t.bg(c_active))
                        .when(is_active, |t| {
                            t.child(
                                div()
                                    .absolute()
                                    .left(px(0.))
                                    .bottom(px(0.))
                                    .w_full()
                                    .h(px(2.))
                                    .bg(c_accent),
                            )
                        })
                        .when(is_dirty, |t| {
                            t.child(
                                div()
                                    .flex_none()
                                    .text_xs()
                                    .text_color(c_dirty)
                                    .child("●"),
                            )
                        })
                        .child(
                            div()
                                .id(SharedString::from(format!("design-tab-name-{idx}")))
                                .cursor_pointer()
                                .max_w(px(160.))
                                .truncate()
                                .text_xs()
                                .text_color(if is_active { c_fg } else { c_muted })
                                .child(name)
                                .on_click(move |_, window, cx| {
                                    if let Some(e) = w_name.upgrade() {
                                        e.update(cx, |this, cx| {
                                            this.activate(idx, window, cx);
                                        });
                                    }
                                }),
                        )
                        .child(
                            div()
                                .id(SharedString::from(format!("design-tab-x-{idx}")))
                                .cursor_pointer()
                                .flex_none()
                                .text_xs()
                                .text_color(c_muted)
                                .hover(|s| s.text_color(c_fg))
                                .child("✕")
                                .on_click(move |_, window, cx| {
                                    if let Some(e) = w_close.upgrade() {
                                        e.update(cx, |this, cx| {
                                            this.close_tab(idx, window, cx);
                                        });
                                    }
                                }),
                        ),
                )
            }))
    }
}
