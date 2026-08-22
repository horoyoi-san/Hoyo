use std::time::Duration;

use gpui::{App, Context, Div, FontWeight, ParentElement, SharedString, Styled, div, rgba};
use gpui_component::{ActiveTheme, h_flex, v_flex};
use hsr_ipc::BackendEvent;
use smol::Timer;

pub fn page_header(
    title: impl Into<SharedString>,
    subtitle: impl Into<SharedString>,
    cx: &App,
) -> Div {
    let title: SharedString = title.into();
    let subtitle: SharedString = subtitle.into();
    v_flex()
        .gap_1()
        .pb_2()
        .child(
            h_flex()
                .items_center()
                .gap_2()
                .child(
                    div()
                        .text_sm()
                        .text_color(crate::theme::gold_strong())
                        .child("✦"),
                )
                .child(
                    div()
                        .text_xl()
                        .font_weight(FontWeight::BOLD)
                        .text_color(cx.theme().foreground)
                        .child(title),
                ),
        )
        .child(
            div()
                .text_sm()
                .text_color(cx.theme().muted_foreground)
                .child(subtitle),
        )
}

pub fn hsr_star(size_px: f32, color: gpui::Hsla) -> impl gpui::IntoElement {
    gpui::svg()
        .path("icons/hsr_star.svg")
        .text_color(color)
        .size(gpui::px(size_px))
        .flex_none()
}

pub fn hsr_corner_badge() -> impl gpui::IntoElement {
    crate::components::ui::hsr_corner_stars()
}

pub fn card(_cx: &App) -> Div {
    v_flex()
        .p_4()
        .gap_2()
        .rounded(gpui::px(6.))
        .border_1()
        .border_color(rgba(0xffffff1a))
        .bg(rgba(0x141824cc))
        .shadow_sm()
}

pub fn spawn_event_bridge<V: 'static>(
    cx: &mut Context<V>,
    mut handler: impl FnMut(&mut V, &BackendEvent, &mut Context<V>) + 'static,
) {
    let (tx, rx) = std::sync::mpsc::channel::<BackendEvent>();

    std::thread::spawn(move || {
        for event in crate::ipc::subscribe() {
            if tx.send(event).is_err() {
                break;
            }
        }
    });

    cx.spawn(async move |this, cx| {
        loop {
            Timer::after(Duration::from_millis(16)).await;
            let alive = this
                .update(cx, |view, cx| {
                    let mut changed = false;
                    while let Ok(event) = rx.try_recv() {
                        handler(view, &event, cx);
                        changed = true;
                    }
                    if changed {
                        cx.notify();
                    }
                })
                .is_ok();
            if !alive {
                break;
            }
        }
    })
    .detach();
}
