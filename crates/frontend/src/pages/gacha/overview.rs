use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{h_flex, v_flex};

use super::extra;
use super::shared::{avatar_chip, bar_fill, col, date_only, thousands, warp_badge};
use super::{
    C_BORDER, C_CARD, C_CARD2, C_CYAN, C_GOLD, C_GREEN, C_MUTED, C_PURPLE, C_TEXT, C_TRACK,
    GachaPage,
};

impl GachaPage {
    pub(super) fn overview_view(&self, _cx: &mut Context<Self>) -> AnyElement {
        let Some(report) = &self.report else {
            return div().into_any_element();
        };
        let mut cards: Vec<AnyElement> = Vec::new();
        for c in &report.categories {
            cards.push(self.overview_card(c));
        }
        cards.push(self.total_card(report));

        v_flex()
            .id("gacha-overview")
            .size_full()
            .gap_4()
            .overflow_y_scroll()
            .child(self.hero(report))
            .child(h_flex().gap_3().items_stretch().flex_wrap().children(cards))
            .child(extra::tags_row(self, report))
            .child(extra::bottom_summary(report))
            .into_any_element()
    }

    fn hero(&self, report: &gacha::Report) -> AnyElement {
        let jade = report.total_pulls * super::JADE_PER_PULL;
        let metric = |icon: Option<&'static str>, value: String, label: &str, color: Hsla| {
            v_flex()
                .gap_0p5()
                .child(
                    h_flex()
                        .gap_1()
                        .items_center()
                        .when_some(icon, |this, p| this.child(img(p).size(px(20.)).flex_none()))
                        .child(
                            div()
                                .text_lg()
                                .font_weight(FontWeight::BOLD)
                                .text_color(color)
                                .child(value),
                        ),
                )
                .child(
                    div()
                        .text_sm()
                        .text_color(col(C_MUTED))
                        .child(label.to_string()),
                )
        };
        let divider = || div().w(px(1.)).h(px(38.)).flex_none().bg(col(C_BORDER));

        let range = match (&report.start_time, &report.end_time) {
            (Some(s), Some(e)) => format!("{} — {}", date_only(s), date_only(e)),
            _ => String::new(),
        };

        h_flex()
            .w_full()
            .px_4()
            .py_3()
            .gap_5()
            .items_center()
            .rounded(px(10.))
            .border_1()
            .border_color(col(C_BORDER))
            .bg(col(C_CARD2))
            .child(
                v_flex()
                    .gap_0p5()
                    .child(
                        div()
                            .text_sm()
                            .text_color(col(C_MUTED))
                            .child(format!("UID {} · {}", report.uid, self.server_label())),
                    )
                    .child(
                        h_flex()
                            .items_baseline()
                            .gap_2()
                            .child(
                                div()
                                    .text_3xl()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(col(C_TEXT))
                                    .child(report.total_pulls.to_string()),
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(col(C_MUTED))
                                    .child("total warps"),
                            ),
                    ),
            )
            .child(divider())
            .child(metric(
                Some("images/jade.png"),
                thousands(jade),
                "jade",
                col(C_CYAN),
            ))
            .child(metric(
                Some("images/shard.png"),
                format!("¥{}", thousands(jade / super::JADE_PER_YUAN)),
                "est. value",
                col(C_TEXT),
            ))
            .child(divider())
            .child(metric(None, report.total_five.to_string(), "5★", col(C_GOLD)))
            .child(metric(None, report.total_four.to_string(), "4★", col(C_PURPLE)))
            .child(div().flex_1())
            .when(!range.is_empty(), |this| {
                this.child(
                    v_flex()
                        .items_end()
                        .gap_0p5()
                        .child(
                            div()
                                .text_sm()
                                .text_color(col(C_MUTED))
                                .child("Records"),
                        )
                        .child(div().text_base().text_color(col(C_TEXT)).child(range)),
                )
            })
            .into_any_element()
    }

    fn overview_card(&self, c: &gacha::CategoryReport) -> AnyElement {
        let event = GachaPage::is_event(c.category);
        let max = c.category.max_pity().max(1);
        let ratio = (c.current_pity as f32 / max as f32).clamp(0.04, 1.0);
        let pity_color = bar_fill(c.current_pity as f32 / max as f32);
        let pct = |n: usize| -> f64 {
            if c.total > 0 {
                (n as f64 / c.total as f64 * 1000.0).round() / 10.0
            } else {
                0.0
            }
        };
        let stat = |label: &str, value: String, color: Hsla| {
            v_flex()
                .flex_1()
                .min_w_0()
                .gap_0p5()
                .child(
                    div()
                        .text_sm()
                        .text_color(col(C_MUTED))
                        .child(label.to_string()),
                )
                .child(
                    div()
                        .text_base()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(color)
                        .child(value),
                )
        };

        let recent: Vec<AnyElement> = c
            .five_stars
            .iter()
            .rev()
            .take(5)
            .map(|p| avatar_chip(self, p, max))
            .collect();

        v_flex()
            .flex_1()
            .min_w(px(260.))
            .p_4()
            .gap_3()
            .rounded(px(10.))
            .border_1()
            .border_color(col(C_BORDER))
            .bg(col(C_CARD))
            .child(
                h_flex()
                    .gap_2()
                    .items_center()
                    .child(warp_badge(c.category))
                    .child(
                        v_flex()
                            .min_w_0()
                            .child(
                                div()
                                    .text_base()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(col(C_MUTED))
                                    .truncate()
                                    .child(c.category.name()),
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
                                            .child(c.total.to_string()),
                                    )
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(col(C_MUTED))
                                            .child("pulls"),
                                    ),
                            ),
                    ),
            )
            .child(
                v_flex()
                    .gap_1()
                    .child(
                        h_flex()
                            .justify_between()
                            .items_center()
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(col(C_MUTED))
                                    .child("Pity"),
                            )
                            .child(
                                div()
                                    .text_base()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(pity_color)
                                    .child(format!("{} / {}", c.current_pity, max)),
                            ),
                    )
                    .child(
                        div()
                            .w_full()
                            .h(px(9.))
                            .rounded(px(999.))
                            .overflow_hidden()
                            .bg(col(C_TRACK))
                            .child(
                                div()
                                    .h_full()
                                    .rounded(px(999.))
                                    .bg(pity_color)
                                    .w(relative(ratio)),
                            ),
                    ),
            )
            .child(
                h_flex()
                    .gap_2()
                    .child(stat(
                        "5★",
                        format!("{} ({}%)", c.five_count, pct(c.five_count)),
                        col(C_GOLD),
                    ))
                    .child(stat("5★ avg", format!("{}", c.avg_five_pity), col(C_TEXT)))
                    .when(event, |this| {
                        this.child(stat(
                            "UP rate",
                            format!("{}%", pct(c.up_count)),
                            col(C_GREEN),
                        ))
                    })
                    .when(!event, |this| {
                        this.child(stat("4★", format!("{}", c.four_count), col(C_PURPLE)))
                    }),
            )
            .when(!recent.is_empty(), |this| {
                this.child(
                    div()
                        .text_sm()
                        .text_color(col(C_MUTED))
                        .child("Recent 5★"),
                )
                .child(h_flex().gap_2().flex_wrap().children(recent))
            })
            .into_any_element()
    }
}
