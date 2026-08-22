use gpui::*;
use gpui_component::{ActiveTheme, h_flex, v_flex};
use hsr_ipc::PacketSource;

use crate::components::ui::{
    PacketTableColors, PacketTableRow, PanelExt as _, packet_header, packet_row, packet_scrollbar,
};

use super::PacketListBackdrop;

impl super::SnifferPage {
    pub(super) fn packet_list(
        &self,
        backdrop: PacketListBackdrop,
        cx: &mut Context<Self>,
    ) -> AnyElement {
        let theme = cx.theme();
        let border = theme.border;
        let c_muted = theme.muted_foreground;
        let searching = !self.filtered_query.is_empty();

        let content = match backdrop {
            PacketListBackdrop::Hidden | PacketListBackdrop::SendContext { from_id: None } => {
                v_flex()
                    .flex_1()
                    .min_w_0()
                    .min_h_0()
                    .panel(cx)
                    .child(packet_header(c_muted, border))
                    .into_any_element()
            }
            PacketListBackdrop::SendContext {
                from_id: Some(from_id),
            } => {
                let list = self.send_context_packet_table(from_id, cx);
                v_flex()
                    .flex_1()
                    .min_w_0()
                    .min_h_0()
                    .panel(cx)
                    .child(packet_header(c_muted, border))
                    .child(
                        div()
                            .flex_1()
                            .min_h_0()
                            .relative()
                            .child(list.size_full())
                            .child(packet_scrollbar(
                                "snf-send-context-scrollbar",
                                &self.send_context_scroll,
                            )),
                    )
                    .into_any_element()
            }
            PacketListBackdrop::Normal if searching => {
                // Split view: results (top third) + full-list context (bottom two
                // thirds). Clicking a result scrolls the context pane to it.
                let results =
                    self.packet_table_list("snf-results", false, true, &self.list_scroll, cx);
                let context =
                    self.packet_table_list("snf-context", true, false, &self.context_scroll, cx);
                v_flex()
                    .flex_1()
                    .min_w_0()
                    .min_h_0()
                    .gap_2()
                    .child(
                        v_flex()
                            .h(relative(1. / 3.))
                            .flex_none()
                            .min_h_0()
                            .panel(cx)
                            .child(packet_header(c_muted, border))
                            .child(
                                div()
                                    .flex_1()
                                    .min_h_0()
                                    .relative()
                                    .child(results.size_full())
                                    .child(packet_scrollbar(
                                        "snf-results-scrollbar",
                                        &self.list_scroll,
                                    )),
                            ),
                    )
                    .child(
                        v_flex()
                            .flex_1()
                            .min_h_0()
                            .panel(cx)
                            .child(packet_header(c_muted, border))
                            .child(
                                div()
                                    .flex_1()
                                    .min_h_0()
                                    .relative()
                                    .child(context.size_full())
                                    .child(packet_scrollbar(
                                        "snf-context-scrollbar",
                                        &self.context_scroll,
                                    )),
                            ),
                    )
                    .into_any_element()
            }
            PacketListBackdrop::Normal => {
                let list =
                    self.packet_table_list("snf-packets", false, false, &self.list_scroll, cx);
                v_flex()
                    .flex_1()
                    .min_w_0()
                    .min_h_0()
                    .panel(cx)
                    .child(packet_header(c_muted, border))
                    .child(
                        div()
                            .flex_1()
                            .min_h_0()
                            .relative()
                            .child(list.size_full())
                            .child(packet_scrollbar("snf-packets-scrollbar", &self.list_scroll)),
                    )
                    .into_any_element()
            }
        };

        v_flex()
            .flex_1()
            .min_w_0()
            .h_full()
            .gap_2()
            .child(
                h_flex()
                    .items_center()
                    .gap_2()
                    .child(self.toolbar(cx))
                    .child(div().flex_1())
                    .child(self.list_actions(cx)),
            )
            .child(content)
            .into_any_element()
    }

    /// Build one virtualized packet table.
    ///
    /// - `use_base`: index into `base_idx` (the search-ignored context list)
    ///   instead of `filtered_idx` (the search results).
    /// - `locate`: on row click, also scroll the context pane to that packet
    ///   (used by the search-results pane).
    fn packet_table_list(
        &self,
        id: &'static str,
        use_base: bool,
        locate: bool,
        scroll: &UniformListScrollHandle,
        cx: &mut Context<Self>,
    ) -> UniformList {
        let theme = cx.theme();
        let c_green = theme.green;
        let c_blue = theme.blue;
        let c_red = theme.red;
        let colors = PacketTableColors {
            foreground: theme.foreground,
            muted: theme.muted_foreground,
            selected: theme.list_active,
            hover: theme.list_hover,
            body: theme.foreground.opacity(0.86),
        };
        let selected = self.selected;
        let entity = cx.entity();

        let count = if use_base {
            self.base_idx.len()
        } else {
            self.filtered_idx.len()
        };

        uniform_list(id, count, move |range, _window, cx| {
            let this = entity.read(cx);
            let indices = if use_base {
                &this.base_idx
            } else {
                &this.filtered_idx
            };
            range
                .filter_map(|i| {
                    let display = i + 1;
                    let idx = *indices.get(i)?;
                    let packet = this.packets.get(idx)?;
                    let row = this.packet_rows.get(idx)?;
                    let id = packet.id;
                    let source = match packet.source {
                        PacketSource::Client => "Client".to_string(),
                        PacketSource::Server => "Server".to_string(),
                    };
                    let source_color = if packet.custom_packet {
                        c_red
                    } else {
                        match packet.source {
                            PacketSource::Client => c_green,
                            PacketSource::Server => c_blue,
                        }
                    };
                    let is_sel = selected == Some(id);
                    let ent = entity.clone();

                    Some(packet_row(
                        PacketTableRow {
                            row_id: format!("pkt-{idx}"),
                            display: display.to_string(),
                            cmd_cell_id: format!("pkt-cmd-{idx}"),
                            cmd_id: row.cmd_id_text.clone(),
                            source,
                            source_color,
                            pid_cell_id: format!("pkt-pid-{idx}"),
                            pid: row.pid_text.clone(),
                            name_cell_id: format!("pkt-name-{idx}"),
                            name: row.name.clone(),
                            len: row.len_text.clone(),
                            body: row.body_preview.clone(),
                            selected: is_sel,
                        },
                        colors,
                        move |_, _, cx| {
                            ent.update(cx, |this, cx| {
                                this.selected = Some(id);
                                if locate && let Some(pos) = this.base_position(id) {
                                    this.context_scroll
                                        .scroll_to_item(pos, ScrollStrategy::Center);
                                }
                                cx.notify();
                            });
                        },
                    ))
                })
                .collect::<Vec<_>>()
        })
        .track_scroll(scroll)
    }

    fn send_context_packet_table(&self, from_id: u64, cx: &mut Context<Self>) -> UniformList {
        let theme = cx.theme();
        let c_green = theme.green;
        let c_blue = theme.blue;
        let c_red = theme.red;
        let colors = PacketTableColors {
            foreground: theme.foreground,
            muted: theme.muted_foreground,
            selected: theme.list_active,
            hover: theme.list_hover,
            body: theme.foreground.opacity(0.86),
        };
        let selected = self.selected;
        let entity = cx.entity();
        let indices: std::rc::Rc<[usize]> = self
            .packets
            .iter()
            .position(|packet| packet.id == from_id).map_or_else(|| std::rc::Rc::from(Vec::<usize>::new()), |start| {
                std::rc::Rc::from(
                    (start..self.packets.len())
                        .filter(|&index| {
                            self.packets
                                .get(index)
                                .is_some_and(|packet| !self.excluded.contains(&packet.cmd_id))
                        })
                        .collect::<Vec<_>>(),
                )
            });
        let count = indices.len();

        uniform_list("snf-send-context", count, move |range, _window, cx| {
            let this = entity.read(cx);
            range
                .filter_map(|i| {
                    let idx = *indices.get(i)?;
                    let display = idx + 1;
                    let packet = this.packets.get(idx)?;
                    let row = this.packet_rows.get(idx)?;
                    let id = packet.id;
                    let source = match packet.source {
                        PacketSource::Client => "Client".to_string(),
                        PacketSource::Server => "Server".to_string(),
                    };
                    let source_color = if packet.custom_packet {
                        c_red
                    } else {
                        match packet.source {
                            PacketSource::Client => c_green,
                            PacketSource::Server => c_blue,
                        }
                    };
                    let is_sel = selected == Some(id);
                    let ent = entity.clone();

                    Some(packet_row(
                        PacketTableRow {
                            row_id: format!("send-context-pkt-{idx}"),
                            display: display.to_string(),
                            cmd_cell_id: format!("send-context-cmd-{idx}"),
                            cmd_id: row.cmd_id_text.clone(),
                            source,
                            source_color,
                            pid_cell_id: format!("send-context-pid-{idx}"),
                            pid: row.pid_text.clone(),
                            name_cell_id: format!("send-context-name-{idx}"),
                            name: row.name.clone(),
                            len: row.len_text.clone(),
                            body: row.body_preview.clone(),
                            selected: is_sel,
                        },
                        colors,
                        move |_, _, cx| {
                            ent.update(cx, |this, cx| {
                                this.selected = Some(id);
                                cx.notify();
                            });
                        },
                    ))
                })
                .collect::<Vec<_>>()
        })
        .track_scroll(&self.send_context_scroll)
    }
}
