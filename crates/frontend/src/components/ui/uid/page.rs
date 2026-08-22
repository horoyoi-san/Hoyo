use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{h_flex, v_flex};

use super::*;
use crate::pages::uid::UidPage;

impl UidPage {
    pub(crate) fn panel_body(&self, _cx: &mut Context<Self>) -> Option<AnyElement> {
        let entry = self.entries.get(self.selected)?;
        let panel = &entry.panel;

        let left = v_flex()
            .w(px(360.))
            .flex_none()
            .gap_3()
            .child(self.identity_card(panel))
            .child(self.lightcone_card(panel))
            .children(self.sets_card(panel))
            .children(self.score_card(panel));

        let mid = v_flex()
            .w(px(300.))
            .flex_none()
            .gap_3()
            .child(self.stats_card(panel));

        let relics = v_flex()
            .flex_1()
            .min_w_0()
            .gap_3()
            .child(
                h_flex()
                    .flex_1()
                    .w_full()
                    .gap_3()
                    .items_stretch()
                    .child(self.relic_slot_card(panel, 1))
                    .child(self.relic_slot_card(panel, 2))
                    .child(self.relic_slot_card(panel, 5)),
            )
            .child(
                h_flex()
                    .flex_1()
                    .w_full()
                    .gap_3()
                    .items_stretch()
                    .child(self.relic_slot_card(panel, 3))
                    .child(self.relic_slot_card(panel, 4))
                    .child(self.relic_slot_card(panel, 6)),
            );

        let center = h_flex()
            .flex_1()
            .min_w_0()
            .gap_3()
            .items_stretch()
            .child(mid)
            .child(relics);

        Some(
            v_flex()
                .w_full()
                .gap_3()
                .child(
                    h_flex()
                        .w_full()
                        .gap_3()
                        .items_start()
                        .child(left)
                        .child(center),
                )
                .into_any_element(),
        )
    }

    pub(crate) fn own_toggle(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let seg = |id: &'static str, label: &'static str, active: bool, cx: &mut Context<Self>| {
            div()
                .id(id)
                .px_3()
                .py(px(5.))
                .rounded(px(8.))
                .text_xs()
                .font_weight(FontWeight::SEMIBOLD)
                .when(active, |d| d.bg(col(C_GOLD)).text_color(col(C_BG)))
                .when(!active, |d| {
                    d.cursor_pointer()
                        .text_color(col(C_MUTED))
                        .on_click(cx.listener(|this, _, _, cx| this.toggle_own(cx)))
                })
                .child(label)
        };
        div().absolute().bottom(px(16.)).right(px(16.)).child(
            h_flex()
                .gap(px(3.))
                .p(px(3.))
                .rounded(px(11.))
                .border_1()
                .border_color(col(C_BORDER))
                .bg(col(C_CARD))
                .child(seg("uid-seg-others", "Others", !self.own_mode, cx))
                .child(seg("uid-seg-mine", "Mine", self.own_mode, cx)),
        )
    }
}

impl Render for UidPage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let tree = v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .bg(col(C_BG))
            .child(
                v_flex()
                    .gap_1()
                    .child(
                        div()
                            .text_xl()
                            .font_weight(FontWeight::BOLD)
                            .text_color(col(C_TEXT))
                            .child("UID Panel"),
                    )
                    .child(
                        div()
                            .text_sm()
                            .text_color(col(C_MUTED))
                            .child("Show Yours or Others"),
                    ),
            )
            .child(self.toolbar(cx))
            .child(
                div().id("uid-scroll").flex_1().overflow_y_scroll().child(
                    v_flex()
                        .gap_3()
                        .pb(px(60.))
                        .children(self.player_card(cx))
                        .when(!self.entries.is_empty(), |body| {
                            body.child(self.avatar_chips(cx))
                        })
                        .children(self.panel_body(cx)),
                ),
            );

        self.dispatch_pending_icons(cx);
        div()
            .relative()
            .size_full()
            .child(tree)
            .child(self.own_toggle(cx))
    }
}
