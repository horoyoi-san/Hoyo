use gpui::*;
use gpui_component::h_flex;

use super::graph_types::*;

pub(crate) struct NodePalette {
    pub(crate) container: Hsla,
    pub(crate) action: Hsla,
    pub(crate) predicate: Hsla,
    pub(crate) card_bg: Hsla,
    pub(crate) fg: Hsla,
    pub(crate) muted: Hsla,
    pub(crate) on_accent: Hsla,
    pub(crate) sel: Hsla,
}

impl NodePalette {
    pub(crate) fn accent(&self, cat: NodeCat) -> Hsla {
        match cat {
            NodeCat::Container => self.container,
            NodeCat::Action => self.action,
            NodeCat::Predicate => self.predicate,
        }
    }
}

pub(crate) struct WirePaint {
    pub(crate) p0: (f32, f32),
    pub(crate) p3: (f32, f32),
    pub(crate) is_ref: bool,
    pub(crate) color: Hsla,
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn flow_node_card(
    idx: usize,
    node: &GraphNode,
    left: f32,
    top: f32,
    z: f32,
    selected: bool,
    pal: &NodePalette,
    weak: gpui::WeakEntity<crate::pages::design::DesignPage>,
) -> impl IntoElement + use<> {
    use gpui::prelude::FluentBuilder as _;
    use gpui_component::v_flex;

    let accent = pal.accent(node.cat);
    let border_color = if selected {
        pal.sel
    } else {
        accent.opacity(0.5)
    };

    v_flex()
        .id(SharedString::from(format!("flow-node-{idx}")))
        .absolute()
        .left(px(left))
        .top(px(top))
        .w(px(NODE_W * z))
        .h(px(node.h * z))
        .overflow_hidden()
        .rounded(px(7.0 * z))
        .bg(pal.card_bg)
        .border_color(border_color)
        .when(selected, gpui::Styled::border_2)
        .when(!selected, gpui::Styled::border_1)
        .cursor_pointer()
        .child(
            h_flex()
                .w_full()
                .flex_none()
                .h(px(HEADER_H * z))
                .px(px(8.0 * z))
                .items_center()
                .gap(px(6.0 * z))
                .bg(accent)
                .child(
                    div()
                        .flex_none()
                        .text_size(px(8.0 * z))
                        .font_weight(FontWeight::BOLD)
                        .text_color(pal.on_accent.opacity(0.75))
                        .child(node.cat.tag()),
                )
                .child(
                    div()
                        .flex_1()
                        .min_w_0()
                        .truncate()
                        .text_size(px(12.0 * z))
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(pal.on_accent)
                        .child(node.title.clone()),
                ),
        )
        .child(
            v_flex()
                .flex_1()
                .min_h_0()
                .w_full()
                .px(px(8.0 * z))
                .py(px(4.0 * z))
                .gap(px(2.0 * z))
                .children(node.fields.iter().take(MAX_FIELDS).map(|(k, v)| {
                    h_flex()
                        .w_full()
                        .items_center()
                        .justify_between()
                        .gap(px(8.0 * z))
                        .child(
                            div()
                                .flex_none()
                                .max_w(px(96.0 * z))
                                .truncate()
                                .text_size(px(10.0 * z))
                                .text_color(pal.muted)
                                .child(k.clone()),
                        )
                        .child(
                            div()
                                .flex_1()
                                .min_w_0()
                                .truncate()
                                .text_size(px(10.0 * z))
                                .text_color(pal.fg)
                                .child(v.clone()),
                        )
                })),
        )
        .on_click(move |_, window, cx| {
            if let Some(e) = weak.upgrade() {
                e.update(cx, |this, cx| this.select_node(idx, window, cx));
            }
        })
}

pub(crate) fn paint_wire(
    window: &mut Window,
    p0: (f32, f32),
    c1: (f32, f32),
    c2: (f32, f32),
    p3: (f32, f32),
    thick: f32,
    color: Hsla,
) {
    const N: usize = 20;
    let half = (thick / 2.0).max(0.5);
    let mut prev = p0;
    for i in 1..=N {
        let t = i as f32 / N as f32;
        let cur = cubic(p0, c1, c2, p3, t);
        let dx = cur.0 - prev.0;
        let dy = cur.1 - prev.1;
        let len = (dx * dx + dy * dy).sqrt();
        if len > 1e-3 {
            let nx = -dy / len * half;
            let ny = dx / len * half;
            let mut seg = Path::new(point(px(prev.0 + nx), px(prev.1 + ny)));
            seg.line_to(point(px(cur.0 + nx), px(cur.1 + ny)));
            seg.line_to(point(px(cur.0 - nx), px(cur.1 - ny)));
            seg.line_to(point(px(prev.0 - nx), px(prev.1 - ny)));
            window.paint_path(seg, color);
        }
        prev = cur;
    }
}

pub(crate) fn paint_arrowhead(
    window: &mut Window,
    tip: (f32, f32),
    from: (f32, f32),
    color: Hsla,
    size: f32,
) {
    let dx = tip.0 - from.0;
    let dy = tip.1 - from.1;
    let len = (dx * dx + dy * dy).sqrt().max(1e-3);
    let (ux, uy) = (dx / len, dy / len);
    let (nx, ny) = (-uy, ux);
    let back = (tip.0 - ux * size, tip.1 - uy * size);
    let a = (back.0 + nx * size * 0.55, back.1 + ny * size * 0.55);
    let b = (back.0 - nx * size * 0.55, back.1 - ny * size * 0.55);
    let mut p = Path::new(point(px(tip.0), px(tip.1)));
    p.line_to(point(px(a.0), px(a.1)));
    p.line_to(point(px(b.0), px(b.1)));
    window.paint_path(p, color);
}

fn cubic(p0: (f32, f32), c1: (f32, f32), c2: (f32, f32), p3: (f32, f32), t: f32) -> (f32, f32) {
    let u = 1.0 - t;
    let a = u * u * u;
    let b = 3.0 * u * u * t;
    let c = 3.0 * u * t * t;
    let d = t * t * t;
    (
        a * p0.0 + b * c1.0 + c * c2.0 + d * p3.0,
        a * p0.1 + b * c1.1 + c * c2.1 + d * p3.1,
    )
}
