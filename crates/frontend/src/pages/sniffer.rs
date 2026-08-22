mod inspector;
mod list;
mod model;
mod picker;
mod send;
mod settings;
mod sniff_file;
mod state;
mod toolbar;
mod utils;

use crate::components::ui::dialog_backdrop_scrim;
use gpui::{prelude::FluentBuilder as _, *};
use gpui_component::{
    WindowExt as _, h_flex,
    input::{InputEvent, InputState},
    v_flex,
};
use hsr_ipc::{BackendEvent, DecodedPacket, FrontendCommand, SnifferCommand, SnifferEvent};
use model::{
    PacketInfoCache, PacketNameEntry, PacketRowCache, all_indices, packet_row_cache,
    sorted_packet_names,
};
use std::{collections::HashSet, rc::Rc};

pub struct SnifferPage {
    packets: Vec<DecodedPacket>,
    packet_rows: Vec<PacketRowCache>,
    filtered_idx: Vec<usize>,
    filtered_query: String,
    filtered_dirty: bool,
    base_idx: Vec<usize>,
    base_dirty: bool,
    context_scroll: UniformListScrollHandle,
    selected: Option<u64>,
    last_inspected: Option<u64>,
    inspector_preview: String,
    info_cache: Option<PacketInfoCache>,
    paused: bool,
    follow: bool,
    excluded: HashSet<u32>,
    hooked: HashSet<u32>,
    excluded_names: HashSet<String>,
    hooked_names: HashSet<String>,
    list_scroll: UniformListScrollHandle,
    search: Entity<InputState>,
    inspector: Entity<InputState>,
    fullscreen: Entity<InputState>,
    send_search: Entity<InputState>,
    send_json: Entity<InputState>,
    send_names: Vec<PacketNameEntry>,
    send_filtered: Rc<[usize]>,
    send_filter_query: String,
    send_filter_dirty: bool,
    send_selected: Option<u32>,
    send_to_client: bool,
    send_dialog_open: bool,
    send_context_pending: bool,
    send_context_from: Option<u64>,
    send_context_scroll: UniformListScrollHandle,
    add_filter: Entity<InputState>,
    add_hook: Entity<InputState>,
    proto_loading: bool,
    _subscriptions: Vec<Subscription>,
}

#[derive(Clone, Copy)]
pub(super) enum PacketListBackdrop {
    Normal,
    Hidden,
    SendContext { from_id: Option<u64> },
}

impl SnifferPage {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let search =
            cx.new(|cx| InputState::new(window, cx).placeholder("Search name / body / cmd id"));
        let inspector = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("json")
                .multi_line(true)
                .soft_wrap(false)
                .scroll_beyond_last_line(Some(0))
        });
        let fullscreen = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("json")
                .multi_line(true)
                .soft_wrap(false)
                .scroll_beyond_last_line(Some(0))
        });
        let send_search =
            cx.new(|cx| InputState::new(window, cx).placeholder("Search message or CmdId…"));
        let send_json = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("json")
                .multi_line(true)
                .placeholder("{ }")
        });
        let add_filter = cx.new(|cx| InputState::new(window, cx).placeholder("cmd id / name"));
        let add_hook = cx.new(|cx| InputState::new(window, cx).placeholder("cmd id / name"));

        let search_sub = cx.subscribe_in(
            &search,
            window,
            |this, input, ev: &InputEvent, _window, cx| {
                if matches!(ev, InputEvent::Change) {
                    this.filtered_dirty = true;
                    if this.follow && input.read(cx).value().is_empty() {
                        this.list_scroll.scroll_to_bottom();
                    }
                    cx.notify();
                }
            },
        );
        let send_search_sub = cx.subscribe_in(
            &send_search,
            window,
            |this, _input, ev: &InputEvent, _window, cx| {
                if matches!(ev, InputEvent::Change) {
                    this.send_filter_dirty = true;
                    this.recompute_send_filtered(cx);
                    cx.notify();
                }
            },
        );
        crate::ui::spawn_event_bridge(cx, |this, event, _cx| {
            if let BackendEvent::Sniffer(SnifferEvent::Packet(packet)) = event {
                if let Some(request_id) = packet.request_id {
                    let body = crate::cheat::service::apply_to_packet(packet.cmd_id, &packet.body)
                        .unwrap_or_else(|| packet.body.clone());
                    crate::ipc::send(FrontendCommand::Sniffer(
                        SnifferCommand::PacketModifyResponse {
                            request_id,
                            body,
                            drop_packet: false,
                        },
                    ));
                }

                if !this.paused {
                    let mut packet = packet.clone();
                    if let Some(name) = crate::proto::store::message_name(packet.cmd_id) {
                        packet.name = Some(name);
                    }
                    if let Some(json) =
                        crate::proto::store::decode_body(packet.cmd_id, &packet.body)
                    {
                        packet.body_json = Some(json);
                    }
                    this.packets.push(packet);
                    let index = this.packets.len() - 1;
                    if this.send_dialog_open
                        && this.send_context_pending
                        && this.packets[index].custom_packet
                    {
                        this.send_context_pending = false;
                        this.send_context_from = Some(this.packets[index].id);
                        this.send_context_scroll
                            .scroll_to_item(0, ScrollStrategy::Top);
                    }
                    this.packet_rows
                        .push(packet_row_cache(&this.packets[index]));
                    let cmd_id = this.packets[index].cmd_id;
                    let excluded = this.excluded.contains(&cmd_id);

                    if !this.filtered_dirty
                        && !excluded
                        && this.packet_matches_index(index, &this.filtered_query)
                    {
                        this.filtered_idx.push(index);
                    }

                    if !this.base_dirty && !excluded {
                        this.base_idx.push(index);
                    }

                    if this.follow && this.filtered_query.is_empty() {
                        this.list_scroll.scroll_to_bottom();
                        this.context_scroll.scroll_to_bottom();
                    }
                }
            }
        });

        let (proto_tx, proto_rx) = std::sync::mpsc::channel::<()>();
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(std::time::Duration::from_millis(1000));
                let changed = matches!(crate::proto::store::reload_if_changed(), Ok(true));
                if changed && proto_tx.send(()).is_err() {
                    break;
                }
            }
        });
        cx.spawn(async move |this, cx| {
            loop {
                smol::Timer::after(std::time::Duration::from_millis(100)).await;
                let alive = this
                    .update(cx, |page, cx| {
                        let mut changed = false;
                        while proto_rx.try_recv().is_ok() {
                            changed = true;
                        }
                        if changed {
                            page.redecode_all();
                            crate::cheat::service::refresh_hooks();
                            cx.notify();
                        }
                    })
                    .is_ok();
                if !alive {
                    break;
                }
            }
        })
        .detach();

        let send_names = sorted_packet_names();
        let send_filtered = all_indices(send_names.len());

        Self {
            packets: Vec::new(),
            packet_rows: Vec::new(),
            filtered_idx: Vec::new(),
            filtered_query: String::new(),
            filtered_dirty: false,
            base_idx: Vec::new(),
            base_dirty: false,
            context_scroll: UniformListScrollHandle::new(),
            selected: None,
            last_inspected: None,
            inspector_preview: String::new(),
            info_cache: None,
            paused: false,
            follow: true,
            excluded: HashSet::new(),
            hooked: HashSet::new(),
            excluded_names: HashSet::new(),
            hooked_names: HashSet::new(),
            list_scroll: UniformListScrollHandle::new(),
            search,
            inspector,
            fullscreen,
            send_search,
            send_json,
            send_names,
            send_filtered,
            send_filter_query: String::new(),
            send_filter_dirty: false,
            send_selected: None,
            send_to_client: false,
            send_dialog_open: false,
            send_context_pending: false,
            send_context_from: None,
            send_context_scroll: UniformListScrollHandle::new(),
            add_filter,
            add_hook,
            proto_loading: false,
            _subscriptions: vec![search_sub, send_search_sub],
        }
    }
}

impl SnifferPage {
    pub(super) fn load_packets(&mut self, packets: Vec<DecodedPacket>, cx: &mut Context<Self>) {
        self.packets = packets;
        self.filtered_idx.clear();
        self.filtered_dirty = true;
        self.base_idx.clear();
        self.base_dirty = true;
        self.selected = None;
        self.last_inspected = None;
        self.info_cache = None;
        self.redecode_all();
        crate::cheat::service::refresh_hooks();
        cx.notify();
    }
}

impl Render for SnifferPage {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.recompute_filtered(cx);
        self.recompute_base();
        self.recompute_send_filtered(cx);
        self.sync_inspector(window, cx);

        let dialog_open = window.has_active_dialog(cx);
        if !dialog_open && self.send_dialog_open {
            self.end_send_dialog();
        }
        let list_backdrop = if self.send_dialog_open && dialog_open {
            PacketListBackdrop::SendContext {
                from_id: self.send_context_from,
            }
        } else if dialog_open {
            PacketListBackdrop::Hidden
        } else {
            PacketListBackdrop::Normal
        };
        let dim_background = dialog_open && !self.send_dialog_open;

        div()
            .relative()
            .size_full()
            .child(
                v_flex().size_full().p_3().gap_2().child(
                    h_flex()
                        .flex_1()
                        .min_h_0()
                        .gap_2()
                        .child(self.packet_list(list_backdrop, cx))
                        .child(self.inspector_pane(dialog_open, cx)),
                ),
            )
            .when(dim_background, |page| page.child(dialog_backdrop_scrim()))
    }
}
