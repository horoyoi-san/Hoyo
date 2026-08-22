use std::collections::HashMap;
use std::time::Duration;

use gpui::*;
use gpui_component::{
    IndexPath,
    input::{InputEvent, InputState},
    select::{SearchableVec, SelectEvent, SelectItem, SelectState},
    slider::{SliderEvent, SliderState},
};
use hsr_ipc::{BackendEvent, CheatEvent};
use serde_json::json;
use smol::Timer;

use crate::cheat::{self, CheatModule, model::CheatFieldType};

use super::{CheatPage, fkey};

#[derive(Clone)]
pub(super) struct SelectOption {
    label: SharedString,
    value: i64,
}

impl SelectItem for SelectOption {
    type Value = i64;

    fn title(&self) -> SharedString {
        self.label.clone()
    }

    fn value(&self) -> &Self::Value {
        &self.value
    }

    fn matches(&self, query: &str) -> bool {
        self.label.to_lowercase().contains(&query.to_lowercase())
            || self.value.to_string().contains(query)
    }
}

pub(super) struct FieldState {
    pub sliders: HashMap<String, Entity<SliderState>>,
    pub inputs: HashMap<String, Entity<InputState>>,
    pub selects: HashMap<String, Entity<SelectState<SearchableVec<SelectOption>>>>,
    pub keybinds: HashMap<String, i32>,
    pub subscriptions: Vec<Subscription>,
}

pub(super) fn build_field_state(
    modules: &[CheatModule],
    window: &mut Window,
    cx: &mut Context<CheatPage>,
) -> FieldState {
    let mut sliders = HashMap::new();
    let mut inputs = HashMap::new();
    let mut selects = HashMap::new();
    let mut keybinds = HashMap::new();
    let mut subscriptions = Vec::new();

    for module in modules {
        cheat::init_module(module);
        let config = cheat::action_context(module).config;

        for field in &module.fields {
            let key = fkey(module.id, field.key);
            let mid = module.id;
            let fk = field.key;

            match &field.ty {
                CheatFieldType::Slider {
                    default,
                    min,
                    max,
                    step,
                } => {
                    let initial = config
                        .get(field.key)
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(*default);
                    let state = cx.new(|_| {
                        SliderState::new()
                            .min(*min as f32)
                            .max(*max as f32)
                            .step(*step as f32)
                            .default_value(initial as f32)
                    });
                    subscriptions.push(cx.subscribe(
                        &state,
                        move |_this, _emitter, event: &SliderEvent, _cx| {
                            if let SliderEvent::Change(value) = event {
                                let value = value.start() as f64;
                                cheat::set_config_value(mid, fk, json!(value));
                                cheat::service::send_cheat_command(
                                    hsr_ipc::CheatCommand::SetValue {
                                        name: mid.to_string(),
                                        key: fk.to_string(),
                                        value,
                                    },
                                );
                            }
                        },
                    ));
                    sliders.insert(key, state);
                }
                CheatFieldType::KeyBind { default } => {
                    let initial = config
                        .get(field.key)
                        .and_then(serde_json::Value::as_i64)
                        .map_or(*default, |v| v as i32);
                    keybinds.insert(key, initial);
                    cheat::set_keybind(module.id, field.key, initial);
                }
                CheatFieldType::Select { default, options } => {
                    let initial = config
                        .get(field.key)
                        .and_then(serde_json::Value::as_i64)
                        .unwrap_or(*default);
                    let items: Vec<SelectOption> = options
                        .iter()
                        .map(|(label, value)| SelectOption {
                            label: SharedString::from(*label),
                            value: *value,
                        })
                        .collect();
                    let selected = items
                        .iter()
                        .position(|item| item.value == initial)
                        .unwrap_or(0);
                    let state = cx.new(|cx| {
                        SelectState::new(
                            SearchableVec::new(items),
                            Some(IndexPath::new(selected)),
                            window,
                            cx,
                        )
                        .searchable(true)
                    });
                    subscriptions.push(cx.subscribe_in(
                        &state,
                        window,
                        move |_this,
                              _emitter,
                              event: &SelectEvent<SearchableVec<SelectOption>>,
                              _window,
                              _cx| {
                            if let SelectEvent::Confirm(Some(value)) = event {
                                cheat::set_config_value(mid, fk, json!(*value));
                            }
                        },
                    ));
                    selects.insert(key, state);
                }
                CheatFieldType::Number { default } => {
                    let initial = config
                        .get(field.key)
                        .and_then(serde_json::Value::as_i64)
                        .unwrap_or(*default);
                    let state =
                        cx.new(|cx| InputState::new(window, cx).default_value(initial.to_string()));
                    subscriptions.push(cx.subscribe_in(
                        &state,
                        window,
                        move |_this, emitter, event: &InputEvent, _window, cx| {
                            if matches!(event, InputEvent::Change)
                                && let Ok(value) = emitter.read(cx).value().trim().parse::<i64>()
                            {
                                cheat::set_config_value(mid, fk, json!(value));
                            }
                        },
                    ));
                    inputs.insert(key, state);
                }
                CheatFieldType::Text { default } => {
                    let initial = config
                        .get(field.key)
                        .and_then(|v| v.as_str()).map_or_else(|| (*default).to_string(), str::to_string);
                    let state = cx.new(|cx| InputState::new(window, cx).default_value(initial));
                    subscriptions.push(cx.subscribe_in(
                        &state,
                        window,
                        move |_this, emitter, event: &InputEvent, _window, cx| {
                            if matches!(event, InputEvent::Change) {
                                let value = emitter.read(cx).value().to_string();
                                cheat::set_config_value(mid, fk, json!(value));
                            }
                        },
                    ));
                    inputs.insert(key, state);
                }
                CheatFieldType::Boolean { .. } => {}
            }
        }
    }

    FieldState {
        sliders,
        inputs,
        selects,
        keybinds,
        subscriptions,
    }
}

pub(super) fn spawn_refresh_bridge(cx: &mut Context<CheatPage>) {
    let (refresh_tx, refresh_rx) = std::sync::mpsc::channel::<()>();
    std::thread::spawn(move || {
        for event in crate::ipc::subscribe() {
            if matches!(event, BackendEvent::Cheat(CheatEvent::KeyTriggered { .. }))
                && refresh_tx.send(()).is_err()
            {
                break;
            }
        }
    });
    cx.spawn(async move |this, cx| {
        loop {
            Timer::after(Duration::from_millis(100)).await;
            let alive = this
                .update(cx, |_this, cx| {
                    let mut changed = false;
                    while refresh_rx.try_recv().is_ok() {
                        changed = true;
                    }
                    if changed {
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
}
