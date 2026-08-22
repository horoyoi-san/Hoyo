use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{h_flex, v_flex};

use super::shared::{avatar_chip, col, thousands};
use super::{
    C_ACCENT, C_BORDER, C_CARD, C_CARD2, C_CYAN, C_GOLD, C_GREEN, C_MUTED, C_PURPLE, C_RED, C_TEXT,
    GachaPage,
};

fn date_only(s: &str) -> &str {
    s.split(' ').next().unwrap_or(s)
}

fn span(text: impl Into<SharedString>, color: u32) -> Div {
    div().text_sm().text_color(col(color)).child(text.into())
}

impl GachaPage {
    pub(super) fn total_card(&self, report: &gacha::Report) -> AnyElement {
        let jade = report.total_pulls * super::JADE_PER_PULL;
        let pct = |n: usize| -> f64 {
            if report.total_pulls > 0 {
                (n as f64 / report.total_pulls as f64 * 1000.0).round() / 10.0
            } else {
                0.0
            }
        };
        let row = |label_el: AnyElement, value: String, color: Hsla| {
            h_flex()
                .justify_between()
                .items_center()
                .child(label_el)
                .child(
                    div()
                        .text_base()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(color)
                        .child(value),
                )
        };
        let label = |t: &str| {
            div()
                .text_sm()
                .text_color(col(C_MUTED))
                .child(t.to_string())
                .into_any_element()
        };
        let icon_label = |icon: &'static str, t: &str| {
            h_flex()
                .gap_1()
                .items_center()
                .child(img(icon).size(px(18.)).flex_none())
                .child(
                    div()
                        .text_sm()
                        .text_color(col(C_MUTED))
                        .child(t.to_string()),
                )
                .into_any_element()
        };

        let mut recent: Vec<&gacha::Pull> = report
            .categories
            .iter()
            .flat_map(|c| c.five_stars.iter())
            .collect();
        recent.sort_by(|a, b| b.id.cmp(&a.id));
        let chips: Vec<AnyElement> = recent
            .iter()
            .take(5)
            .map(|p| avatar_chip(self, p, 90))
            .collect();

        v_flex()
            .flex_1()
            .min_w(px(260.))
            .p_4()
            .gap_3()
            .rounded(px(10.))
            .border_1()
            .border_color(col(C_BORDER))
            .bg(col(C_CARD2))
            .child(
                v_flex()
                    .child(
                        div()
                            .text_base()
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(col(C_TEXT))
                            .child("Total"),
                    )
                    .child(
                        h_flex()
                            .items_baseline()
                            .gap_2()
                            .child(
                                div()
                                    .text_2xl()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(col(C_TEXT))
                                    .child(report.total_pulls.to_string()),
                            )
                            .child(div().text_sm().text_color(col(C_MUTED)).child("pulls")),
                    ),
            )
            .child(
                v_flex()
                    .gap_1()
                    .child(row(
                        label("5★"),
                        format!("{} ({}%)", report.total_five, pct(report.total_five)),
                        col(C_GOLD),
                    ))
                    .child(row(
                        label("4★"),
                        format!("{} ({}%)", report.total_four, pct(report.total_four)),
                        col(C_PURPLE),
                    ))
                    .child(row(
                        icon_label("images/jade.png", "Jade"),
                        thousands(jade),
                        col(C_GREEN),
                    ))
                    .child(row(
                        icon_label("images/shard.png", "Value"),
                        format!("¥{}", thousands(jade / super::JADE_PER_YUAN)),
                        col(C_GREEN),
                    )),
            )
            .when(!chips.is_empty(), |this| {
                this.child(div().text_sm().text_color(col(C_MUTED)).child("Recent 5★"))
                    .child(h_flex().gap_2().flex_wrap().children(chips))
            })
            .into_any_element()
    }
}

pub(super) fn tags_row(page: &GachaPage, report: &gacha::Report) -> AnyElement {
    let t = &report.tags;
    let pull_tag = |label: &str, p: &Option<gacha::Pull>, color: Hsla| -> AnyElement {
        let body: AnyElement = match p {
            Some(p) => h_flex()
                .gap_2()
                .items_center()
                .child(page.avatar(p, 48.))
                .child(
                    v_flex()
                        .min_w_0()
                        .child(
                            div()
                                .text_base()
                                .truncate()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(color)
                                .child(p.item_name.clone()),
                        )
                        .child(
                            div()
                                .text_sm()
                                .text_color(col(C_MUTED))
                                .child(format!("pity {}", p.pity)),
                        ),
                )
                .into_any_element(),
            None => div()
                .text_base()
                .text_color(col(C_MUTED))
                .child("—")
                .into_any_element(),
        };
        v_flex()
            .flex_1()
            .min_w_0()
            .p_3()
            .gap_2()
            .rounded(px(10.))
            .border_1()
            .border_color(col(C_BORDER))
            .bg(col(C_CARD))
            .child(
                div()
                    .text_sm()
                    .text_color(col(C_MUTED))
                    .child(label.to_string()),
            )
            .child(body)
            .into_any_element()
    };

    let crazy: AnyElement = {
        let (d, n) = t.craziest_day.clone().unwrap_or_else(|| ("—".into(), 0));
        v_flex()
            .flex_1()
            .min_w_0()
            .p_3()
            .gap_2()
            .rounded(px(10.))
            .border_1()
            .border_color(col(C_BORDER))
            .bg(col(C_CARD))
            .child(
                div()
                    .text_sm()
                    .text_color(col(C_MUTED))
                    .child("Craziest day"),
            )
            .child(
                v_flex()
                    .child(
                        div()
                            .text_base()
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(col(C_ACCENT))
                            .child(if n > 0 {
                                format!("{n} pulls")
                            } else {
                                "—".into()
                            }),
                    )
                    .child(div().text_sm().text_color(col(C_MUTED)).child(d)),
            )
            .into_any_element()
    };

    h_flex()
        .gap_3()
        .w_full()
        .items_stretch()
        .child(pull_tag("Recent 5★", &t.recent, col(C_CYAN)))
        .child(pull_tag("Luckiest 5★", &t.luckiest, col(C_GREEN)))
        .child(pull_tag("Unluckiest 5★", &t.unluckiest, col(C_RED)))
        .child(crazy)
        .into_any_element()
}

pub(super) fn bottom_summary(report: &gacha::Report) -> AnyElement {
    let jade = report.total_pulls * super::JADE_PER_PULL;
    let range = match (&report.start_time, &report.end_time) {
        (Some(s), Some(e)) => Some((date_only(s).to_string(), date_only(e).to_string())),
        _ => None,
    };

    v_flex()
        .gap_1()
        .pt_1()
        .child(
            h_flex()
                .gap_2()
                .items_center()
                .flex_wrap()
                .child(span("Total Warp", C_MUTED))
                .child(span(report.total_pulls.to_string(), C_GREEN))
                .child(span("Times  ·", C_MUTED))
                .child(img("images/jade.png").size(px(18.)).flex_none())
                .child(span(thousands(jade), C_GREEN))
                .child(span("Jade  ·", C_MUTED))
                .child(img("images/shard.png").size(px(18.)).flex_none())
                .child(span(
                    format!("¥{}", thousands(jade / super::JADE_PER_YUAN)),
                    C_GREEN,
                )),
        )
        .when_some(range, |this, (s, e)| {
            this.child(
                h_flex()
                    .gap_1()
                    .items_center()
                    .child(span("Records", C_MUTED))
                    .child(span(s, C_GREEN))
                    .child(span("—", C_MUTED))
                    .child(span(e, C_GREEN)),
            )
        })
        .child(
            h_flex()
                .flex_wrap()
                .items_center()
                .gap_1()
                .child(span("Click the banner's ", C_MUTED))
                .child(span("history", C_GREEN))
                .child(span(" in-game to get the ", C_MUTED))
                .child(span("full record", C_GREEN))
                .child(span(", up to ", C_MUTED))
                .child(span("12 months", C_GREEN))
                .child(span(". Records older than ", C_MUTED))
                .child(span("12 months", C_RED))
                .child(span(" will be deleted by the official.", C_RED)),
        )
        .into_any_element()
}
