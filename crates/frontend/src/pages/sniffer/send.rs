use gpui::{prelude::FluentBuilder as _, *};
use gpui_component::{
    ActiveTheme, WindowExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::{Input, InputState},
    switch::Switch,
    v_flex,
};
use hsr_ipc::{FrontendCommand, PacketSource};

use crate::components::ui::{PanelExt as _, set_json_editor_value, valid_json_editor_text};

impl super::SnifferPage {
    pub(super) fn send_dialog(&self, cx: &mut Context<Self>) -> AnyElement {
        Button::new("snf-send")
            .custom(crate::components::ui::gold_button_variant(cx))
            .label("Send")
            .on_click(cx.listener(|this, _, window, cx| {
                this.refresh_send_names();
                this.recompute_send_filtered(cx);
                this.begin_send_dialog();
                let weak = cx.entity().downgrade();
                let send_search = this.send_search.clone();
                let send_json = this.send_json.clone();
                window.open_dialog(cx, move |dialog, window, _cx| {
                    let weak = weak.clone();
                    let send_search = send_search.clone();
                    let send_json = send_json.clone();
                    dialog
                        .title("Send Packet")
                        .w(px(860.))
                        .margin_top(super::utils::centered_top(window, 572.))
                        .on_close({
                            let weak = weak.clone();
                            move |_, _window, cx| {
                                let _ = weak.update(cx, |this, cx| {
                                    this.end_send_dialog();
                                    cx.notify();
                                });
                            }
                        })
                        .content(move |content, _window, cx| {
                            content.child(send_body(&weak, &send_search, &send_json, cx))
                        })
                });
            }))
            .into_any_element()
    }
}

fn send_body(
    weak: &WeakEntity<super::SnifferPage>,
    send_search: &Entity<InputState>,
    send_json: &Entity<InputState>,
    cx: &App,
) -> Div {
    let theme = cx.theme();
    let Some(entity) = weak.upgrade() else {
        return v_flex();
    };
    let this = entity.read(cx);
    let to_client = this.send_to_client;
    let selected = this.send_selected;
    let items = this.send_filtered.clone();
    let count = items.len();

    let list_weak = weak.clone();
    let c_sel = theme.list_active;
    let c_hover = theme.list_hover;
    let c_fg = theme.foreground;
    let c_muted = theme.muted_foreground;

    let list = uniform_list("send-list", count, move |range, _window, cx| {
        let Some(entity) = list_weak.upgrade() else {
            return Vec::new();
        };
        let this = entity.read(cx);
        range
            .filter_map(|i| {
                let entry = this.send_names.get(*items.get(i)?)?;
                let cmd_id = entry.cmd_id;
                let name = entry.name.clone();
                let cmd_id_text = entry.cmd_id_text.clone();
                let is_sel = selected == Some(cmd_id);
                let ent = entity.clone();
                Some(
                    div()
                        .id(SharedString::from(format!("send-pkt-{cmd_id}")))
                        .cursor_pointer()
                        .w_full()
                        .px_2()
                        .py_1()
                        .when(is_sel, |row| row.bg(c_sel))
                        .hover(|row| row.bg(c_hover))
                        .on_click(move |_, window, cx| {
                            let json = crate::proto::store::default_json(cmd_id);
                            ent.update(cx, |this, cx| {
                                this.send_selected = Some(cmd_id);
                                if let Some(json) = json {
                                    this.send_json.update(cx, |state, cx| {
                                        set_json_editor_value(state, json, window, cx);
                                    });
                                }
                                cx.notify();
                            });
                        })
                        .child(
                            h_flex()
                                .gap_2()
                                .items_center()
                                .justify_between()
                                .child(
                                    div()
                                        .flex_1()
                                        .min_w_0()
                                        .truncate()
                                        .text_sm()
                                        .text_color(c_fg)
                                        .child(name),
                                )
                                .child(
                                    div()
                                        .flex_none()
                                        .text_xs()
                                        .text_color(c_muted)
                                        .child(cmd_id_text),
                                ),
                        )
                        .into_any_element(),
                )
            })
            .collect::<Vec<_>>()
    });

    let left = v_flex()
        .w(px(280.))
        .flex_none()
        .h_full()
        .gap_2()
        .child(Input::new(send_search))
        .child(div().flex_1().min_h_0().panel(cx).child(list.size_full()));

    let right = div().flex_1().min_w_0().h_full().panel(cx).child(
        Input::new(send_json)
            .h_full()
            .bg(theme.secondary)
            .font_family(theme.mono_font_family.clone()),
    );

    let send_weak = weak.clone();
    let send_json_for_btn = send_json.clone();
    let toggle_weak = weak.clone();

    v_flex()
        .p_4()
        .gap_3()
        .w_full()
        .child(h_flex().h(px(440.)).gap_3().child(left).child(right))
        .child(
            h_flex()
                .justify_end()
                .items_center()
                .gap_3()
                .child(
                    Switch::new("send-to-client")
                        .checked(to_client)
                        .label("Send To Client")
                        .on_click(move |checked: &bool, _window, cx: &mut App| {
                            let checked = *checked;
                            let _ = toggle_weak.update(cx, |this, cx| {
                                this.send_to_client = checked;
                                cx.notify();
                            });
                        }),
                )
                .child(
                    Button::new("send-do")
                        .custom(crate::components::ui::gold_button_variant(cx))
                        .label("Send")
                        .on_click(move |_, _window, cx: &mut App| {
                            let Some(entity) = send_weak.upgrade() else {
                                return;
                            };
                            let (cmd_id, to_client) = {
                                let this = entity.read(cx);
                                let Some(cmd_id) = this.send_selected else {
                                    return;
                                };
                                (cmd_id, this.send_to_client)
                            };
                            let Some(json) = valid_json_editor_text(&send_json_for_btn, cx) else {
                                return;
                            };
                            let Some(body) = crate::proto::store::encode_body(cmd_id, &json) else {
                                return;
                            };
                            let source = if to_client {
                                PacketSource::Server
                            } else {
                                PacketSource::Client
                            };
                            entity.update(cx, |this, cx| {
                                this.mark_send_context_pending();
                                cx.notify();
                            });
                            crate::ipc::send(FrontendCommand::SendPacket {
                                source,
                                cmd_id,
                                head: vec![],
                                body,
                            });
                        }),
                ),
        )
}
