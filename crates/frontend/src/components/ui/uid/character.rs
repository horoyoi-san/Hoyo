use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{h_flex, v_flex};

use super::*;
use crate::pages::uid::UidPage;
use crate::pages::uid::calc::{AvatarPanel, format_eff_count, format_stat_value};

impl UidPage {
    pub(crate) fn identity_card(&self, panel: &AvatarPanel) -> AnyElement {
        Self::card()
            .child(
                h_flex()
                    .gap_3()
                    .items_center()
                    .child(self.icon_img(&panel.icon, 56.))
                    .child(
                        v_flex()
                            .flex_1()
                            .min_w_0()
                            .gap_1()
                            .child(
                                h_flex()
                                    .gap_2()
                                    .flex_wrap()
                                    .items_baseline()
                                    .child(
                                        div()
                                            .text_lg()
                                            .font_weight(FontWeight::BOLD)
                                            .text_color(Self::rarity_color(panel.rarity))
                                            .child(panel.name.clone()),
                                    )
                                    .child(
                                        div().flex_none().text_sm().text_color(col(C_MUTED)).child(
                                            format!("Lv.{}/{}", panel.level, panel.max_level),
                                        ),
                                    ),
                            )
                            .child(
                                h_flex()
                                    .gap_2()
                                    .flex_wrap()
                                    .items_center()
                                    .child(self.icon_img(&panel.element_icon, 18.))
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(col(C_TEXT))
                                            .child(panel.element_name.clone()),
                                    )
                                    .child(self.icon_img(&panel.path_icon, 18.))
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(col(C_TEXT))
                                            .child(panel.path_name.clone()),
                                    )
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(col(C_MUTED))
                                            .child(format!("Eidolon {}", panel.eidolon)),
                                    ),
                            ),
                    ),
            )
            .child(
                h_flex()
                    .gap_3()
                    .flex_wrap()
                    .children(panel.skills.iter().map(|skill| {
                        h_flex()
                            .gap_1()
                            .items_center()
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(col(C_MUTED))
                                    .child(skill.label.clone()),
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(if skill.plus > 0 {
                                        col(C_GOLD)
                                    } else {
                                        col(C_TEXT)
                                    })
                                    .child(if skill.plus > 0 {
                                        format!("{}+{}", skill.level, skill.plus)
                                    } else {
                                        skill.level.to_string()
                                    }),
                            )
                    })),
            )
            .into_any_element()
    }

    fn empty_lightcone_card(&self) -> AnyElement {
        Self::card()
            .items_center()
            .justify_center()
            .py_2()
            .child(self.icon_img(LIGHTCONE_EMPTY_URL, 104.))
            .into_any_element()
    }

    pub(crate) fn lightcone_card(&self, panel: &AvatarPanel) -> AnyElement {
        let Some(lc) = panel.lightcone.as_ref() else {
            return self.empty_lightcone_card();
        };
        let db = self.db.as_ref();

        let stat = |icon_key: &str, value: f64| {
            let icon = db.map(|db| db.stat_icon_url(icon_key)).unwrap_or_default();
            h_flex()
                .gap_1()
                .items_center()
                .child(self.icon_img(&icon, 14.))
                .child(
                    div()
                        .text_sm()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(col(C_TEXT))
                        .child(format!("{}", value.floor() as i64)),
                )
        };

        Self::card()
            .child(
                h_flex()
                    .gap_3()
                    .items_center()
                    .child(self.icon_img(&lc.icon, 48.))
                    .child(
                        v_flex()
                            .gap_1()
                            .child(
                                div()
                                    .text_base()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(Self::rarity_color(lc.rarity))
                                    .child(lc.name.clone()),
                            )
                            .child(
                                h_flex()
                                    .gap_2()
                                    .items_center()
                                    .child(
                                        div()
                                            .text_xs()
                                            .text_color(col(C_GOLD))
                                            .font_weight(FontWeight::SEMIBOLD)
                                            .child(format!("S{}", lc.rank)),
                                    )
                                    .child(
                                        div()
                                            .text_xs()
                                            .text_color(col(C_MUTED))
                                            .child(format!("Lv.{}", lc.level)),
                                    ),
                            )
                            .child(
                                h_flex()
                                    .gap_3()
                                    .child(stat("MaxHP", lc.hp))
                                    .child(stat("Attack", lc.atk))
                                    .child(stat("Defence", lc.def)),
                            ),
                    ),
            )
            .when(!lc.path_match, |card| {
                card.child(
                    div()
                        .text_xs()
                        .text_color(col(C_DANGER))
                        .child("Path mismatch — passive inactive"),
                )
            })
            .into_any_element()
    }

    pub(crate) fn stats_card(&self, panel: &AvatarPanel) -> AnyElement {
        Self::card()
            .flex_1()
            .gap_0()
            .children(panel.stats.iter().enumerate().map(|(index, stat)| {
                let value = format_stat_value(&stat.property, stat.total);
                let breakdown = stat.breakdown.then(|| {
                    format!(
                        "{} {}{}",
                        format_stat_value(&stat.property, stat.base),
                        if stat.added < 0.0 { "" } else { "+" },
                        format_stat_value(&stat.property, stat.added)
                    )
                });
                h_flex()
                    .justify_between()
                    .items_center()
                    .py(px(4.))
                    .when(index > 0, |row| {
                        row.border_t_1().border_color(col(C_BORDER).opacity(0.5))
                    })
                    .child(
                        h_flex()
                            .gap_2()
                            .items_center()
                            .child(self.icon_img(&stat.icon, 16.))
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(col(C_TEXT))
                                    .child(stat.name.clone()),
                            ),
                    )
                    .child(
                        h_flex()
                            .gap_2()
                            .items_center()
                            .when_some(breakdown, |row, text| {
                                row.child(div().text_xs().text_color(col(C_MUTED)).child(text))
                            })
                            .child(
                                div()
                                    .text_sm()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(col(C_TEXT))
                                    .child(value),
                            ),
                    )
            }))
            .into_any_element()
    }

    pub(crate) fn sets_card(&self, panel: &AvatarPanel) -> Option<AnyElement> {
        if panel.set_bonuses.is_empty() {
            return None;
        }
        Some(
            Self::card()
                .child(
                    div()
                        .text_xs()
                        .text_color(col(C_MUTED))
                        .child("Set Bonuses"),
                )
                .child(
                    v_flex()
                        .gap_1()
                        .children(panel.set_bonuses.iter().map(|set| {
                            h_flex()
                                .gap_2()
                                .items_center()
                                .child(self.icon_img(&set.icon, 22.))
                                .child(
                                    div()
                                        .text_sm()
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(col(C_GOLD))
                                        .child(format!("{}", set.count)),
                                )
                                .child(
                                    div()
                                        .text_sm()
                                        .text_color(col(C_TEXT))
                                        .child(set.name.clone()),
                                )
                        })),
                )
                .into_any_element(),
        )
    }

    pub(crate) fn score_card(&self, panel: &AvatarPanel) -> Option<AnyElement> {
        if panel.sub_totals.is_empty() {
            return None;
        }
        Some(
            Self::card()
                .child(
                    h_flex()
                        .gap_4()
                        .items_baseline()
                        .flex_wrap()
                        .child(
                            h_flex()
                                .gap_2()
                                .items_baseline()
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(col(C_MUTED))
                                        .child(self.tr("总分", "Score")),
                                )
                                .child(
                                    div()
                                        .text_lg()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(col(C_GOLD))
                                        .child(format!("{:.1}", panel.total_score)),
                                ),
                        )
                        .child(
                            h_flex()
                                .gap_2()
                                .items_baseline()
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(col(C_MUTED))
                                        .child(self.tr("有效副词条", "Effective rolls")),
                                )
                                .child(
                                    div()
                                        .text_lg()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(col(C_TEXT))
                                        .child(format_eff_count(panel.total_effective)),
                                ),
                        )
                        .when(!panel.scored, |row| {
                            row.child(
                                div()
                                    .text_xs()
                                    .text_color(col(C_MUTED))
                                    .child(self.tr("（无推荐数据）", "(no recommendation)")),
                            )
                        }),
                )
                .into_any_element(),
        )
    }
}
