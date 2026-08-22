use std::time::Duration;

use gpui::*;
use gpui_component::{
    ActiveTheme,
    button::{Button, ButtonVariants as _},
    h_flex,
    scroll::{ScrollableElement as _, ScrollbarAxis},
    switch::Switch,
    v_flex,
};
use hsr_ipc::{LogEntry, LogLevel};
use smol::Timer;

use crate::components::ui::{PanelExt as _, pill};

const MAX_LOGS: usize = 5000;

pub struct ConsolePage {
    logs: Vec<LogEntry>,
    scroll: UniformListScrollHandle,
    follow: bool,
    longest: usize,
    longest_len: usize,
}

impl ConsolePage {
    pub fn new(_window: &mut Window, cx: &mut Context<Self>) -> Self {
        cx.spawn(async move |this, cx| {
            loop {
                Timer::after(Duration::from_millis(150)).await;
                let alive = this
                    .update(cx, |page, cx| {
                        let new = crate::logging::drain();
                        if !new.is_empty() {
                            page.ingest(new);
                            if page.follow {
                                page.scroll.scroll_to_bottom();
                            }
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

        Self {
            logs: Vec::new(),
            scroll: UniformListScrollHandle::new(),
            follow: true,
            longest: 0,
            longest_len: 0,
        }
    }

    fn ingest(&mut self, new: Vec<LogEntry>) {
        for entry in new {
            let len = line_len(&entry);
            if len > self.longest_len {
                self.longest_len = len;
                self.longest = self.logs.len();
            }
            self.logs.push(entry);
        }
        if self.logs.len() > MAX_LOGS {
            let excess = self.logs.len() - MAX_LOGS;
            self.logs.drain(..excess);
            if self.longest >= excess {
                self.longest -= excess;
            } else {
                self.recompute_longest();
            }
        }
    }

    fn recompute_longest(&mut self) {
        self.longest = 0;
        self.longest_len = 0;
        for (i, entry) in self.logs.iter().enumerate() {
            let len = line_len(entry);
            if len > self.longest_len {
                self.longest_len = len;
                self.longest = i;
            }
        }
    }

    fn toolbar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        h_flex()
            .gap_2()
            .items_center()
            .child(
                div()
                    .text_xs()
                    .text_color(cx.theme().muted_foreground)
                    .child(format!("{} lines", self.logs.len())),
            )
            .child(div().flex_1())
            .child(
                Button::new("console-copy-all")
                    .ghost()
                    .label("Copy All")
                    .on_click(cx.listener(|this, _, _, cx| {
                        let text = this
                            .logs
                            .iter()
                            .map(format_log_entry)
                            .collect::<Vec<_>>()
                            .join("\n");
                        cx.write_to_clipboard(ClipboardItem::new_string(text));
                    })),
            )
            .child(
                Switch::new("console-follow")
                    .checked(self.follow)
                    .label("Follow")
                    .on_click(cx.listener(|this, checked: &bool, _, cx| {
                        this.follow = *checked;
                        if this.follow {
                            this.scroll.scroll_to_bottom();
                        }
                        cx.notify();
                    })),
            )
            .child(
                Button::new("console-clear")
                    .ghost()
                    .label("Clear")
                    .on_click(cx.listener(|this, _, _, cx| {
                        this.logs.clear();
                        this.longest = 0;
                        this.longest_len = 0;
                        cx.notify();
                    })),
            )
    }
}

fn line_len(entry: &LogEntry) -> usize {
    entry.target.chars().count() + entry.message.chars().count()
}

fn level_label(level: LogLevel) -> &'static str {
    match level {
        LogLevel::Error => "ERROR",
        LogLevel::Warn => "WARN",
        LogLevel::Info => "INFO",
        LogLevel::Debug => "DEBUG",
        LogLevel::Trace => "TRACE",
    }
}

fn level_color(level: LogLevel, cx: &App) -> Hsla {
    let theme = cx.theme();
    match level {
        LogLevel::Error => theme.red,
        LogLevel::Warn => theme.yellow,
        LogLevel::Info => theme.green,
        LogLevel::Debug => theme.blue,
        LogLevel::Trace => theme.muted_foreground,
    }
}

fn level_badge(level: LogLevel, color: Hsla) -> impl IntoElement {
    pill(level_label(level), color).w(px(56.)).flex_none()
}

fn format_log_entry(entry: &LogEntry) -> String {
    format!(
        "{:<5}  {}  {}",
        level_label(entry.level),
        entry.target,
        entry.message
    )
}

impl Render for ConsolePage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let foreground = theme.foreground;
        let mono = theme.mono_font_family.clone();
        let entity = cx.entity();
        let count = self.logs.len();
        let longest = self.longest.min(count.saturating_sub(1));

        if self.follow {
            let at_bottom = {
                let state = self.scroll.0.borrow();
                let offset_y = state.base_handle.offset().y;
                let max_y = state.base_handle.max_offset().y;
                offset_y <= -max_y + px(30.)
            };
            if at_bottom {
                self.scroll.scroll_to_bottom();
            }
        }

        let list = uniform_list("console-logs", count, move |range, _window, cx| {
            let this = entity.read(cx);
            range
                .filter_map(|i| {
                    let entry = this.logs.get(i)?;
                    let color = level_color(entry.level, cx);
                    Some(
                        h_flex()
                            .gap_2()
                            .items_center()
                            .px_2()
                            .py(px(1.))
                            .child(level_badge(entry.level, color))
                            .child(
                                div()
                                    .flex_none()
                                    .whitespace_nowrap()
                                    .text_color(foreground)
                                    .child(format!("{}  {}", entry.target, entry.message)),
                            )
                            .into_any_element(),
                    )
                })
                .collect::<Vec<_>>()
        })
        .with_horizontal_sizing_behavior(ListHorizontalSizingBehavior::Unconstrained)
        .with_width_from_item(Some(longest))
        .track_scroll(&self.scroll);

        v_flex()
            .size_full()
            .p_4()
            .gap_2()
            .child(crate::ui::page_header(
                "Console",
                "Live backend & frontend logs",
                cx,
            ))
            .child(self.toolbar(cx))
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .relative()
                    .panel(cx)
                    .font_family(mono)
                    .text_xs()
                    .child(list.size_full())
                    .scrollbar(&self.scroll, ScrollbarAxis::Both),
            )
    }
}
