use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme as _, Sizable as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::Input,
    v_flex,
};

use crate::components::ui::PanelExt as _;
use crate::pages::design::{DesignPage, ViewMode};

impl DesignPage {
    pub(crate) fn active_is_lua(&self) -> bool {
        self.selected
            .and_then(|i| self.entries.get(i))
            .is_some_and(|e| e.is_lua)
    }

    fn inspector_content(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let secondary = cx.theme().secondary;
        let mono = cx.theme().mono_font_family.clone();

        if self.active_is_lua() {
            return div()
                .flex_1()
                .min_h_0()
                .w_full()
                .child(
                    Input::new(&self.lua_editor)
                        .h_full()
                        .bg(secondary)
                        .font_family(mono),
                )
                .into_any_element();
        }

        if self.view_mode == ViewMode::Graph {
            self.ensure_graph();
        }
        match self.view_mode {
            ViewMode::Json => div()
                .flex_1()
                .min_h_0()
                .w_full()
                .child(
                    Input::new(&self.json_editor)
                        .h_full()
                        .bg(secondary)
                        .font_family(mono),
                )
                .into_any_element(),
            ViewMode::Graph => div()
                .flex_1()
                .min_h_0()
                .w_full()
                .p_2()
                .child(self.graph_canvas(cx))
                .into_any_element(),
        }
    }

    pub(crate) fn inspector(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        let border = cx.theme().border;
        let pane = v_flex()
            .flex_1()
            .min_w_0()
            .h_full()
            .overflow_hidden()
            .panel(cx);

        if self.open.is_empty() {
            return pane.child(self.empty_state(cx));
        }

        let switch = if self.active_is_lua() {
            None
        } else {
            Some(self.view_switch(cx).into_any_element())
        };
        let tabs = self.tab_strip(cx).into_any_element();
        let fs = self.fullscreen_button(cx).into_any_element();
        let crumb = self.breadcrumb(cx).into_any_element();
        let content = self.inspector_content(cx);

        pane.child(
            h_flex()
                .w_full()
                .flex_none()
                .items_center()
                .gap_2()
                .px_2()
                .py_1()
                .border_b_1()
                .border_color(border)
                .child(div().flex_1().min_w_0().child(tabs))
                .children(switch)
                .child(fs),
        )
        .child(crumb)
        .child(content)
    }

    pub(crate) fn fullscreen_view(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
        let border = cx.theme().border;
        let switch = if self.active_is_lua() {
            None
        } else {
            Some(self.view_switch(cx).into_any_element())
        };
        let crumb = self.breadcrumb(cx).into_any_element();
        let fs = self.fullscreen_button(cx).into_any_element();
        let content = self.inspector_content(cx);
        v_flex()
            .size_full()
            .p_2()
            .gap_2()
            .child(
                h_flex()
                    .w_full()
                    .flex_none()
                    .items_center()
                    .gap_2()
                    .px_2()
                    .py_1()
                    .border_b_1()
                    .border_color(border)
                    .child(div().flex_1().min_w_0().child(crumb))
                    .children(switch)
                    .child(fs),
            )
            .child(content)
    }

    fn fullscreen_button(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let icon = if self.fullscreen {
            gpui_component::IconName::Minimize
        } else {
            gpui_component::IconName::Maximize
        };
        Button::new("design-fullscreen")
            .ghost()
            .small()
            .icon(icon)
            .on_click(cx.listener(|this, _, _w, cx| {
                this.fullscreen = !this.fullscreen;
                cx.notify();
            }))
    }

    fn empty_state(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let muted = cx.theme().muted_foreground;
        let faint = cx.theme().muted_foreground.opacity(0.45);
        v_flex()
            .flex_1()
            .size_full()
            .items_center()
            .justify_center()
            .gap_2()
            .child(div().text_size(px(40.)).text_color(faint).child("{ }"))
            .child(
                div()
                    .text_sm()
                    .text_color(muted)
                    .child("Select a config to view or edit"),
            )
            .child(
                div()
                    .text_xs()
                    .text_color(faint)
                    .child("Parse the game design data to begin"),
            )
    }

    fn view_switch(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let mode = self.view_mode;
        let weak = cx.entity().downgrade();
        let bg = cx.theme().secondary;
        let border = cx.theme().border;
        let active_bg = cx.theme().background;
        let fg = cx.theme().foreground;
        let muted = cx.theme().muted_foreground;
        let hover = cx.theme().list_hover;

        let seg = move |id: &'static str, label: &'static str, this_mode: ViewMode| {
            let active = mode == this_mode;
            let w = weak.clone();
            div()
                .id(id)
                .px_2()
                .py(px(2.))
                .rounded(px(5.))
                .cursor_pointer()
                .text_xs()
                .when(active, |s| {
                    s.bg(active_bg)
                        .text_color(fg)
                        .font_weight(FontWeight::SEMIBOLD)
                })
                .when(!active, |s| s.text_color(muted).hover(move |s| s.bg(hover)))
                .child(label)
                .on_click(move |_, _w, cx| {
                    if let Some(e) = w.upgrade() {
                        e.update(cx, |this, cx| this.set_view_mode(this_mode, cx));
                    }
                })
        };

        h_flex()
            .flex_none()
            .items_center()
            .gap(px(2.))
            .p(px(2.))
            .rounded(px(7.))
            .bg(bg)
            .border_1()
            .border_color(border)
            .child(seg("design-vm-json", "JSON", ViewMode::Json))
            .child(seg("design-vm-graph", "Graph", ViewMode::Graph))
    }
}
