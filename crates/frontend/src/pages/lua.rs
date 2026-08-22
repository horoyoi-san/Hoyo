use crate::components::ui::{PanelExt as _, lua_lint, set_lua_diagnostics};
use gpui::*;
use gpui_component::{
    ActiveTheme, Disableable as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::{Input, InputEvent, InputState, Position},
    v_flex,
};
use hsr_ipc::FrontendCommand;
use smol::Timer;
use std::time::Duration;

const CHECK_DEBOUNCE: Duration = Duration::from_millis(50);
const PLACEHOLDER: &str = "print(\"Lua Here\")";

pub struct LuaPage {
    editor: Entity<InputState>,
    diagnostics: Vec<lua_lint::LuaDiagnostic>,
    pending: Option<Task<()>>,
    #[allow(dead_code)]
    change_sub: gpui::Subscription,
}

impl LuaPage {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let editor = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("lua")
                .multi_line(true)
                .default_value(PLACEHOLDER)
        });

        let change_sub = cx.subscribe_in(
            &editor,
            window,
            |this, _input, ev: &InputEvent, _window, cx| {
                if matches!(ev, InputEvent::Change) {
                    this.schedule_check(cx);
                }
            },
        );

        let mut page = Self {
            editor,
            diagnostics: Vec::new(),
            pending: None,
            change_sub,
        };
        page.schedule_check(cx);
        page
    }

    fn schedule_check(&mut self, cx: &mut Context<Self>) {
        let text = self.editor.read(cx).value().to_string();
        let editor = self.editor.downgrade();
        let prev = self.pending.take();
        let task = cx.spawn(async move |this, cx| {
            drop(prev);
            Timer::after(CHECK_DEBOUNCE).await;
            let diags = cx
                .background_executor()
                .spawn(async move { lua_lint::check(&text) })
                .await;
            let diags: Vec<_> = diags;
            let _ = this.update(cx, |this, cx| {
                this.diagnostics = diags.clone();
                if let Some(editor) = editor.upgrade() {
                    editor.update(cx, |state, cx| {
                        set_lua_diagnostics(state, &diags, cx);
                    });
                }
                cx.notify();
            });
        });
        self.pending = Some(task);
    }

    fn has_errors(&self) -> bool {
        self.diagnostics
            .iter()
            .any(|d| d.severity == lua_lint::LuaSeverity::Error)
    }

    fn on_editor_key(&mut self, ev: &KeyDownEvent, window: &mut Window, cx: &mut Context<Self>) {
        let ks = &ev.keystroke;
        if !ks.modifiers.control {
            return;
        }
        match ks.key.as_str() {
            "s" => {
                self.format_lua(window, cx);
                cx.stop_propagation();
            }
            "/" => {
                self.toggle_comment(window, cx);
                cx.stop_propagation();
            }
            _ => {}
        }
    }

    fn format_lua(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let text = self.editor.read(cx).value().to_string();
        let config = stylua_lib::Config {
            indent_type: stylua_lib::IndentType::Spaces,
            indent_width: 4,
            ..Default::default()
        };
        let formatted =
            stylua_lib::format_code(&text, config, None, stylua_lib::OutputVerification::None);
        if let Ok(formatted) = formatted
            && formatted != text
        {
            self.replace_all(formatted, None, window, cx);
        }
    }

    fn toggle_comment(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let (text, sel) = {
            let state = self.editor.read(cx);
            (state.value().to_string(), state.selected_range())
        };
        let Some((new_text, cursor_line)) = toggle_lua_comment(&text, sel.start, sel.end) else {
            return;
        };
        self.replace_all(new_text, Some(cursor_line), window, cx);
    }

    fn replace_all(
        &mut self,
        new_text: String,
        cursor_line: Option<u32>,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        self.editor.update(cx, |state, cx| {
            let utf16_len = state.value().chars().map(char::len_utf16).sum::<usize>();
            state.replace_text_in_range(Some(0..utf16_len), &new_text, window, cx);
            if let Some(line) = cursor_line {
                state.set_cursor_position(Position::new(line, 0), window, cx);
            }
        });
        self.schedule_check(cx);
    }
}

fn toggle_lua_comment(text: &str, sel_start: usize, sel_end: usize) -> Option<(String, u32)> {
    let lines: Vec<&str> = text.split('\n').collect();
    if lines.is_empty() {
        return None;
    }

    let mut starts = Vec::with_capacity(lines.len());
    let mut acc = 0usize;
    for line in &lines {
        starts.push(acc);
        acc += line.chars().count() + 1; // + newline
    }
    let line_of = |off: usize| match starts.binary_search(&off) {
        Ok(i) => i,
        Err(i) => i.saturating_sub(1),
    };

    let first = line_of(sel_start).min(lines.len() - 1);
    let last_off = if sel_end > sel_start {
        sel_end - 1
    } else {
        sel_end
    };
    let last = line_of(last_off).clamp(first, lines.len() - 1);

    let any_uncommented = (first..=last).any(|i| {
        let trimmed = lines[i].trim_start();
        !trimmed.is_empty() && !trimmed.starts_with("--")
    });

    let mut out: Vec<String> = lines.iter().map(|s| (*s).to_string()).collect();
    for i in first..=last {
        let line = lines[i];
        if line.trim().is_empty() {
            continue;
        }
        let indent_len = line.len() - line.trim_start().len();
        let (indent, rest) = line.split_at(indent_len);
        out[i] = if any_uncommented {
            format!("{indent}-- {rest}")
        } else {
            let stripped = rest
                .strip_prefix("-- ")
                .or_else(|| rest.strip_prefix("--"))
                .unwrap_or(rest);
            format!("{indent}{stripped}")
        };
    }

    Some((out.join("\n"), first as u32))
}

impl Render for LuaPage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let error_count = self
            .diagnostics
            .iter()
            .filter(|d| d.severity == lua_lint::LuaSeverity::Error)
            .count();
        let warn_count = self
            .diagnostics
            .iter()
            .filter(|d| d.severity == lua_lint::LuaSeverity::Warning)
            .count();
        let blocked = self.has_errors();
        let theme = cx.theme();
        let mono = theme.mono_font_family.clone();
        let editor_bg = theme.secondary;

        let status = if error_count > 0 {
            (
                format!("{error_count} error(s), {warn_count} warning(s)"),
                theme.danger,
            )
        } else if warn_count > 0 {
            (format!("{warn_count} warning(s)"), theme.warning)
        } else {
            ("No issues".to_string(), theme.success)
        };

        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .child(crate::ui::page_header(
                "Lua",
                "Execute Lua scripts in the game  ·  Ctrl+S format  ·  Ctrl+/ comment",
                cx,
            ))
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .panel(cx)
                    .on_key_down(cx.listener(Self::on_editor_key))
                    .child(
                        Input::new(&self.editor)
                            .h_full()
                            .bg(editor_bg)
                            .font_family(mono),
                    ),
            )
            .child(
                h_flex()
                    .justify_between()
                    .items_center()
                    .child(div().text_color(status.1).text_sm().child(status.0))
                    .child(
                        Button::new("lua-execute")
                            .custom(crate::components::ui::gold_button_variant(cx))
                            .disabled(blocked)
                            .label(if blocked {
                                "Fix syntax errors first"
                            } else {
                                "Execute"
                            })
                            .on_click(cx.listener(|this, _, _, cx| {
                                if this.has_errors() {
                                    return;
                                }
                                let script = this.editor.read(cx).value().to_string();
                                crate::ipc::send(FrontendCommand::ExecuteLua { script });
                            })),
                    ),
            )
    }
}
