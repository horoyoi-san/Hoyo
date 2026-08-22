use gpui::*;
use gpui_component::input::InputState;

use super::graph_types::*;
use crate::components::ui::set_json_editor_value;
use crate::pages::design::{DesignPage, OpenEditor, ViewMode};

impl DesignPage {
    pub(crate) fn ensure_graph(&mut self) {
        if self.graph.source != self.selected {
            match self.selected {
                Some(idx) => {
                    let text = self.buffers.get(&idx).cloned().unwrap_or_default();
                    let rel = self
                        .entries
                        .get(idx)
                        .map(|e| e.rel.clone())
                        .unwrap_or_default();
                    self.graph.build(idx, &rel, &text);
                }
                None => self.graph.clear(),
            }
        }
        self.sync_editors_file();
    }

    pub(crate) fn set_view_mode(&mut self, mode: ViewMode, cx: &mut Context<Self>) {
        self.view_mode = mode;
        if mode == ViewMode::Graph {
            self.graph.source = None;
            self.ensure_graph();
        }
        cx.notify();
    }

    pub(crate) fn sync_editors_file(&mut self) {
        if self.editors_file != self.selected {
            self.open_editors.clear();
            self.editors_file = self.selected;
        }
    }

    pub(crate) fn select_node(&mut self, idx: usize, window: &mut Window, cx: &mut Context<Self>) {
        let Some(node) = self.graph.nodes.get(idx) else {
            return;
        };
        let path = node.path.clone();
        let title = if node.subtitle.is_empty() {
            node.title.clone()
        } else {
            format!("{} · {}", node.title, node.subtitle)
        };

        if let Some(p) = self.open_editors.iter().position(|e| e.path == path) {
            let ed = self.open_editors.remove(p);
            self.open_editors.push(ed);
            cx.notify();
            return;
        }

        let text = self
            .graph
            .doc
            .as_ref()
            .and_then(|d| d.pointer(&path))
            .map(|v| serde_json::to_string_pretty(v).unwrap_or_default())
            .unwrap_or_default();
        let editor = cx.new(|cx| {
            InputState::new(window, cx)
                .code_editor("json")
                .multi_line(true)
                .soft_wrap(false)
                .scroll_beyond_last_line(Some(0))
        });
        editor.update(cx, |state, cx| {
            set_json_editor_value(state, text, window, cx);
        });
        let off = (self.open_editors.len() % 6) as f32 * 28.0;
        self.editors_file = self.selected;
        self.open_editors.push(OpenEditor {
            path,
            title,
            pos: point(40.0 + off, 40.0 + off),
            editor,
        });
        cx.notify();
    }

    pub(crate) fn close_editor(&mut self, i: usize, cx: &mut Context<Self>) {
        if i < self.open_editors.len() {
            self.open_editors.remove(i);
            if self.editor_drag == Some(i) {
                self.editor_drag = None;
            }
            cx.notify();
        }
    }

    pub(crate) fn apply_editor(&mut self, i: usize, window: &mut Window, cx: &mut Context<Self>) {
        let Some(ed) = self.open_editors.get(i) else {
            return;
        };
        let path = ed.path.clone();
        let text = ed.editor.read(cx).value().to_string();
        let Some(file_idx) = self.selected else {
            return;
        };
        let parsed: serde_json::Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(err) => {
                self.status = format!("Editor JSON invalid: {err}");
                cx.notify();
                return;
            }
        };

        {
            let Some(doc) = self.graph.doc.as_mut() else {
                return;
            };
            if path.is_empty() {
                *doc = parsed;
            } else if let Some(slot) = doc.pointer_mut(&path) {
                *slot = parsed;
            } else {
                self.status = "Node path no longer exists".into();
                cx.notify();
                return;
            }
        }

        let full = self
            .graph
            .doc
            .as_ref()
            .map(|d| serde_json::to_string_pretty(d).unwrap_or_default())
            .unwrap_or_default();

        self.buffers.insert(file_idx, full.clone());
        let dirty = self
            .original
            .get(&file_idx) != Some(&full);
        if dirty {
            self.dirty.insert(file_idx);
        } else {
            self.dirty.remove(&file_idx);
        }
        self.json_editor.update(cx, |state, cx| {
            set_json_editor_value(state, full, window, cx);
        });

        self.graph.source = None;
        self.ensure_graph();
        self.status = "Applied node edit to JSON".into();
        cx.notify();
    }

    pub(crate) fn graph_pointer_down(&mut self, lx: f32, ly: f32, ax: f32, ay: f32) {
        for i in (0..self.open_editors.len()).rev() {
            let ep = self.open_editors[i].pos;
            if lx < ep.x || lx > ep.x + EDITOR_W || ly < ep.y || ly > ep.y + EDITOR_H {
                continue;
            }
            if ly <= ep.y + EDITOR_HEADER && lx <= ep.x + EDITOR_W - 130.0 {
                self.editor_drag = Some(i);
                self.editor_drag_last = point(ax, ay);
            }
            return;
        }
        self.graph.panning = true;
        self.graph.last = point(ax, ay);
    }

    pub(crate) fn graph_pointer_move(&mut self, ax: f32, ay: f32, cx: &mut Context<Self>) {
        if let Some(i) = self.editor_drag {
            if let Some(ed) = self.open_editors.get_mut(i) {
                ed.pos.x += ax - self.editor_drag_last.x;
                ed.pos.y += ay - self.editor_drag_last.y;
            }
            self.editor_drag_last = point(ax, ay);
            cx.notify();
        } else if self.graph.panning {
            self.graph.pan.x += ax - self.graph.last.x;
            self.graph.pan.y += ay - self.graph.last.y;
            self.graph.last = point(ax, ay);
            cx.notify();
        }
    }

    pub(crate) fn graph_pointer_up(&mut self) {
        self.graph.panning = false;
        self.editor_drag = None;
    }

    pub(crate) fn graph_scroll(&mut self, dy: f32, lx: f32, ly: f32, cx: &mut Context<Self>) {
        for ed in &self.open_editors {
            if lx >= ed.pos.x
                && lx <= ed.pos.x + EDITOR_W
                && ly >= ed.pos.y
                && ly <= ed.pos.y + EDITOR_H
            {
                return;
            }
        }
        self.graph_zoom(dy, cx);
    }

    pub(crate) fn graph_zoom(&mut self, dy: f32, cx: &mut Context<Self>) {
        if dy == 0.0 {
            return;
        }
        let factor = if dy > 0.0 { 1.1 } else { 1.0 / 1.1 };
        self.graph.zoom = (self.graph.zoom * factor).clamp(ZOOM_MIN, ZOOM_MAX);
        cx.notify();
    }

    pub(crate) fn reset_graph_camera(&mut self, cx: &mut Context<Self>) {
        self.graph.pan = point(40.0, 48.0);
        self.graph.zoom = 1.0;
        cx.notify();
    }
}
