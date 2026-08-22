use gpui::*;
use gpui_component::{ActiveTheme, v_flex};

pub fn section_title(text: &str, cx: &App) -> Div {
    div()
        .text_sm()
        .font_weight(FontWeight::BOLD)
        .text_color(cx.theme().foreground)
        .child(text.to_string())
}

pub fn detail_pair(label: &str, value: String, cx: &App) -> Div {
    v_flex()
        .gap_1()
        .child(
            div()
                .text_xs()
                .font_weight(FontWeight::BOLD)
                .text_color(cx.theme().muted_foreground)
                .child(label.to_string()),
        )
        .child(
            div()
                .text_sm()
                .text_color(cx.theme().foreground)
                .child(value),
        )
}

pub fn detail_block(label: &str, value: String, cx: &App) -> Div {
    v_flex()
        .gap_1()
        .child(
            div()
                .text_xs()
                .font_weight(FontWeight::BOLD)
                .text_color(cx.theme().muted_foreground)
                .child(label.to_string()),
        )
        .child(
            div()
                .id(SharedString::from(format!("detail-{label}")))
                .max_h(px(160.))
                .overflow_y_scroll()
                .font_family(cx.theme().mono_font_family.clone())
                .text_xs()
                .text_color(cx.theme().foreground)
                .child(value),
        )
}
