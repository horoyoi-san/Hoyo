use gpui::{Context, Window};

use crate::components::ui::set_json_editor_value;
use crate::pages::design::DesignPage;

impl DesignPage {
    pub(crate) fn select(&mut self, idx: usize, window: &mut Window, cx: &mut Context<Self>) {
        if self.entries.get(idx).is_none() {
            return;
        }
        if !self.open.contains(&idx) {
            self.open.push(idx);
        }
        self.activate(idx, window, cx);
    }

    pub(crate) fn activate(&mut self, idx: usize, window: &mut Window, cx: &mut Context<Self>) {
        let (is_lua, abs) = match self.entries.get(idx) {
            Some(e) => (e.is_lua, e.abs.clone()),
            None => return,
        };
        self.selected = Some(idx);

        if is_lua {
            let raw = std::fs::read_to_string(&abs)
                .unwrap_or_else(|err| format!("-- failed to read file:\n-- {err}"));
            let text = format_lua_source(&raw);
            self.lua_editor.update(cx, |state, cx| {
                state.set_value(text, window, cx);
            });
            cx.notify();
            return;
        }

        let text = if let Some(buf) = self.buffers.get(&idx) {
            buf.clone()
        } else {
            let disk = std::fs::read_to_string(&abs)
                .unwrap_or_else(|err| format!("// failed to read file:\n// {err}"));
            self.original.insert(idx, disk.clone());
            self.buffers.insert(idx, disk.clone());
            disk
        };
        self.json_editor.update(cx, |state, cx| {
            set_json_editor_value(state, text, window, cx);
        });
        cx.notify();
    }

    pub(crate) fn close_tab(&mut self, idx: usize, window: &mut Window, cx: &mut Context<Self>) {
        self.open.retain(|&i| i != idx);
        if self.selected == Some(idx) {
            if let Some(&last) = self.open.last() {
                self.activate(last, window, cx);
            } else {
                self.selected = None;
                self.json_editor.update(cx, |state, cx| {
                    set_json_editor_value(state, String::new(), window, cx);
                });
                cx.notify();
            }
        } else {
            cx.notify();
        }
    }

    pub(crate) fn on_editor_change(&mut self, cx: &mut Context<Self>) {
        let Some(active) = self.selected else {
            return;
        };
        let text = self.json_editor.read(cx).value().to_string();
        let is_dirty = self
            .original
            .get(&active)
            .is_some_and(|o| o != &text);
        self.buffers.insert(active, text);
        if is_dirty {
            self.dirty.insert(active);
        } else {
            self.dirty.remove(&active);
        }
        cx.notify();
    }
}

fn format_lua_source(src: &str) -> String {
    let config = stylua_lib::Config {
        indent_type: stylua_lib::IndentType::Spaces,
        indent_width: 4,
        ..Default::default()
    };
    match stylua_lib::format_code(src, config, None, stylua_lib::OutputVerification::None) {
        Ok(formatted) => formatted,
        Err(_) => src.to_string(),
    }
}
