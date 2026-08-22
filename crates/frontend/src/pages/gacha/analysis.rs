use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{h_flex, v_flex};

use gacha::PullOdds;

use super::shared::{bar_fill, col, date_only, warp_badge};
use super::{
    C_BORDER, C_CARD, C_GOLD, C_GREEN, C_MUTED, C_ORANGE, C_PURPLE, C_TEXT, C_TRACK, GachaPage,
};

impl GachaPage {
    pub(super) fn analysis_view(&self, cx: &mut Context<Self>) -> AnyElement {
        let mut columns: Vec<AnyElement> = Vec::new();
        if let Some(report) = &self.report {
            for c in &report.categories {
                columns.push(self.category_card(c, cx));
            }
        }
        if columns.is_empty() {
            return div().into_any_element();
        }
        div()
            .id("gacha-columns")
            .size_full()
            .overflow_x_scroll()
            .child(h_flex().h_full().gap_3().children(columns))
            .into_any_element()
    }

    fn category_card(&self, c: &gacha::CategoryReport, cx: &mut Context<Self>) -> AnyElement {
        let gt = c.category.gacha_type();
        let tab = self.tabs.get(&gt).copied().unwrap_or(0);

        let pct = |n: usize| -> f64 {
            if c.total > 0 {
                (n as f64 / c.total as f64 * 1000.0).round() / 10.0
            } else {
                0.0
            }
        };
        let date_range = match (&c.start_time, &c.end_time) {
            (Some(s), Some(e)) => format!("{} – {}", date_only(s), date_only(e)),
            _ => String::new(),
        };

        let (list, bar_max, current): (&[gacha::Pull], u32, u32) = if tab == 1 {
            (&c.four_stars, 10, c.current_four_pity)
        } else {
            (&c.five_stars, c.category.max_pity().max(1), c.current_pity)
        };

        let stat_row = |label: &str, value: String, color: Hsla| {
            h_flex()
                .justify_between()
                .items_center()
                .child(
                    div()
                        .text_sm()
                        .text_color(col(C_MUTED))
                        .child(label.to_string()),
                )
                .child(div().text_sm().text_color(color).child(value))
        };

        let cur_ratio = (current as f32 / bar_max.max(1) as f32).clamp(0.04, 1.0);
        let pity_bar = div()
            .relative()
            .w_full()
            .h(px(34.))
            .rounded(px(6.))
            .overflow_hidden()
            .bg(col(C_TRACK))
            .child(
                div()
                    .absolute()
                    .top_0()
                    .bottom_0()
                    .left_0()
                    .w(relative(cur_ratio))
                    .bg(col(C_ORANGE).opacity(0.5)),
            )
            .child({
                let PullOdds { next_1, next_10 } = self.odds.get(&gt).copied().unwrap_or(PullOdds { next_1: 0.0, next_10: 0.0 });
                h_flex()
                    .relative()
                    .size_full()
                    .px_2()
                    .items_center()
                    .child(
                        div()
                            .text_sm()
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(col(C_ORANGE))
                            .child("Pity"),
                    )
                    .child(div().flex_1())
                    .child(
                        h_flex()
                            .flex_none()
                            .gap_3()
                            .items_center()
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(col(C_MUTED))
                                    .child(format!("{:.1}%  {:.1}%", next_1 * 100.0, next_10 * 100.0)),
                            )
                            .child(
                                div()
                                    .text_base()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(col(C_ORANGE))
                                    .child(current.to_string()),
                            ),
                    )
            });

        let rows: Vec<AnyElement> = list
            .iter()
            .rev()
            .map(|p| {
                let ratio = (p.pity as f32 / bar_max.max(1) as f32).clamp(0.05, 1.0);
                let fill = bar_fill(ratio);
                h_flex()
                    .gap_2()
                    .items_center()
                    .child(self.avatar(p, 48.))
                    .child(
                        div()
                            .flex_1()
                            .min_w_0()
                            .relative()
                            .h(px(40.))
                            .rounded(px(6.))
                            .overflow_hidden()
                            .bg(col(C_TRACK))
                            .child(
                                div()
                                    .absolute()
                                    .top_0()
                                    .bottom_0()
                                    .left_0()
                                    .w(relative(ratio))
                                    .bg(fill.opacity(0.4)),
                            )
                            .child(
                                h_flex()
                                    .relative()
                                    .size_full()
                                    .px_2()
                                    .items_center()
                                    .justify_between()
                                    .gap_2()
                                    .child(
                                        div()
                                            .flex_1()
                                            .min_w_0()
                                            .truncate()
                                            .text_base()
                                            .text_color(col(C_TEXT))
                                            .child(p.item_name.clone()),
                                    )
                                    .child(
                                        h_flex()
                                            .flex_none()
                                            .gap_2()
                                            .items_center()
                                            .child(
                                                h_flex()
                                                    .w(px(86.))
                                                    .justify_end()
                                                    .items_center()
                                                    .gap_1()
                                                    .text_sm()
                                                    .font_weight(FontWeight::SEMIBOLD)
                                                    .when(p.is_up == Some(true), |d| {
                                                        if p.guaranteed {
                                                            d.child(
                                                                div()
                                                                    .text_color(col(C_GREEN))
                                                                    .child("Hard!"),
                                                            )
                                                            .child(
                                                                div()
                                                                    .text_color(col(C_GOLD))
                                                                    .child("UP!"),
                                                            )
                                                        } else {
                                                            d.child(
                                                                div()
                                                                    .text_color(col(C_GOLD))
                                                                    .child("UP!"),
                                                            )
                                                        }
                                                    }),
                                            )
                                            .child(
                                                div()
                                                    .w(px(30.))
                                                    .text_right()
                                                    .text_base()
                                                    .font_weight(FontWeight::SEMIBOLD)
                                                    .text_color(fill)
                                                    .child(p.pity.to_string()),
                                            ),
                                    ),
                            ),
                    )
                    .into_any_element()
            })
            .collect();

        let tab_strip = h_flex()
            .gap_4()
            .child(
                div()
                    .id(SharedString::from(format!("tab5-{gt}")))
                    .px_1()
                    .py_1()
                    .cursor_pointer()
                    .text_base()
                    .text_color(if tab == 0 { col(C_GOLD) } else { col(C_MUTED) })
                    .when(tab == 0, |d| d.border_b_2().border_color(col(C_GOLD)))
                    .child("5★")
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.tabs.insert(gt, 0);
                        cx.notify();
                    })),
            )
            .child(
                div()
                    .id(SharedString::from(format!("tab4-{gt}")))
                    .px_1()
                    .py_1()
                    .cursor_pointer()
                    .text_base()
                    .text_color(if tab == 1 { col(C_PURPLE) } else { col(C_MUTED) })
                    .when(tab == 1, |d| d.border_b_2().border_color(col(C_PURPLE)))
                    .child("4★")
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.tabs.insert(gt, 1);
                        cx.notify();
                    })),
            );

        v_flex()
            .flex_1()
            .min_w(px(300.))
            .h_full()
            .min_h_0()
            .p_3()
            .gap_2()
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
            .when(!date_range.is_empty(), |this| {
                this.child(div().text_sm().text_color(col(C_MUTED)).child(date_range))
            })
            .child(
                v_flex()
                    .gap_0p5()
                    .child(stat_row(
                        "5★ avg",
                        format!("{}", c.avg_five_pity),
                        col(C_GOLD),
                    ))
                    .child(stat_row(
                        "5★",
                        format!("{} [{}%]", c.five_count, pct(c.five_count)),
                        col(C_GOLD),
                    ))
                    .child(stat_row(
                        "4★",
                        format!("{} [{}%]", c.four_count, pct(c.four_count)),
                        col(C_PURPLE),
                    ))
                    .child(stat_row(
                        "3★",
                        format!("{} [{}%]", c.three_count, pct(c.three_count)),
                        col(C_MUTED),
                    )),
            )
            .child(tab_strip)
            .child(pity_bar)
            .child(
                v_flex()
                    .id(SharedString::from(format!("list-{gt}")))
                    .flex_1()
                    .min_h_0()
                    .gap_1()
                    .overflow_y_scroll()
                    .children(rows),
            )
            .into_any_element()
    }
}
