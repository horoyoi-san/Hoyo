use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme as _, Disableable as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::Input,
};

use crate::components::ui::pill;
use crate::pages::design::DesignPage;

impl DesignPage {
    pub(crate) fn command_bar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let busy = self.busy;
        let muted = cx.theme().muted_foreground;
        let border = cx.theme().border;
        let radius = cx.theme().radius;
        let surface = cx.theme().secondary.opacity(0.4);

        h_flex()
            .w_full()
            .items_center()
            .gap_2()
            .px_2()
            .py_1()
            .rounded(radius)
            .border_1()
            .border_color(border)
            .bg(surface)
            .child(
                Button::new("design-parse")
                    .custom(crate::components::ui::gold_button_variant(cx))
                    .label("Parse")
                    .disabled(busy)
                    .on_click(cx.listener(|this, _, _w, cx| this.parse(cx))),
            )
            .child(
                Button::new("design-open")
                    .ghost()
                    .label("Open")
                    .disabled(busy)
                    .on_click(cx.listener(|this, _, _w, cx| this.open_folder(cx))),
            )
            .child(div().flex_none().w(px(1.)).h(px(18.)).bg(border))
            .child(
                Button::new("design-edit")
                    .custom(crate::components::ui::gold_button_variant(cx))
                    .label(if self.dirty.is_empty() {
                        "Edit".to_string()
                    } else {
                        format!("Edit ({})", self.dirty.len())
                    })
                    .disabled(busy || self.dirty.is_empty())
                    .on_click(cx.listener(|this, _, _w, cx| this.edit(cx))),
            )
            .child(div().flex_1())
            .when(!self.entries.is_empty(), |row| {
                row.child(
                    pill(format!("{} files", self.entries.len()), muted).text_xs(),
                )
            })
            .child(
                div()
                    .w(px(220.))
                    .flex_none()
                    .child(Input::new(&self.search_input)),
            )
    }

    pub(crate) fn status_bar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let muted = cx.theme().muted_foreground;
        let border = cx.theme().border;
        let green = cx.theme().green;
        let amber = crate::theme::gold_strong();
        let dirty_c = crate::theme::danger();

        let dot = if self.busy { amber } else { green };
        let files = self.entries.len();
        let dirty = self.dirty.len();
        let out = self
            .root
            .as_ref()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().to_string());

        h_flex()
            .w_full()
            .flex_none()
            .items_center()
            .gap_2()
            .px_3()
            .py_1()
            .border_t_1()
            .border_color(border)
            .child(div().flex_none().size(px(8.)).rounded(px(99.)).bg(dot))
            .child(
                div()
                    .flex_1()
                    .min_w_0()
                    .truncate()
                    .text_xs()
                    .text_color(muted)
                    .child(self.status.clone()),
            )
            .child(
                h_flex()
                    .flex_none()
                    .items_center()
                    .gap_3()
                    .when(files > 0, |r| {
                        r.child(
                            div()
                                .text_xs()
                                .text_color(muted)
                                .child(format!("{files} files")),
                        )
                    })
                    .when(dirty > 0, |r| {
                        r.child(
                            div()
                                .text_xs()
                                .text_color(dirty_c)
                                .child(format!("{dirty} unsaved")),
                        )
                    })
                    .children(out.map(|o| {
                        div().text_xs().text_color(muted).child(o)
                    }))
                    .child(
                        div().text_xs().text_color(muted).child(if self.active_is_lua() {
                            "LUA"
                        } else {
                            self.view_mode.label()
                        }),
                    ),
            )
    }

    pub(crate) fn breadcrumb(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let muted = cx.theme().muted_foreground;
        let fg = cx.theme().foreground;
        let border = cx.theme().border;
        let dirty_c = crate::theme::danger();

        let rel = self
            .selected
            .and_then(|i| self.entries.get(i))
            .map(|e| e.rel.clone());
        let is_dirty = self
            .selected
            .is_some_and(|i| self.dirty.contains(&i));

        let mut row = h_flex()
            .w_full()
            .flex_none()
            .items_center()
            .gap_1()
            .px_3()
            .py_1()
            .border_b_1()
            .border_color(border);

        if let Some(rel) = rel {
            let parts: Vec<&str> = rel.split('/').filter(|s| !s.is_empty()).collect();
            let last = parts.len().saturating_sub(1);
            for (i, part) in parts.iter().enumerate() {
                if i > 0 {
                    row = row.child(
                        div()
                            .flex_none()
                            .text_xs()
                            .text_color(muted.opacity(0.6))
                            .child("›"),
                    );
                }
                let is_last = i == last;
                row = row.child(
                    div()
                        .flex_none()
                        .text_xs()
                        .text_color(if is_last { fg } else { muted })
                        .when(is_last, |s| s.font_weight(FontWeight::MEDIUM))
                        .child(part.to_string()),
                );
            }
            row = row.child(div().flex_1());
            if is_dirty {
                row = row.child(pill("modified", dirty_c).text_xs());
            } else if self.active_is_lua() {
                row = row.child(pill("read-only", muted).text_xs());
            }
        }

        row
    }
}
