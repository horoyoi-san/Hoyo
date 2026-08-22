use gpui::*;
use gpui_component::h_flex;

pub fn pill(child: impl IntoElement, color: Hsla) -> Div {
    h_flex()
        .justify_center()
        .items_center()
        .px(px(8.))
        .py(px(2.))
        .rounded(px(999.))
        .text_color(color)
        .bg(color.opacity(0.15))
        .border_1()
        .border_color(color.opacity(0.45))
        .child(child)
}
