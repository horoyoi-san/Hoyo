use gpui::*;
use gpui_component::{ActiveTheme, h_flex, switch::Switch};

use super::ConfigPage;
use hsr_ipc::FrontendCommand;

impl ConfigPage {
    pub(super) fn render_status_widget(
        &mut self,
        cx: &mut Context<Self>,
    ) -> impl IntoElement + use<> {
        let theme = cx.theme();
        let connected = crate::ipc::is_connected();
        let endpoint = hsr_ipc::endpoint();
        let status_color = if connected {
            theme.green
        } else {
            theme.muted_foreground
        };
        let status_text = if connected { "Connected" } else { "Offline" };

        div()
            .absolute()
            .top_4()
            .right_4()
            .px_3()
            .py_2()
            .rounded(px(6.))
            .border_1()
            .border_color(rgba(0xffffff1a))
            .bg(rgba(0x141824cc))
            .child(
                h_flex()
                    .gap_3()
                    .items_center()
                    .text_xs()
                    .child(
                        h_flex()
                            .gap_1p5()
                            .items_center()
                            .child(div().size(px(7.)).rounded_full().bg(status_color))
                            .child(div().text_color(theme.muted_foreground).child(status_text)),
                    )
                    .child(div().text_color(theme.muted_foreground).child(endpoint))
                    .child(
                        h_flex()
                            .gap_1p5()
                            .items_center()
                            .child(div().text_color(theme.muted_foreground).child("Dumper"))
                            .child(
                                Switch::new("cfg-dumper-corner")
                                    .checked(self.dumper_enabled)
                                    .on_click(cx.listener(|this, checked: &bool, _, cx| {
                                        this.dumper_enabled = *checked;
                                crate::ipc::send(FrontendCommand::SetDumperEnabled {
                                    enabled: *checked,
                                });
                                        cx.notify();
                                    })),
                            ),
                    ),
            )
    }
}
