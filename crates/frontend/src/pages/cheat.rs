mod binds;
mod card;
mod categories;
mod state;

use std::collections::HashMap;

use gpui::*;
use gpui_component::{
    h_flex,
    input::InputState,
    select::{SearchableVec, SelectState},
    slider::SliderState,
    v_flex,
};
use serde_json::json;

use crate::cheat::{self, CheatModule, model::CheatFieldType};

use categories::CATEGORIES;
use state::SelectOption;

pub(super) fn fkey(module_id: &str, key: &str) -> String {
    format!("{module_id}::{key}")
}

pub struct CheatPage {
    modules: Vec<CheatModule>,
    selected_cat: usize,
    sliders: HashMap<String, Entity<SliderState>>,
    inputs: HashMap<String, Entity<InputState>>,
    selects: HashMap<String, Entity<SelectState<SearchableVec<SelectOption>>>>,
    keybinds: HashMap<String, i32>,
    listening: Option<(&'static str, &'static str)>,
    focus: FocusHandle,
    _subscriptions: Vec<Subscription>,
}

impl CheatPage {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let modules = cheat::get_modules();
        let fields = state::build_field_state(&modules, window, cx);

        cheat::service::sync_initial_state();
        cheat::service::start_keybind_listener();
        cheat::service::start_keybind_resync();
        cheat::service::refresh_hooks();

        state::spawn_refresh_bridge(cx);

        Self {
            modules,
            selected_cat: 0,
            sliders: fields.sliders,
            inputs: fields.inputs,
            selects: fields.selects,
            keybinds: fields.keybinds,
            listening: None,
            focus: cx.focus_handle(),
            _subscriptions: fields.subscriptions,
        }
    }

    pub fn apply_config(
        &mut self,
        window: &mut Window,
        enabled: &[String],
        keybinds: Vec<(String, String, i32)>,
        cheat_values: Vec<(String, String, serde_json::Value)>,
        cx: &mut Context<Self>,
    ) {
        log::debug!(
            "[CheatPage] apply_config start: enabled={} keybinds={} values={}",
            enabled.len(),
            keybinds.len(),
            cheat_values.len()
        );
        let enabled_set: std::collections::HashSet<String> = enabled.iter().cloned().collect();

        for module in &self.modules {
            let should_be_enabled = enabled_set.contains(module.id);
            if cheat::is_enabled(module.id) != should_be_enabled {
                cheat::set_enabled(module.id, should_be_enabled);
                cheat::service::send_cheat_command(hsr_ipc::CheatCommand::SetEnabled {
                    name: module.id.to_string(),
                    enabled: should_be_enabled,
                });
            }
        }

        for (module_id, key, value) in cheat_values {
            let Some(module) = self.modules.iter().find(|m| m.id == module_id) else {
                continue;
            };
            let Some(field) = module.fields.iter().find(|f| f.key == key) else {
                continue;
            };
            let fkey = fkey(module.id, field.key);

            match &field.ty {
                CheatFieldType::Slider { .. } => {
                    cheat::set_config_value(module.id, field.key, value.clone());
                    if let Some(state) = self.sliders.get(&fkey)
                        && let Some(v) = value.as_f64()
                    {
                        state.update(cx, |state, cx| {
                            state.set_value(v as f32, window, cx);
                        });
                        cheat::service::send_cheat_command(hsr_ipc::CheatCommand::SetValue {
                            name: module.id.to_string(),
                            key: field.key.to_string(),
                            value: v,
                        });
                    }
                }
                CheatFieldType::Text { .. } => {
                    cheat::set_config_value(module.id, field.key, value.clone());
                    if let Some(state) = self.inputs.get(&fkey)
                        && let Some(v) = value.as_str()
                    {
                        state.update(cx, |state, cx| {
                            state.set_value(v.to_string(), window, cx);
                        });
                    }
                }
                CheatFieldType::Number { .. } => {
                    cheat::set_config_value(module.id, field.key, value.clone());
                    if let Some(state) = self.inputs.get(&fkey) {
                        state.update(cx, |state, cx| {
                            state.set_value(value.to_string(), window, cx);
                        });
                    }
                }
                CheatFieldType::Select { options, .. } => {
                    cheat::set_config_value(module.id, field.key, value.clone());
                    if let Some(state) = self.selects.get(&fkey)
                        && let Some(v) = value.as_i64()
                    {
                        let selected = options.iter().position(|(_, val)| *val == v);
                        state.update(cx, |state, cx| {
                            state.set_selected_index(
                                selected.map(gpui_component::IndexPath::new),
                                window,
                                cx,
                            );
                        });
                    }
                }
                CheatFieldType::KeyBind { .. } | CheatFieldType::Boolean { .. } => {}
            }
        }

        for (module_id, key, code) in keybinds {
            let static_module_id: &'static str = self
                .modules
                .iter()
                .find(|m| m.id == module_id)
                .map_or("", |m| m.id);
            if static_module_id.is_empty() {
                continue;
            }
            let static_key: &'static str = if key == "toggle"
                || self
                    .modules
                    .iter()
                    .any(|m| m.id == static_module_id && m.fields.iter().any(|f| f.key == key))
                || self
                    .modules
                    .iter()
                    .any(|m| m.id == static_module_id && m.actions.iter().any(|a| a.id == key))
            {
                key.leak()
            } else {
                continue;
            };

            cheat::set_config_value(static_module_id, static_key, json!(code));
            cheat::set_keybind(static_module_id, static_key, code);
            self.keybinds
                .insert(fkey(static_module_id, static_key), code);
            cheat::service::send_cheat_command(hsr_ipc::CheatCommand::SetKeyBind {
                name: module_id,
                key: static_key.to_string(),
                key_code: code,
            });
        }

        cheat::service::refresh_hooks();
        cx.notify();
        log::debug!("[CheatPage] apply_config done");
    }

    fn execute_action(&self, module_id: &'static str, action_id: &'static str) {
        if let Some(module) = self.modules.iter().find(|module| module.id == module_id) {
            cheat::service::run_action(module, action_id);
        }
    }

    fn start_listening(
        &mut self,
        module_id: &'static str,
        key: &'static str,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        self.listening = Some((module_id, key));
        self.focus.focus(window, cx);
        cx.notify();
    }

    fn apply_bind(&mut self, module_id: &'static str, key: &'static str, code: i32) {
        cheat::set_config_value(module_id, key, json!(code));
        cheat::set_keybind(module_id, key, code);
        self.keybinds.insert(fkey(module_id, key), code);
        cheat::service::send_cheat_command(hsr_ipc::CheatCommand::SetKeyBind {
            name: module_id.to_string(),
            key: key.to_string(),
            key_code: code,
        });
        self.listening = None;
    }

    fn capture_mouse_bind(
        &mut self,
        event: &MouseDownEvent,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        if let Some((module_id, key)) = self.listening
            && let Some((code, _)) = cheat::keycode::from_mouse(event.button)
        {
            self.apply_bind(module_id, key, code);
            cx.notify();
        }
    }
}

impl Render for CheatPage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let (_, ids) = CATEGORIES[self.selected_cat.min(CATEGORIES.len() - 1)];
        let content: AnyElement = if ids.is_empty() {
            self.keybind_list(cx).into_any_element()
        } else {
            let panels: Vec<AnyElement> = ids
                .iter()
                .filter_map(|id| self.modules.iter().find(|module| module.id == *id))
                .map(|module| self.module_panel(module, cx))
                .collect();
            div()
                .flex()
                .flex_row()
                .flex_wrap()
                .items_start()
                .gap_3()
                .children(panels)
                .into_any_element()
        };

        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .track_focus(&self.focus)
            .on_key_down(cx.listener(|this, event: &KeyDownEvent, _window, cx| {
                let Some((module_id, key)) = this.listening else {
                    return;
                };

                let code = if event.keystroke.key.as_str() == "escape" {
                    Some(cheat::keycode::unity::NONE)
                } else {
                    cheat::keycode::from_gpui(event.keystroke.key.as_str()).map(|(code, _)| code)
                };
                if let Some(code) = code {
                    this.apply_bind(module_id, key, code);
                    cx.notify();
                }
            }))
            .on_mouse_down(
                MouseButton::Navigate(NavigationDirection::Back),
                cx.listener(|this, event: &MouseDownEvent, window, cx| {
                    this.capture_mouse_bind(event, window, cx);
                }),
            )
            .on_mouse_down(
                MouseButton::Navigate(NavigationDirection::Forward),
                cx.listener(|this, event: &MouseDownEvent, window, cx| {
                    this.capture_mouse_bind(event, window, cx);
                }),
            )
            .child(crate::ui::page_header(
                "Cheats",
                "Gameplay & network cheats",
                cx,
            ))
            .child(
                h_flex()
                    .flex_1()
                    .gap_4()
                    .items_start()
                    .child(self.category_nav(cx))
                    .child(
                        div()
                            .id("cheat-scroll")
                            .flex_1()
                            .overflow_y_scroll()
                            .child(content),
                    ),
            )
    }
}
