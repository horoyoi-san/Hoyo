use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    button::{Button, ButtonVariants as _},
    h_flex,
    input::Input,
    v_flex,
};

use super::*;
use crate::pages::uid::{AvatarEntry, UidPage, transport_installed};

impl UidPage {
    pub(crate) fn toolbar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let lang_button = |page: &Self, label: &'static str, cx: &mut Context<Self>| {
            let selected = page.language == label;
            div()
                .id(SharedString::from(format!("uid-lang-{label}")))
                .px_3()
                .py(px(4.))
                .rounded(px(6.))
                .border_1()
                .border_color(if selected { col(C_GOLD) } else { col(C_BORDER) })
                .bg(if selected { col(C_GOLD) } else { col(C_CARD2) })
                .text_sm()
                .font_weight(if selected {
                    FontWeight::SEMIBOLD
                } else {
                    FontWeight::NORMAL
                })
                .text_color(if selected { col(C_BG) } else { col(C_TEXT) })
                .cursor_pointer()
                .child(label)
                .on_click(cx.listener(move |this, _, _, cx| {
                    this.set_language(label, cx);
                }))
        };

        h_flex()
            .w_full()
            .gap_2()
            .items_center()
            .when(transport_installed() && !self.own_mode, |bar| {
                bar.child(Input::new(&self.uid_input).w(px(160.)).h(px(34.)))
                    .child(
                        Button::new("uid-fetch")
                            .custom(gold_button(cx))
                            .px_4()
                            .py_2()
                            .label("Import")
                            .on_click(cx.listener(|this, _, _, cx| this.fetch_uid(cx))),
                    )
            })
            .when_some(self.status.clone(), |bar, status| {
                bar.child(div().text_sm().text_color(col(C_MUTED)).child(status))
            })
            .child(div().flex_1())
            .child(lang_button(self, "CN", cx))
            .child(lang_button(self, "EN", cx))
    }

    pub(crate) fn player_card(&self, _cx: &Context<Self>) -> Option<AnyElement> {
        let player = self.player.as_ref()?;

        let pair = |label: &'static str, value: String| {
            h_flex()
                .gap_1()
                .items_center()
                .child(div().text_xs().text_color(col(C_MUTED)).child(label))
                .child(
                    div()
                        .text_sm()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(col(C_TEXT))
                        .child(value),
                )
        };

        Some(
            Self::card()
                .child(
                    h_flex()
                        .gap_4()
                        .items_center()
                        .flex_wrap()
                        .child(
                            div()
                                .text_lg()
                                .font_weight(FontWeight::BOLD)
                                .text_color(col(C_TEXT))
                                .child(player.nickname.clone()),
                        )
                        .child(pair("UID", player.uid.to_string()))
                        .child(pair("Trailblaze Lv", player.level.to_string()))
                        .child(pair("WorldLevel", player.world_level.to_string()))
                        .child(pair("Friends", player.friend_count.to_string()))
                        .when_some(
                            player.birthday.map(|b| format!("{}/{}", b / 100, b % 100)),
                            |row, bday| row.child(pair("Birthday", bday)),
                        )
                        .child(pair("Achievements", player.achievement_count.to_string()))
                        .child(pair("Characters", player.avatar_count.to_string()))
                        .child(pair("Light Cones", player.lightcone_count.to_string()))
                        .child(pair("Simulated Universe", player.su_count.to_string())),
                )
                .when(!player.signature.is_empty(), |card| {
                    card.child(
                        div()
                            .text_sm()
                            .text_color(col(C_MUTED))
                            .child(player.signature.clone()),
                    )
                })
                .into_any_element(),
        )
    }

    pub(crate) fn avatar_chips(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let five: Vec<_> = self
            .entries
            .iter()
            .enumerate()
            .filter(|(_, e)| e.panel.rarity >= 5)
            .map(|(index, entry)| self.avatar_chip(index, entry, cx))
            .collect();
        let four: Vec<_> = self
            .entries
            .iter()
            .enumerate()
            .filter(|(_, e)| e.panel.rarity < 5)
            .map(|(index, entry)| self.avatar_chip(index, entry, cx))
            .collect();
        v_flex()
            .gap_3()
            .child(h_flex().gap_2().flex_wrap().items_start().children(five))
            .child(h_flex().gap_2().flex_wrap().items_start().children(four))
    }

    fn avatar_chip(&self, index: usize, entry: &AvatarEntry, cx: &mut Context<Self>) -> AnyElement {
        let selected = index == self.selected;
        let ring = if selected {
            col(C_GOLD)
        } else {
            Self::rarity_color(entry.panel.rarity).opacity(0.6)
        };

        let circle = div()
            .size(px(52.))
            .rounded_full()
            .overflow_hidden()
            .border_2()
            .border_color(ring)
            .bg(col(C_CARD2))
            .flex()
            .items_center()
            .justify_center();
        let circle = match self.icon_tex(&entry.panel.icon, 48.) {
            Some(tex) => circle.child(
                img(tex)
                    .size(px(48.))
                    .rounded_full()
                    .object_fit(ObjectFit::Cover),
            ),
            None => circle.child(
                div()
                    .text_base()
                    .font_weight(FontWeight::BOLD)
                    .text_color(Self::rarity_color(entry.panel.rarity))
                    .child(
                        entry
                            .panel
                            .name
                            .chars()
                            .next()
                            .map(|c| c.to_string())
                            .unwrap_or_default(),
                    ),
            ),
        };

        div()
            .id(SharedString::from(format!("uid-avatar-{index}")))
            .cursor_pointer()
            .child(
                v_flex()
                    .items_center()
                    .gap(px(3.))
                    .child(
                        div()
                            .relative()
                            .size(px(52.))
                            .child(circle)
                            .when(entry.assist, |d| {
                                d.child(
                                    div()
                                        .absolute()
                                        .top(px(0.))
                                        .right(px(0.))
                                        .size(px(11.))
                                        .rounded_full()
                                        .border_1()
                                        .border_color(col(C_BG))
                                        .bg(col(C_GOLD)),
                                )
                            })
                            .child(
                                div()
                                    .absolute()
                                    .bottom(px(-3.))
                                    .right(px(-3.))
                                    .px(px(4.))
                                    .rounded(px(5.))
                                    .border_1()
                                    .border_color(col(C_BORDER))
                                    .bg(col(C_BG))
                                    .text_xs()
                                    .text_color(col(C_TEXT))
                                    .child(entry.panel.level.to_string()),
                            ),
                    )
                    .child(
                        div()
                            .mt(px(1.))
                            .w(px(26.))
                            .h(px(3.))
                            .rounded_full()
                            .bg(if selected { col(C_GOLD) } else { col(C_BG) }),
                    ),
            )
            .on_click(cx.listener(move |this, _, _, cx| {
                this.selected = index;
                cx.notify();
            }))
            .into_any_element()
    }
}
