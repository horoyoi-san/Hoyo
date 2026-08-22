use gpui::*;
use gpui_component::h_flex;

pub fn nav_item(
    id: impl Into<ElementId>,
    label: impl Into<SharedString>,
    icon: AnyElement,
    selected: bool,
    on_click: impl Fn(&MouseDownEvent, &mut Window, &mut App) + 'static,
    _cx: &App,
) -> Stateful<Div> {
    let mut item = div()
        .id(id.into())
        .w_full()
        .h(px(48.))
        .relative()
        .rounded(px(2.))
        .cursor_pointer()
        .on_mouse_down(MouseButton::Left, on_click);

    if selected {
        item = item
            .border_1()
            .border_color(crate::theme::gold_strong())
            .bg(rgba(0x131828f2))
            .shadow_sm()
            .child(
                div()
                    .absolute()
                    .inset(px(2.))
                    .rounded(px(1.))
                    .border_1()
                    .border_color(rgba(0xd2a04a88))
                    .bg(rgba(0xd2a04a1f)),
            )
            .child(crate::ui::hsr_corner_badge());
    } else {
        item = item
            .border_1()
            .border_color(rgba(0xd2a04a2e))
            .bg(rgba(0x0e1320b3))
            .child(
                div()
                    .absolute()
                    .inset(px(2.))
                    .rounded(px(1.))
                    .border_1()
                    .border_color(rgba(0xffffff08)),
            )
            .hover(|el| {
                el.border_color(crate::theme::gold_strong())
                    .bg(rgba(0xd2a04a1a))
            });
    }

    let text_c: Hsla = if selected {
        rgb(0xffffff).into()
    } else {
        rgb(0xd1d7e5).into()
    };

    item.child(
        h_flex()
            .relative()
            .size_full()
            .px_3()
            .items_center()
            .gap_2p5()
            .child(
                div()
                    .size(px(28.))
                    .flex_none()
                    .flex()
                    .items_center()
                    .justify_center()
                    .child(icon),
            )
            .child(
                div()
                    .flex_1()
                    .min_w_0()
                    .text_sm()
                    .font_weight(if selected {
                        FontWeight::BOLD
                    } else {
                        FontWeight::MEDIUM
                    })
                    .text_color(text_c)
                    .truncate()
                    .child(label.into()),
            ),
    )
}
