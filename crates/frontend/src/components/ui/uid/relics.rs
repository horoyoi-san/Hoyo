use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{h_flex, v_flex};

use super::*;
use crate::pages::uid::UidPage;
use crate::pages::uid::calc::{self, AvatarPanel, format_eff_count, format_stat_value};

impl UidPage {
    pub(crate) fn relic_slot_card(&self, panel: &AvatarPanel, slot: u32) -> AnyElement {
        match panel.relics.iter().find(|r| r.slot == slot) {
            Some(relic) => self.relic_card(relic),
            None => self.empty_relic_card(slot),
        }
    }

    fn empty_relic_card(&self, _slot: u32) -> AnyElement {
        let ring = format!("{RING_OUTLINE_URL}|{C_EMPTY:06x}");
        Self::card()
            .flex_1()
            .min_w(px(220.))
            .items_center()
            .justify_center()
            .child(
                div()
                    .relative()
                    .size(px(112.))
                    .flex()
                    .items_center()
                    .justify_center()
                    .child(self.icon_img(&ring, 112.))
                    .child(
                        div()
                            .absolute()
                            .size_full()
                            .flex()
                            .items_center()
                            .justify_center()
                            .text_3xl()
                            .text_color(col(C_TEXT))
                            .child("+"),
                    )
                    .child(
                        div()
                            .absolute()
                            .bottom(px(-8.))
                            .left_0()
                            .right_0()
                            .flex()
                            .justify_center()
                            .child(
                                div()
                                    .px_3()
                                    .rounded_full()
                                    .border_1()
                                    .border_color(col(0x635a5f))
                                    .bg(col(0x030206))
                                    .text_sm()
                                    .text_color(col(C_TEXT))
                                    .child("+0"),
                            ),
                    ),
            )
            .into_any_element()
    }

    pub(crate) fn relic_card(&self, relic: &calc::RelicPanel) -> AnyElement {
        Self::card()
            .flex_1()
            .min_w(px(220.))
            .gap_1()
            .child(
                h_flex()
                    .gap_2()
                    .items_center()
                    .child(self.icon_img(&relic.icon, 40.))
                    .child(
                        v_flex()
                            .gap(px(2.))
                            .flex_1()
                            .min_w_0()
                            .child(
                                h_flex()
                                    .justify_between()
                                    .items_center()
                                    .child(
                                        h_flex()
                                            .gap_1()
                                            .items_center()
                                            .child(self.icon_img(&relic.slot_icon, 14.))
                                            .child(
                                                div()
                                                    .text_xs()
                                                    .text_color(col(C_MUTED))
                                                    .child(self.slot_label(relic.slot)),
                                            ),
                                    )
                                    .child(
                                        div()
                                            .flex_none()
                                            .text_xs()
                                            .text_color(col(C_GOLD))
                                            .child(format!("+{}", relic.level)),
                                    ),
                            )
                            .child(
                                h_flex()
                                    .justify_between()
                                    .items_center()
                                    .gap_2()
                                    .child(
                                        h_flex()
                                            .flex_1()
                                            .min_w_0()
                                            .gap_1()
                                            .items_center()
                                            .child(self.icon_img(&relic.main_icon, 16.))
                                            .child(
                                                div()
                                                    .min_w_0()
                                                    .truncate()
                                                    .text_sm()
                                                    .font_weight(FontWeight::BOLD)
                                                    .text_color(col(C_TEXT))
                                                    .child(relic.main_name.clone()),
                                            ),
                                    )
                                    .child(
                                        div()
                                            .flex_none()
                                            .text_sm()
                                            .font_weight(FontWeight::BOLD)
                                            .text_color(col(C_GOLD))
                                            .child(format_stat_value(
                                                &relic.main_property,
                                                relic.main_value,
                                            )),
                                    ),
                            ),
                    ),
            )
            .children(relic.subs.iter().map(|sub| {
                let fg = if sub.effective {
                    col(C_TEXT)
                } else {
                    col(C_MUTED)
                };
                h_flex()
                    .items_center()
                    .gap_2()
                    .child(
                        h_flex()
                            .flex_1()
                            .min_w_0()
                            .gap_1()
                            .items_center()
                            .child(self.icon_img(&sub.icon, 14.))
                            .child(
                                div()
                                    .min_w_0()
                                    .truncate()
                                    .text_xs()
                                    .text_color(fg)
                                    .child(sub.name.clone()),
                            ),
                    )
                    .child(div().w(px(24.)).flex_none().flex().justify_center().when(
                        sub.effective,
                        |slot| {
                            slot.child(
                                div()
                                    .h(px(16.))
                                    .min_w(px(16.))
                                    .px(px(3.))
                                    .rounded_full()
                                    .border_1()
                                    .border_color(col(C_GOLD).opacity(0.6))
                                    .bg(col(C_GOLD).opacity(0.12))
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .child(
                                        div()
                                            .text_xs()
                                            .text_color(col(C_GOLD))
                                            .child(format_eff_count(sub.eff_count)),
                                    ),
                            )
                        },
                    ))
                    .child(
                        div()
                            .w(px(56.))
                            .flex_none()
                            .text_right()
                            .text_xs()
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(fg)
                            .child(format_stat_value(&sub.property, sub.value)),
                    )
            }))
            .child(div().flex_1().min_h(px(2.)))
            .child(
                h_flex()
                    .justify_between()
                    .items_center()
                    .pt_1()
                    .border_t_1()
                    .border_color(col(C_BORDER).opacity(0.6))
                    .child(
                        div()
                            .text_sm()
                            .font_weight(FontWeight::BOLD)
                            .text_color(Self::grade_color(relic.grade))
                            .child(relic.grade),
                    )
                    .child(
                        div()
                            .text_xs()
                            .text_color(col(C_MUTED))
                            .child(format!("{:.1}", relic.score)),
                    ),
            )
            .into_any_element()
    }
}
