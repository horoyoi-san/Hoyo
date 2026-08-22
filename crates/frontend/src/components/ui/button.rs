use gpui::{App, rgb};
use gpui_component::button::ButtonCustomVariant;

pub fn gold_button_variant(cx: &App) -> ButtonCustomVariant {
    ButtonCustomVariant::new(cx)
        .color(crate::theme::gold_strong())
        .foreground(rgb(0x12141a).into())
        .hover(rgb(0xdfc07a).into())
        .active(rgb(0xb88530).into())
        .shadow(true)
}
