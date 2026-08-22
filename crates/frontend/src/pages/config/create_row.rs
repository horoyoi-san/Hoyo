use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme, Disableable, IconName, Sizable as _, button::Button, h_flex, input::Input,
};

use super::ConfigPage;

impl ConfigPage {
    pub(super) fn render_create_row(
        &mut self,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement + use<> {
        let theme = cx.theme();
        let is_empty = self.new_name_input.read(cx).value().trim().is_empty();

        h_flex()
            .gap_2()
            .items_center()
            .child(div().flex_1().child(Input::new(&self.new_name_input)))
            .child(
                Button::new("cfg-save-new")
                    .small()
                    .icon(IconName::Plus)
                    .label("Save Current as New")
                    .disabled(is_empty)
                    .when(!is_empty, |btn| {
                        btn.bg(theme.primary.opacity(0.15))
                            .text_color(theme.primary)
                    })
                    .on_click(cx.listener(|this, _, window, cx| {
                        this.save_current(window, cx);
                    })),
            )
    }
}
