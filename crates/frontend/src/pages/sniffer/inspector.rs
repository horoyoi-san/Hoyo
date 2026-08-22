use gpui::*;
use gpui_component::{
    ActiveTheme, IconName, Sizable as _, WindowExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::Input,
    v_flex,
};

use crate::components::ui::{PanelExt as _, detail_block as info_block, detail_pair as info_pair};

use super::{model::PacketInfoCache, utils};

impl super::SnifferPage {
    pub(super) fn inspector_pane(&self, dialog_open: bool, cx: &mut Context<Self>) -> AnyElement {
        let border = cx.theme().border;
        let muted = cx.theme().muted_foreground;
        let mono = cx.theme().mono_font_family.clone();
        let body_bg: Hsla = cx.theme().secondary;

        let toolbar = h_flex()
            .justify_between()
            .items_center()
            .p_1()
            .border_b_1()
            .border_color(border)
            .child(
                h_flex()
                    .gap_1()
                    .child(
                        Button::new("snf-copy")
                            .ghost()
                            .small()
                            .icon(IconName::Copy)
                            .tooltip("Copy JSON")
                            .on_click(cx.listener(|this, _, _, cx| {
                                let text = this.inspector_text();
                                cx.write_to_clipboard(ClipboardItem::new_string(text));
                            })),
                    )
                    .child(
                        Button::new("snf-b64")
                            .ghost()
                            .small()
                            .icon(IconName::File)
                            .tooltip("Copy Base64")
                            .on_click(cx.listener(|this, _, _, cx| {
                                if let Some(packet) = this.selected_packet() {
                                    let text = utils::base64_encode(&packet.body);
                                    cx.write_to_clipboard(ClipboardItem::new_string(text));
                                }
                            })),
                    ),
            )
            .child(
                h_flex()
                    .gap_1()
                    .child(
                        Button::new("snf-info")
                            .ghost()
                            .small()
                            .icon(IconName::Info)
                            .tooltip("Info")
                            .on_click(cx.listener(|this, _, window, cx| {
                                this.refresh_info_cache();
                                let weak = cx.entity().downgrade();
                                window.open_dialog(cx, move |dialog, window, _cx| {
                                    let weak = weak.clone();
                                    dialog
                                        .title("Packet Info")
                                        .margin_top(super::utils::centered_top(window, 430.))
                                        .content(move |content, _window, cx| {
                                            content.child(match weak.upgrade() {
                                                Some(entity) => {
                                                    let this = entity.read(cx);
                                                    info_content(this.info_cache.as_ref(), cx)
                                                }
                                                None => v_flex(),
                                            })
                                        })
                                });
                            })),
                    )
                    .child(
                        Button::new("snf-full")
                            .ghost()
                            .small()
                            .icon(IconName::Maximize)
                            .tooltip("Full screen")
                            .on_click(cx.listener(move |this, _, window, cx| {
                                let viewer = this.fullscreen.clone();
                                let text = this.inspector_text();
                                viewer.update(cx, |state, cx| {
                                    state.set_soft_wrap(false, window, cx);
                                    state.set_value(text, window, cx);
                                });
                                window.open_dialog(cx, move |dialog, window, _cx| {
                                    let viewer = viewer.clone();
                                    dialog
                                        .title("JSON Body")
                                        .w(px(1120.))
                                        .margin_top(super::utils::centered_top(window, 772.))
                                        .content(move |content, _window, cx| {
                                            content.child(
                                                div().h(px(720.)).w_full().child(
                                                    Input::new(&viewer)
                                                        .h_full()
                                                        .disabled(true)
                                                        .opacity(1.)
                                                        .bg(body_bg)
                                                        .font_family(
                                                            cx.theme().mono_font_family.clone(),
                                                        ),
                                                ),
                                            )
                                        })
                                });
                            })),
                    ),
            );

        v_flex()
            .w(px(520.))
            .flex_none()
            .h_full()
            .panel(cx)
            .child(toolbar)
            .child(div().flex_1().min_h_0().child(if dialog_open {
                div()
                    .size_full()
                    .overflow_hidden()
                    .p_2()
                    .bg(body_bg)
                    .font_family(mono)
                    .text_sm()
                    .text_color(muted)
                    .child(self.inspector_preview.clone())
                    .into_any_element()
            } else {
                Input::new(&self.inspector)
                    .h_full()
                    .disabled(true)
                    .opacity(1.)
                    .bg(body_bg)
                    .font_family(mono)
                    .into_any_element()
            }))
            .into_any_element()
    }
}

impl super::SnifferPage {
    pub(super) fn refresh_info_cache(&mut self) {
        let Some(packet) = self.selected_packet() else {
            self.info_cache = None;
            return;
        };

        let source = format!("{:?}", packet.source);
        let pid = utils::packet_head_pid(&packet.head);
        let cs_sc = self.paired_packet_name(pid, packet.source, packet.id);

        self.info_cache = Some(PacketInfoCache {
            name: self.resolve_name(packet),
            cmd_id: packet.cmd_id.to_string(),
            source,
            pid: pid.to_string(),
            cs_sc,
            body_len: format!("{} bytes", packet.body.len()),
            raw_head_base64: utils::base64_encode(&packet.head),
            decoded_head: utils::raw_protobuf_json(&packet.head),
        });
    }

    fn paired_packet_name(
        &self,
        pid: u64,
        source: hsr_ipc::PacketSource,
        selected_id: u64,
    ) -> String {
        if pid == 0 {
            return "-".to_string();
        }

        self.packets
            .iter()
            .find(|packet| {
                packet.id != selected_id
                    && packet.source != source
                    && utils::packet_head_pid(&packet.head) == pid
            }).map_or_else(|| "-".to_string(), |packet| {
                packet
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("<cmd:{}>", packet.cmd_id))
            })
    }
}

fn info_content(info: Option<&PacketInfoCache>, cx: &App) -> Div {
    let theme = cx.theme();
    let Some(info) = info else {
        return v_flex().p_4().child(
            div()
                .text_color(theme.muted_foreground)
                .child("Select a packet first."),
        );
    };

    v_flex()
        .p_4()
        .gap_3()
        .child(
            div()
                .text_lg()
                .font_weight(FontWeight::BOLD)
                .child(info.name.clone()),
        )
        .child(
            h_flex()
                .flex_wrap()
                .gap_4()
                .child(info_pair("CMD ID", info.cmd_id.clone(), cx))
                .child(info_pair("SOURCE", info.source.clone(), cx))
                .child(info_pair("PID", info.pid.clone(), cx))
                .child(info_pair("Cs/Sc", info.cs_sc.clone(), cx))
                .child(info_pair("BODY LEN", info.body_len.clone(), cx)),
        )
        .child(info_block(
            "RAW HEAD (base64)",
            info.raw_head_base64.clone(),
            cx,
        ))
        .child(info_block("DECODED HEAD", info.decoded_head.clone(), cx))
}
