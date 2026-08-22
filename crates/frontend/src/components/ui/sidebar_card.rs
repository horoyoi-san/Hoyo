use gpui::*;
use gpui_component::{h_flex, v_flex};

pub fn render_double_star_badge() -> impl IntoElement {
    div()
        .absolute()
        .top(px(-16.))
        .left(px(-10.))
        .w(px(54.))
        .h(px(40.))
        .flex_none()
        .child(
            div()
                .size(px(30.))
                .absolute()
                .top(px(3.))
                .left(px(14.))
                .flex_none()
                .child(
                    svg()
                        .path("icons/hsr_star_slender.svg")
                        .text_color(rgb(0xd4a45f))
                        .size(px(30.))
                        .absolute()
                        .inset_0(),
                )
                .child(
                    svg()
                        .path("icons/hsr_star_slender.svg")
                        .text_color(rgb(0xcf3c30))
                        .size(px(23.))
                        .absolute()
                        .top(px(3.5))
                        .left(px(3.5)),
                ),
        )
        .child(
            div()
                .size(px(36.))
                .absolute()
                .top(px(0.))
                .left(px(0.))
                .flex_none()
                .child(
                    svg()
                        .path("icons/hsr_star_slender.svg")
                        .text_color(rgb(0xd4ad67))
                        .size(px(36.))
                        .absolute()
                        .inset_0(),
                )
                .child(
                    svg()
                        .path("icons/hsr_star_slender.svg")
                        .text_color(rgb(0xfff8ee))
                        .size(px(28.))
                        .absolute()
                        .top(px(4.))
                        .left(px(4.)),
                ),
        )
}

pub fn hsr_corner_stars() -> impl IntoElement {
    render_double_star_badge()
}

pub fn render_hsr_card_canvas(selected: bool) -> Canvas<()> {
    canvas(
        move |_bounds, _window, _cx| {},
        move |bounds, _state, window, _cx| {
            let ox = f32::from(bounds.origin.x);
            let oy = f32::from(bounds.origin.y);
            let w = f32::from(bounds.size.width);
            let h = f32::from(bounds.size.height);

            if w < 10.0 || h < 10.0 {
                return;
            }

            let cut = 14.0f32;

            let make_polygon = |inset: f32| {
                let x1 = ox + inset;
                let y1 = oy + inset;
                let x2 = ox + w - inset;
                let y2 = oy + inset;
                let x3 = ox + w - inset;
                let y3 = oy + h - cut - inset * 0.414;
                let x4 = ox + w - cut - inset * 0.414;
                let y4 = oy + h - inset;
                let x5 = ox + inset;
                let y5 = oy + h - inset;

                let mut p = Path::new(point(px(x1), px(y1)));
                p.line_to(point(px(x2), px(y2)));
                p.line_to(point(px(x3), px(y3)));
                p.line_to(point(px(x4), px(y4)));
                p.line_to(point(px(x5), px(y5)));
                p
            };

            if selected {
                let gold: Hsla = rgb(0xd9b36b).into();
                let black: Hsla = rgb(0x111111).into();
                let white: Hsla = rgb(0xf6f0e5).into();
                let body_bg: Hsla = rgba(0x131828f2).into();

                window.paint_path(make_polygon(0.0), gold);
                window.paint_path(make_polygon(1.2), black);
                window.paint_path(make_polygon(2.2), white);
                window.paint_path(make_polygon(3.4), black);
                window.paint_path(make_polygon(4.4), body_bg);
            } else {
                let border_c: Hsla = rgba(0xd9b36b33).into();
                let body_bg: Hsla = rgba(0x0e1320cc).into();

                window.paint_path(make_polygon(0.0), border_c);
                window.paint_path(make_polygon(1.0), body_bg);
            }
        },
    )
}

pub fn sidebar_card(
    id: SharedString,
    title: &'static str,
    subtitle: &'static str,
    icon: AnyElement,
    selected: bool,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> impl IntoElement {
    let mut card = div().id(id).w_full().h(px(48.)).relative().cursor_pointer();

    let text_c: Hsla = if selected {
        rgb(0xffffff).into()
    } else {
        rgb(0xd1d7e5).into()
    };

    let sub_c: Hsla = if selected {
        rgb(0xd9b36b).into()
    } else {
        rgba(0xa0abbccc).into()
    };

    card = card.child(
        render_hsr_card_canvas(selected)
            .size_full()
            .absolute()
            .inset_0(),
    );

    if selected {
        card = card.child(render_double_star_badge());
    } else {
        card = card.hover(|el| el.bg(rgba(0xd9b36b14)));
    }

    card.child(
        h_flex()
            .relative()
            .size_full()
            .pl_3()
            .pr_5()
            .items_center()
            .gap_2p5()
            .child(
                div()
                    .size(px(26.))
                    .flex_none()
                    .flex()
                    .items_center()
                    .justify_center()
                    .child(icon),
            )
            .child(
                v_flex()
                    .flex_1()
                    .min_w_0()
                    .gap_0()
                    .child(
                        div()
                            .text_sm()
                            .font_weight(if selected {
                                FontWeight::BOLD
                            } else {
                                FontWeight::MEDIUM
                            })
                            .text_color(text_c)
                            .truncate()
                            .child(title),
                    )
                    .child(div().text_xs().text_color(sub_c).truncate().child(subtitle)),
            ),
    )
    .on_click(on_click)
}
