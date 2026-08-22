use gpui::*;
use gpui_component::{
    ActiveTheme, IconName, Sizable as _,
    button::{Button, ButtonVariants as _},
    h_flex,
};

fn chip_base(cx: &App) -> Div {
    let theme = cx.theme();
    h_flex()
        .gap_2()
        .items_center()
        .pl(px(10.))
        .pr(px(4.))
        .py(px(2.))
        .rounded(theme.radius)
        .border_1()
        .border_color(theme.border)
        .bg(theme.secondary)
}

fn cmd_badge(cmd_id: u32, cx: &App) -> Div {
    let theme = cx.theme();
    div()
        .text_xs()
        .text_color(theme.muted_foreground)
        .px(px(6.))
        .py(px(1.))
        .rounded(theme.radius)
        .bg(theme.muted)
        .child(cmd_id.to_string())
}

pub fn removable_chip(
    id: impl Into<SharedString>,
    name: String,
    cmd_id: u32,
    on_remove: impl Fn(&mut App) + 'static,
    cx: &App,
) -> Div {
    let theme = cx.theme();
    chip_base(cx)
        .child(div().text_sm().text_color(theme.foreground).child(name))
        .child(cmd_badge(cmd_id, cx))
        .child(
            Button::new(id.into())
                .ghost()
                .small()
                .icon(IconName::Minus)
                .on_click(move |_, _window, cx| on_remove(cx)),
        )
}

pub fn badge_chip(name: String, cmd_id: u32, badge: &str, cx: &App) -> Div {
    let theme = cx.theme();
    chip_base(cx)
        .pr(px(8.))
        .child(div().text_sm().text_color(theme.foreground).child(name))
        .child(cmd_badge(cmd_id, cx))
        .child(
            div()
                .text_xs()
                .text_color(theme.accent_foreground)
                .px(px(6.))
                .py(px(1.))
                .rounded(theme.radius)
                .bg(theme.accent)
                .child(badge.to_string()),
        )
}
