use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme, IconName, Sizable as _,
    button::{Button, ButtonVariants as _},
    h_flex, v_flex,
    input::Input,
};

use super::ConfigPage;

impl ConfigPage {
    pub(super) fn render_config_card(
        &mut self,
        name: &str,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement + use<> {
        let theme = cx.theme();
        let is_active = self.active_config.as_deref() == Some(name);
        let is_renaming = self.renaming.as_deref() == Some(name);

        let border_color = if is_active {
            theme.primary.opacity(0.4)
        } else {
            theme.border
        };

        let name_unload = name.to_string();

        v_flex()
            .w(px(240.))
            .p_4()
            .gap_3()
            .rounded(px(6.))
            .border_1()
            .border_color(border_color)
            .bg(rgba(0x141824cc))
            .id(format!("config-card-{name}"))
            .when(is_active, |el| {
                el.on_click(cx.listener(move |this, event: &ClickEvent, _, cx| {
                    if event.click_count() == 2 {
                        this.unload_config(&name_unload, cx);
                    }
                }))
            })
            .child(if is_renaming {
                self.render_rename_row(cx).into_any_element()
            } else {
                v_flex()
                    .gap_3()
                    .child(self.render_title_row(name, is_active, cx))
                    .child(self.render_actions(name, is_active, window, cx))
                    .into_any_element()
            })
    }

    fn render_title_row(&self, name: &str, is_active: bool, cx: &App) -> impl IntoElement + use<> {
        h_flex()
            .flex_1()
            .min_w_0()
            .gap_2()
            .items_center()
            .child(
                div()
                    .flex_1()
                    .min_w_0()
                    .font_weight(FontWeight::SEMIBOLD)
                    .text_sm()
                    .text_color(cx.theme().foreground)
                    .whitespace_nowrap()
                    .overflow_hidden()
                    .text_ellipsis()
                    .child(name.to_string()),
            )
            .when(is_active, |row| {
                row.child(
                    div()
                        .px_1p5()
                        .py_0p5()
                        .rounded_full()
                        .text_xs()
                        .font_weight(FontWeight::SEMIBOLD)
                        .bg(cx.theme().primary.opacity(0.15))
                        .text_color(cx.theme().primary)
                        .flex_none()
                        .child("ACTIVE"),
                )
            })
    }

    fn render_rename_row(&mut self, cx: &mut Context<Self>) -> impl IntoElement + use<> {
        h_flex()
            .gap_2()
            .items_center()
            .child(div().flex_1().child(Input::new(&self.rename_input)))
            .child(
                Button::new("cfg-rename-ok")
                    .small()
                    .icon(IconName::Check)
                    .on_click(cx.listener(|this, _, _, cx| this.confirm_rename(cx))),
            )
            .child(
                Button::new("cfg-rename-cancel")
                    .small()
                    .ghost()
                    .icon(IconName::Close)
                    .on_click(cx.listener(|this, _, _, cx| this.cancel_rename(cx))),
            )
    }

    fn render_actions(
        &mut self,
        name: &str,
        is_active: bool,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement + use<> {
        let name_load = name.to_string();
        let name_rename = name.to_string();
        let name_delete = name.to_string();

        h_flex()
            .w_full()
            .justify_end()
            .gap_1()
            .items_center()
            .flex_none()
            .when(!is_active, |row| {
                let name = name_load;
                row.child(
                    Button::new(format!("cfg-load-{name}"))
                        .small()
                        .label("Load")
                        .on_click(cx.listener(move |this, _, window, cx| {
                            this.load_config(&name, window, cx);
                        })),
                )
            })
            .child(
                Button::new(format!("cfg-rename-{name_rename}"))
                    .small()
                    .ghost()
                    .icon(IconName::Settings2)
                    .tooltip("Rename")
                    .on_click(cx.listener(move |this, _, window, cx| {
                        this.start_rename(&name_rename, window, cx);
                    })),
            )
            .child(
                Button::new(format!("cfg-delete-{name_delete}"))
                    .small()
                    .ghost()
                    .danger()
                    .icon(IconName::Delete)
                    .tooltip("Delete")
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.delete_config(&name_delete, cx);
                    })),
            )
    }
}
