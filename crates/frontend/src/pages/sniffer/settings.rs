use gpui::{prelude::FluentBuilder as _, *};
use gpui_component::{
    ActiveTheme, IconName, Sizable as _, WindowExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::InputState,
    v_flex,
};

use crate::components::ui::{PanelExt as _, badge_chip, removable_chip, section_title};

impl super::SnifferPage {
    pub(super) fn settings_dialog(&self, cx: &mut Context<Self>) -> AnyElement {
        Button::new("snf-settings")
            .ghost()
            .small()
            .icon(IconName::Settings)
            .tooltip("Settings")
            .on_click(cx.listener(|this, _, window, cx| {
                let weak = cx.entity().downgrade();
                let add_filter = this.add_filter.clone();
                let add_hook = this.add_hook.clone();
                window.open_dialog(cx, move |dialog, window, _cx| {
                    let weak = weak.clone();
                    let add_filter = add_filter.clone();
                    let add_hook = add_hook.clone();
                    dialog
                        .title("Settings")
                        .w(px(560.))
                        .margin_top(super::utils::centered_top(window, 440.))
                        .content(move |content, _window, cx| {
                            content.child(settings_body(&weak, &add_filter, &add_hook, cx))
                        })
                });
            }))
            .into_any_element()
    }
}

fn settings_body(
    weak: &WeakEntity<super::SnifferPage>,
    add_filter: &Entity<InputState>,
    add_hook: &Entity<InputState>,
    cx: &App,
) -> Div {
    use super::sniff_file;
    let theme = cx.theme();
    let Some(entity) = weak.upgrade() else {
        return v_flex();
    };
    let this = entity.read(cx);
    let cheat_hooks = crate::cheat::service::cheat_hooks();

    let proto_name = crate::proto::store::name();
    let loading = this.proto_loading;
    let has_proto = proto_name.is_some();
    let proto_box = div()
        .flex_1()
        .min_w_0()
        .truncate()
        .px(px(10.))
        .py(px(6.))
        .panel(cx)
        .bg(theme.secondary)
        .text_sm()
        .text_color(if has_proto {
            theme.foreground
        } else {
            theme.muted_foreground
        })
        .child(if loading {
            "Loading proto…".to_string()
        } else {
            proto_name.unwrap_or_else(|| "No proto loaded".into())
        });

    let upload_weak = weak.clone();
    let delete_weak = weak.clone();
    let proto_section = v_flex().gap_2().child(section_title("Protos", cx)).child(
        h_flex()
            .gap_2()
            .items_center()
            .child(proto_box)
            .child(
                Button::new("settings-upload-proto")
                    .icon(IconName::ArrowUp)
                    .label("Upload proto")
                    .on_click(move |_, _window, cx: &mut App| {
                        let weak = upload_weak.clone();
                        cx.spawn(async move |cx| {
                            if let Some(handle) = rfd::AsyncFileDialog::new()
                                .add_filter("proto", &["proto"])
                                .pick_file()
                                .await
                            {
                                let path = handle.path().to_path_buf();
                                let _ = weak.update(cx, |this, cx| {
                                    this.proto_loading = true;
                                    cx.notify();
                                });

                                let load_task = cx
                                    .background_executor()
                                    .spawn(async move { crate::proto::store::load(&path) });

                                if let Err(error) = load_task.await {
                                    log::error!("[Proto] upload failed: {error:#}");
                                    let _ = weak.update(cx, |this, cx| {
                                        this.proto_loading = false;
                                        cx.notify();
                                    });
                                    return;
                                }

                                crate::cheat::service::refresh_hooks();

                                let snapshot = weak
                                    .update(cx, |this, cx| {
                                        this.refresh_send_names();
                                        cx.notify();
                                        this.redecode_snapshot()
                                    })
                                    .unwrap_or_default();

                                let decode_task = cx.background_executor().spawn(async move {
                                    super::SnifferPage::decode_snapshot(snapshot)
                                });
                                let results = decode_task.await;

                                let _ = weak.update(cx, |this, cx| {
                                    this.apply_redecode_results(results);
                                    this.proto_loading = false;
                                    cx.notify();
                                });
                            }
                        })
                        .detach();
                    }),
            )
            .when(has_proto, |row| {
                row.child(
                    Button::new("settings-delete-proto")
                        .danger()
                        .icon(IconName::Delete)
                        .on_click(move |_, _window, cx: &mut App| {
                            crate::proto::store::clear();
                            crate::cheat::service::refresh_hooks();
                            let _ = delete_weak.update(cx, |this, cx| {
                                this.proto_loading = false;
                                this.redecode_all();
                                cx.notify();
                            });
                        }),
                )
            }),
    );

    let sniff_upload_weak = weak.clone();
    let sniff_section = v_flex()
        .gap_2()
        .child(section_title("Sniff files", cx))
        .child(
            Button::new("settings-upload-sniff")
                .icon(IconName::ArrowUp)
                .label("Upload Sniff")
                .on_click(move |_, _window, cx: &mut App| {
                    let weak = sniff_upload_weak.clone();
                    cx.spawn(async move |cx| {
                        let Some(handle) = rfd::AsyncFileDialog::new()
                            .add_filter("sniff", &["sniff"])
                            .pick_file()
                            .await
                        else {
                            return;
                        };

                        let path = handle.path().to_path_buf();
                        let key = path
                            .file_stem()
                            .and_then(|stem| stem.to_str())
                            .and_then(sniff_file::hex_to_key);

                        let Some(key) = key else {
                            log::error!(
                                "[Sniffer] upload failed: filename '{}' is not a valid sniff key",
                                path.display()
                            );
                            return;
                        };

                        let path_for_log = path.clone();
                        let load_task = cx
                            .background_executor()
                            .spawn(async move { sniff_file::load(&path, key) });

                        match load_task.await {
                            Ok(packets) => {
                                log::info!(
                                    "[Sniffer] loaded {} packets from {}",
                                    packets.len(),
                                    path_for_log.display()
                                );
                                let _ = weak.update(cx, |this, cx| {
                                    this.load_packets(packets, cx);
                                });
                            }
                            Err(error) => {
                                log::error!("[Sniffer] failed to load sniff: {error}");
                            }
                        }
                    })
                    .detach();
                }),
        );

    let mut filter_chips = h_flex().flex_wrap().gap_2().items_center();
    let mut excluded: Vec<u32> = this.excluded.iter().copied().collect();
    excluded.sort_unstable();
    for cmd_id in excluded {
        let name = crate::proto::store::message_name(cmd_id).unwrap_or_else(|| "Unknown".into());
        let weak = weak.clone();
        filter_chips = filter_chips.child(removable_chip(
            format!("flt-{cmd_id}"),
            name,
            cmd_id,
            move |cx| {
                let _ = weak.update(cx, |this, cx| {
                    this.excluded.remove(&cmd_id);
                    if let Some(name) = crate::proto::store::message_name(cmd_id) {
                        this.excluded_names.remove(&name);
                    }
                    this.filtered_dirty = true;
                    this.base_dirty = true;
                    cx.notify();
                });
            },
            cx,
        ));
    }
    filter_chips = filter_chips.child(plus_button(
        "settings-add-filter",
        weak.clone(),
        add_filter.clone(),
        PickerMode::Filter,
    ));
    let filter_section = v_flex()
        .gap_2()
        .child(section_title("Filtered packets", cx))
        .child(filter_chips);

    let mut hook_chips = h_flex().flex_wrap().gap_2().items_center();
    for (cmd_id, name) in &cheat_hooks {
        hook_chips = hook_chips.child(badge_chip(name.clone(), *cmd_id, "Cheat", cx));
    }
    let mut hooked: Vec<u32> = this.hooked.iter().copied().collect();
    hooked.sort_unstable();
    for cmd_id in hooked {
        let name = crate::proto::store::message_name(cmd_id).unwrap_or_else(|| "Unknown".into());
        let weak = weak.clone();
        hook_chips = hook_chips.child(removable_chip(
            format!("hk-{cmd_id}"),
            name,
            cmd_id,
            move |cx| {
                let _ = weak.update(cx, |this, cx| {
                    this.hooked.remove(&cmd_id);
                    if let Some(name) = crate::proto::store::message_name(cmd_id) {
                        this.hooked_names.remove(&name);
                    }
                    this.sync_manual_hooks();
                    cx.notify();
                });
            },
            cx,
        ));
    }
    hook_chips = hook_chips.child(plus_button(
        "settings-add-hook",
        weak.clone(),
        add_hook.clone(),
        PickerMode::Hook,
    ));
    let hook_section = v_flex()
        .gap_1()
        .child(section_title("Hooked packets", cx))
        .child(
            div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child("Dynamic interception"),
        )
        .child(div().h_2())
        .child(hook_chips);

    v_flex()
        .p_4()
        .gap_4()
        .w_full()
        .child(proto_section)
        .child(sniff_section)
        .child(filter_section)
        .child(hook_section)
}

#[derive(Clone, Copy)]
enum PickerMode {
    Filter,
    Hook,
}

// "+" button
fn plus_button(
    id: &'static str,
    weak: WeakEntity<super::SnifferPage>,
    search: Entity<InputState>,
    mode: PickerMode,
) -> impl IntoElement {
    Button::new(id)
        .ghost()
        .icon(IconName::Plus)
        .on_click(move |_, window, cx: &mut App| {
            open_packet_picker(weak.clone(), search.clone(), mode, window, cx);
        })
}

fn open_packet_picker(
    weak: WeakEntity<super::SnifferPage>,
    search: Entity<InputState>,
    mode: PickerMode,
    window: &mut Window,
    cx: &mut App,
) {
    let exclude = weak
        .upgrade()
        .map(|entity| {
            let this = entity.read(cx);
            match mode {
                PickerMode::Filter => this.excluded.clone(),
                PickerMode::Hook => this.hooked.clone(),
            }
        })
        .unwrap_or_default();
    let picker = cx.new(|cx| {
        super::picker::PacketListView::new(
            window,
            cx,
            search,
            exclude,
            move |cmd_id, window, cx| {
                let _ = weak.update(cx, |this, cx| {
                    match mode {
                        PickerMode::Filter => {
                            this.excluded.insert(cmd_id);
                            if let Some(name) = crate::proto::store::message_name(cmd_id) {
                                this.excluded_names.insert(name);
                            }
                            this.filtered_dirty = true;
                            this.base_dirty = true;
                        }
                        PickerMode::Hook => {
                            this.hooked.insert(cmd_id);
                            if let Some(name) = crate::proto::store::message_name(cmd_id) {
                                this.hooked_names.insert(name);
                            }
                            this.sync_manual_hooks();
                        }
                    }
                    cx.notify();
                });
                window.close_dialog(cx);
            },
        )
    });
    let title = match mode {
        PickerMode::Filter => "Add filtered packet",
        PickerMode::Hook => "Add hooked packet",
    };
    window.open_dialog(cx, move |dialog, window, _cx| {
        let picker = picker.clone();
        dialog
            .title(title)
            .margin_top(super::utils::centered_top(window, 496.))
            .content(move |content, _window, _cx| content.child(picker.clone()))
    });
}
