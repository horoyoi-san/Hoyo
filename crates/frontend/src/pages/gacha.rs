mod analysis;
mod extra;
mod fetch;
mod overview;
mod shared;

use std::collections::HashMap;
use std::sync::Arc;

use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    button::{Button, ButtonVariants as _},
    h_flex, v_flex,
};

use crate::components::ui::gold_button_variant;

const JADE_PER_PULL: usize = 160;
const JADE_PER_YUAN: usize = 70;

const C_BG: u32 = 0x1A1A18;
const C_PANEL: u32 = 0x201F1D;
const C_CARD: u32 = 0x272623;
const C_CARD2: u32 = 0x2F2D29;
const C_BORDER: u32 = 0x3A3833;
const C_TRACK: u32 = 0x34312B;
const C_TEXT: u32 = 0xF2F0EB;
const C_MUTED: u32 = 0xC4BEB3;
const C_ACCENT: u32 = 0xD97757;
const C_GOLD: u32 = 0xE0A95C;
const C_PURPLE: u32 = 0xA683E0;
const C_GREEN: u32 = 0x7FB069;
const C_RED: u32 = 0xE0685E;
const C_ORANGE: u32 = 0xE0883C;
const C_CYAN: u32 = 0x5FC2D0;

fn col(hex: u32) -> Hsla {
    rgb(hex).into()
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum GachaView {
    Overview,
    Analysis,
}

pub struct GachaPage {
    view: GachaView,
    busy: bool,
    status: String,
    progress: Arc<gacha::Progress>,
    server: Option<gacha::Server>,
    report: Option<gacha::Report>,
    icons: HashMap<u32, Arc<RenderImage>>,
    pending_drops: Vec<Arc<RenderImage>>,
    tabs: HashMap<u32, u8>,
    odds: HashMap<u32, gacha::PullOdds>,
}

impl GachaPage {
    pub fn new(_window: &mut Window, _cx: &mut Context<Self>) -> Self {
        Self {
            view: GachaView::Overview,
            busy: false,
            status: "Open the in-game Warp history once, then click Fetch.".into(),
            progress: Arc::new(gacha::Progress::new()),
            server: None,
            report: None,
            icons: HashMap::new(),
            pending_drops: Vec::new(),
            tabs: HashMap::new(),
            odds: HashMap::new(),
        }
    }
}

impl Render for GachaPage {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        for tex in self.pending_drops.drain(..) {
            let _ = window.drop_image(tex);
        }
        let busy = self.busy;
        let status = self.status.clone();
        let view = self.view;
        let has_report = self.report.is_some();

        let view_tab = |label: &'static str, target: GachaView| {
            let selected = view == target;
            div()
                .id(SharedString::from(format!("view-{label}")))
                .px_2()
                .py_1()
                .cursor_pointer()
                .text_base()
                .font_weight(if selected {
                    FontWeight::SEMIBOLD
                } else {
                    FontWeight::NORMAL
                })
                .text_color(if selected {
                    col(C_ACCENT)
                } else {
                    col(C_MUTED)
                })
                .when(selected, |d| d.border_b_2().border_color(col(C_ACCENT)))
                .child(label)
        };

        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .bg(col(C_BG))
            .child(
                v_flex()
                    .gap_1()
                    .pb_1()
                    .child(
                        div()
                            .text_xl()
                            .font_weight(FontWeight::BOLD)
                            .text_color(col(C_TEXT))
                            .child("Gacha"),
                    )
                    .child(
                        div().text_base().text_color(col(C_MUTED)).child(
                            "Read your Warp link from disk cache, fetch records, analyze pity",
                        ),
                    ),
            )
            .child(
                h_flex()
                    .justify_between()
                    .items_center()
                    .gap_3()
                    .when(has_report && !busy, |this| {
                        this.child(
                            h_flex()
                                .gap_4()
                                .items_center()
                                .child(view_tab("Overview", GachaView::Overview).on_click(
                                    cx.listener(|this, _, _, cx| {
                                        this.view = GachaView::Overview;
                                        cx.notify();
                                    }),
                                ))
                                .child(view_tab("Analysis", GachaView::Analysis).on_click(
                                    cx.listener(|this, _, _, cx| {
                                        this.view = GachaView::Analysis;
                                        cx.notify();
                                    }),
                                )),
                        )
                    })
                    .child(div().flex_1())
                    .child(
                        div()
                            .text_sm()
                            .text_color(col(C_MUTED))
                            .child(status),
                    )
                    .child(
                        Button::new("gacha-fetch")
                            .custom(gold_button_variant(cx))
                            .label(if busy { "Fetching…" } else { "Fetch" })
                            .on_click(cx.listener(|this, _, _, cx| this.fetch(cx))),
                    ),
            )
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .rounded(px(10.))
                    .border_1()
                    .border_color(col(C_BORDER))
                    .bg(col(C_PANEL))
                    .p_3()
                    .child(if busy {
                        self.progress_card()
                    } else if has_report {
                        match view {
                            GachaView::Overview => self.overview_view(cx),
                            GachaView::Analysis => self.analysis_view(cx),
                        }
                    } else {
                        div().into_any_element()
                    }),
            )
    }
}
