use gpui_component::{
    highlighter::{Diagnostic, DiagnosticSeverity},
    input::{InputState, Position},
};

use super::lua_lint::{LuaDiagnostic, LuaSeverity};

pub fn set_json_editor_value(
    state: &mut InputState,
    text: String,
    window: &mut gpui::Window,
    cx: &mut gpui::Context<InputState>,
) {
    clear_editor_diagnostics(state, cx);
    state.set_value(text, window, cx);
}

pub fn valid_json_editor_text(
    input: &gpui::Entity<InputState>,
    cx: &mut gpui::App,
) -> Option<String> {
    let text = input.read(cx).value().to_string();
    match serde_json::from_str::<serde_json::Value>(&text) {
        Ok(_) => {
            input.update(cx, clear_editor_diagnostics);
            Some(text)
        }
        Err(error) => {
            input.update(cx, |state, cx| {
                set_json_error_diagnostic(state, &text, &error, cx);
            });
            None
        }
    }
}

pub fn set_lua_diagnostics(
    state: &mut InputState,
    diagnostics: &[LuaDiagnostic],
    cx: &mut gpui::Context<InputState>,
) {
    if let Some(set) = state.diagnostics_mut() {
        set.clear();
        for d in diagnostics {
            set.push(lua_diagnostic_to_diagnostic(d));
        }
        cx.notify();
    }
}

fn clear_editor_diagnostics(state: &mut InputState, cx: &mut gpui::Context<InputState>) {
    if let Some(diagnostics) = state.diagnostics_mut() {
        diagnostics.clear();
        cx.notify();
    }
}

fn lua_diagnostic_to_diagnostic(d: &LuaDiagnostic) -> Diagnostic {
    let severity = match d.severity {
        LuaSeverity::Error => DiagnosticSeverity::Error,
        LuaSeverity::Warning => DiagnosticSeverity::Warning,
    };
    Diagnostic::new(
        Position::new(d.line, d.start_col)..Position::new(d.line, d.end_col),
        d.message.clone(),
    )
    .with_severity(severity)
    .with_source("lua")
}

fn set_json_error_diagnostic(
    state: &mut InputState,
    text: &str,
    error: &serde_json::Error,
    cx: &mut gpui::Context<InputState>,
) {
    let line = error.line().saturating_sub(1) as u32;
    let col = error.column().saturating_sub(1) as u32;
    let end = text
        .lines()
        .nth(line as usize)
        .map_or(col + 1, |line| line.chars().count() as u32)
        .max(col + 1);

    if let Some(diagnostics) = state.diagnostics_mut() {
        diagnostics.clear();
        diagnostics.push(
            Diagnostic::new(
                Position::new(line, col)..Position::new(line, end),
                format!("{error}"),
            )
            .with_severity(DiagnosticSeverity::Error),
        );
        cx.notify();
    }
}
