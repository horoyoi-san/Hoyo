use std::collections::HashSet;

use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme as _, h_flex,
    input::Input,
    v_flex,
};

use super::graph_render::{NodePalette, WirePaint, flow_node_card, paint_arrowhead, paint_wire};
use super::graph_types::*;
use crate::pages::design::DesignPage;

impl DesignPage {
    pub(crate) fn graph_canvas(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let radius = cx.theme().radius;
        let z = self.graph.zoom;
        let pan = self.graph.pan;
        let viewport_bg: Hsla = rgb(0x0e1322).into();
        let grid_color: Hsla = rgb(0x20294a).into();
        let card_bg: Hsla = rgb(0x1a2238).into();
        let fg: Hsla = rgb(0xe6eaf4).into();
        let muted: Hsla = rgb(0x8790ad).into();
        let on_accent: Hsla = rgb(0xffffff).into();
        let sel_color: Hsla = rgb(0x59c2f0).into();
        let pal = NodePalette {
            container: rgb(0xd9a441).into(),
            action: rgb(0x46506e).into(),
            predicate: rgb(0xd8485a).into(),
            card_bg,
            fg,
            muted,
            on_accent,
            sel: sel_color,
        };

        let c_seq: Hsla = rgb(0x6b768f).into();
        let c_branch: Hsla = rgb(0xd9a441).into();
        let c_ok: Hsla = rgb(0x4fbf6b).into();
        let c_fail: Hsla = rgb(0xd8485a).into();
        let c_ref: Hsla = rgb(0x59c2f0).into();
        let wires: Vec<WirePaint> = self
            .graph
            .edges
            .iter()
            .filter_map(|e| {
                let a = self.graph.nodes.get(e.from)?;
                let b = self.graph.nodes.get(e.to)?;
                let (color, is_ref) = match e.cat {
                    WireCat::Sequence => (c_seq, false),
                    WireCat::Branch => (c_branch, false),
                    WireCat::Success => (c_ok, false),
                    WireCat::Failed => (c_fail, false),
                    WireCat::Reference => (c_ref, true),
                };
                let (p0, p3) = if is_ref {
                    (
                        (a.world.x, a.world.y + a.h / 2.0),
                        (b.world.x, b.world.y + b.h / 2.0),
                    )
                } else {
                    (
                        (a.world.x + NODE_W, a.world.y + a.h / 2.0),
                        (b.world.x, b.world.y + b.h / 2.0),
                    )
                };
                Some(WirePaint {
                    p0,
                    p3,
                    is_ref,
                    color,
                })
            })
            .collect();

        let mono = cx.theme().mono_font_family.clone();
        let arrows: Vec<(f32, f32, f32, f32)> = self
            .open_editors
            .iter()
            .filter_map(|ed| {
                let n = self.graph.nodes.iter().find(|n| n.path == ed.path)?;
                Some((
                    n.world.x + NODE_W / 2.0,
                    n.world.y + n.h / 2.0,
                    ed.pos.x,
                    ed.pos.y,
                ))
            })
            .collect();
        let arrow_color: Hsla = rgb(0xc084fc).into();

        let weak = cx.entity().downgrade();
        let weak_cards = weak.clone();

        let grid = canvas(
            move |_bounds, _w, _cx| {},
            move |bounds, _state, window, _cx| {
                let ox = f32::from(bounds.origin.x);
                let oy = f32::from(bounds.origin.y);
                let w = f32::from(bounds.size.width);
                let h = f32::from(bounds.size.height);

                let thick = (1.2f32 * z).max(0.9f32);
                for wire in &wires {
                    let ax = ox + wire.p0.0 * z + pan.x;
                    let ay = oy + wire.p0.1 * z + pan.y;
                    let bx = ox + wire.p3.0 * z + pan.x;
                    let by = oy + wire.p3.1 * z + pan.y;
                    let (c1, c2) = if wire.is_ref {
                        let bulge = (60.0 + (ay - by).abs() * 0.18).min(110.0) * z;
                        ((ax - bulge, ay), (bx - bulge, by))
                    } else {
                        let dx = (bx - ax) * 0.5;
                        ((ax + dx, ay), (bx - dx, by))
                    };
                    let lo_x = ax.min(bx).min(c1.0).min(c2.0);
                    let hi_x = ax.max(bx).max(c1.0).max(c2.0);
                    let lo_y = ay.min(by);
                    let hi_y = ay.max(by);
                    if hi_x < ox || lo_x > ox + w || hi_y < oy || lo_y > oy + h {
                        continue;
                    }
                    paint_wire(window, (ax, ay), c1, c2, (bx, by), thick, wire.color);
                }

                let aw = (1.4f32 * z).max(1.0f32);
                for (wx, wy, epx, epy) in &arrows {
                    let sx = ox + wx * z + pan.x;
                    let sy = oy + wy * z + pan.y;
                    let ed_l = ox + epx;
                    let ed_r = ed_l + EDITOR_W;
                    let ed_cy = oy + epy + EDITOR_H / 2.0;
                    let (tx, ty) = if sx <= ed_l {
                        (ed_l, ed_cy)
                    } else if sx >= ed_r {
                        (ed_r, ed_cy)
                    } else {
                        (ox + epx + EDITOR_W / 2.0, oy + epy)
                    };
                    let dx = (tx - sx) * 0.5;
                    paint_wire(
                        window,
                        (sx, sy),
                        (sx + dx, sy),
                        (tx - dx, ty),
                        (tx, ty),
                        aw,
                        arrow_color,
                    );
                    paint_arrowhead(
                        window,
                        (tx, ty),
                        (tx - dx, ty),
                        arrow_color,
                        (9.0f32 * z).max(6.0f32),
                    );
                }

                let w_down = weak.clone();
                window.on_mouse_event(move |ev: &MouseDownEvent, phase, _w, cx| {
                    if phase.bubble()
                        && ev.button == MouseButton::Left
                        && bounds.contains(&ev.position)
                        && let Some(e) = w_down.upgrade()
                    {
                        let ax = f32::from(ev.position.x);
                        let ay = f32::from(ev.position.y);
                        let lx = ax - f32::from(bounds.origin.x);
                        let ly = ay - f32::from(bounds.origin.y);
                        e.update(cx, |this, _cx| this.graph_pointer_down(lx, ly, ax, ay));
                    }
                });
                let w_move = weak.clone();
                window.on_mouse_event(move |ev: &MouseMoveEvent, phase, _w, cx| {
                    if phase.bubble()
                        && ev.pressed_button == Some(MouseButton::Left)
                        && let Some(e) = w_move.upgrade()
                    {
                        let (ax, ay) = (f32::from(ev.position.x), f32::from(ev.position.y));
                        e.update(cx, |this, cx| this.graph_pointer_move(ax, ay, cx));
                    }
                });
                let w_up = weak.clone();
                window.on_mouse_event(move |ev: &MouseUpEvent, phase, _w, cx| {
                    if phase.bubble()
                        && ev.button == MouseButton::Left
                        && let Some(e) = w_up.upgrade()
                    {
                        e.update(cx, |this, _cx| this.graph_pointer_up());
                    }
                });
                let w_scroll = weak.clone();
                window.on_mouse_event(move |ev: &ScrollWheelEvent, phase, _w, cx| {
                    if phase.bubble()
                        && bounds.contains(&ev.position)
                        && let Some(e) = w_scroll.upgrade()
                    {
                        let dy = match ev.delta {
                            ScrollDelta::Lines(p) => p.y,
                            ScrollDelta::Pixels(p) => f32::from(p.y),
                        };
                        let lx = f32::from(ev.position.x) - f32::from(bounds.origin.x);
                        let ly = f32::from(ev.position.y) - f32::from(bounds.origin.y);
                        e.update(cx, |this, cx| this.graph_scroll(dy, lx, ly, cx));
                    }
                });
            },
        )
        .absolute()
        .top(px(0.))
        .left(px(0.))
        .size_full();

        let open_paths: HashSet<String> =
            self.open_editors.iter().map(|e| e.path.clone()).collect();
        let cards = self
            .graph
            .nodes
            .iter()
            .enumerate()
            .filter_map(move |(idx, node)| {
                let left = node.world.x * z + pan.x;
                let top = node.world.y * z + pan.y;
                let right = left + NODE_W * z;
                let bottom = top + node.h * z;
                if right < -CULL_MARGIN
                    || left > CULL_W + CULL_MARGIN
                    || bottom < -CULL_MARGIN
                    || top > CULL_H + CULL_MARGIN
                {
                    return None;
                }
                Some(flow_node_card(
                    idx,
                    node,
                    left,
                    top,
                    z,
                    open_paths.contains(&node.path),
                    &pal,
                    weak_cards.clone(),
                ))
            });

        let empty = self.graph.nodes.is_empty();
        let err = self.graph.error.clone();
        let truncated = self.graph.truncated;

        let zoom_pct = (self.graph.zoom * 100.0).round() as i32;
        let overlay = h_flex()
            .absolute()
            .top(px(8.))
            .right(px(8.))
            .flex_none()
            .items_center()
            .gap_2()
            .when(truncated, |r| {
                r.child(
                    div()
                        .px_2()
                        .py(px(2.))
                        .rounded(px(5.))
                        .bg(card_bg)
                        .border_1()
                        .border_color(crate::theme::gold_strong())
                        .text_xs()
                        .text_color(crate::theme::gold_strong())
                        .child(format!("graph capped at {MAX_FLOW_NODES} nodes")),
                )
            })
            .child(
                div()
                    .px_2()
                    .py(px(2.))
                    .rounded(px(5.))
                    .bg(card_bg)
                    .border_1()
                    .border_color(grid_color)
                    .text_xs()
                    .text_color(muted)
                    .child(format!("{zoom_pct}%")),
            )
            .child(
                div()
                    .id("design-graph-reset")
                    .px_2()
                    .py(px(2.))
                    .rounded(px(5.))
                    .bg(card_bg)
                    .border_1()
                    .border_color(grid_color)
                    .cursor_pointer()
                    .text_xs()
                    .text_color(fg)
                    .hover(|s| s.bg(viewport_bg))
                    .child("Reset view")
                    .on_click(cx.listener(|this, _, _w, cx| this.reset_graph_camera(cx))),
            );

        let header_bg: Hsla = rgb(0x2a3350).into();
        let body_bg: Hsla = rgb(0xffffff).into();
        let popups: Vec<_> =
            self.open_editors
                .iter()
                .enumerate()
                .map(|(i, ed)| {
                    v_flex()
                        .id(SharedString::from(format!("design-fe-{i}")))
                        .absolute()
                        .left(px(ed.pos.x))
                        .top(px(ed.pos.y))
                        .w(px(EDITOR_W))
                        .h(px(EDITOR_H))
                        .overflow_hidden()
                        .rounded(px(8.))
                        .bg(body_bg)
                        .border_2()
                        .border_color(arrow_color)
                        .child(
                            h_flex()
                                .w_full()
                                .flex_none()
                                .h(px(EDITOR_HEADER))
                                .px_2()
                                .items_center()
                                .gap_2()
                                .bg(header_bg)
                                .cursor_grab()
                                .child(
                                    div()
                                        .flex_1()
                                        .min_w_0()
                                        .truncate()
                                        .text_size(px(12.))
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(on_accent)
                                        .child(ed.title.clone()),
                                )
                                .child(
                                    div()
                                        .id(SharedString::from(format!("design-fe-apply-{i}")))
                                        .flex_none()
                                        .px_2()
                                        .py(px(2.))
                                        .rounded(px(4.))
                                        .bg(crate::theme::gold_strong())
                                        .text_xs()
                                        .text_color(on_accent)
                                        .cursor_pointer()
                                        .child("Apply")
                                        .on_click(cx.listener(move |this, _, window, cx| {
                                            this.apply_editor(i, window, cx);
                                        })),
                                )
                                .child(
                                    div()
                                        .id(SharedString::from(format!("design-fe-close-{i}")))
                                        .flex_none()
                                        .px_1()
                                        .text_color(on_accent.opacity(0.8))
                                        .cursor_pointer()
                                        .hover(|s| s.text_color(on_accent))
                                        .child("✕")
                                        .on_click(cx.listener(move |this, _, _w, cx| {
                                            this.close_editor(i, cx);
                                        })),
                                ),
                        )
                        .child(
                            div().flex_1().min_h_0().w_full().child(
                                Input::new(&ed.editor)
                                    .h_full()
                                    .bg(body_bg)
                                    .font_family(mono.clone()),
                            ),
                        )
                })
                .collect();

        div()
            .id("design-graph")
            .relative()
            .size_full()
            .overflow_hidden()
            .rounded(radius)
            .bg(viewport_bg)
            .cursor_pointer()
            .child(grid)
            .children(cards)
            .child(overlay)
            .when(empty, |c| {
                c.child(
                    div()
                        .absolute()
                        .top(px(0.))
                        .left(px(0.))
                        .size_full()
                        .flex()
                        .items_center()
                        .justify_center()
                        .child(
                            div()
                                .text_sm()
                                .text_color(muted)
                                .child(err.unwrap_or_else(|| "No graph for this file.".into())),
                        ),
                )
            })
            .children(popups)
    }
}
