use gpui::*;
use gpui_component::{
    ActiveTheme, Sizable as _, button::Button, h_flex, input::Input, select::Select,
    slider::Slider, switch::Switch,
};
use serde_json::json;

use crate::cheat::{
    self, CheatModule,
    model::{CheatConfigField, CheatFieldType},
};
use crate::components::ui::{Bind, Expand, Section};

use super::fkey;

impl super::CheatPage {
    fn bind_code(&self, module_id: &str, key: &str) -> i32 {
        self.keybinds
            .get(&fkey(module_id, key))
            .copied()
            .or_else(|| {
                cheat::config_value(module_id, key)
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32)
            })
            .unwrap_or(0)
    }

    fn bind_chip(
        &self,
        module_id: &'static str,
        key: &'static str,
        cx: &Context<Self>,
    ) -> impl IntoElement {
        let label = cheat::keycode::label(self.bind_code(module_id, key));
        Bind::new(SharedString::from(format!("bind-{module_id}-{key}")), label)
            .listening(self.listening == Some((module_id, key)))
            .on_request(cx.listener(move |this, _ev: &MouseDownEvent, window, cx| {
                this.start_listening(module_id, key, window, cx);
            }))
            .render(cx)
    }

    fn value_control(
        &self,
        module_id: &'static str,
        field: &CheatConfigField,
        cx: &Context<Self>,
    ) -> AnyElement {
        let theme = cx.theme();
        let key = fkey(module_id, field.key);
        let fk = field.key;

        match &field.ty {
            CheatFieldType::Slider { .. } => {
                if let Some(state) = self.sliders.get(&key) {
                    let value = state.read(cx).value().start();
                    h_flex()
                        .gap_2()
                        .items_center()
                        .w(px(176.))
                        .child(div().flex_1().child(Slider::new(state)))
                        .child(
                            div()
                                .w(px(34.))
                                .flex_none()
                                .text_xs()
                                .text_color(theme.foreground)
                                .child(format!("{value:.1}")),
                        )
                        .into_any_element()
                } else {
                    div().into_any_element()
                }
            }
            CheatFieldType::Select { .. } => {
                if let Some(state) = self.selects.get(&key) {
                    div()
                        .w(px(220.))
                        .child(Select::new(state).menu_width(px(300.)))
                        .into_any_element()
                } else {
                    div().into_any_element()
                }
            }
            CheatFieldType::Number { .. } => {
                if let Some(state) = self.inputs.get(&key) {
                    div()
                        .w(px(140.))
                        .child(Input::new(state))
                        .into_any_element()
                } else {
                    div().into_any_element()
                }
            }
            CheatFieldType::Text { .. } => {
                if let Some(state) = self.inputs.get(&key) {
                    div()
                        .w(px(200.))
                        .child(Input::new(state))
                        .into_any_element()
                } else {
                    div().into_any_element()
                }
            }
            CheatFieldType::Boolean { .. } => {
                let value = cheat::config_value(module_id, fk)
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                Switch::new(SharedString::from(format!("cheat-bool-{key}")))
                    .checked(value)
                    .on_click(cx.listener(move |_this, checked: &bool, _, cx| {
                        cheat::set_config_value(module_id, fk, json!(*checked));
                        cx.notify();
                    }))
                    .into_any_element()
            }
            CheatFieldType::KeyBind { .. } => div().into_any_element(),
        }
    }

    fn bind_row(
        &self,
        module_id: &'static str,
        key: &'static str,
        label: &'static str,
        leading: Option<AnyElement>,
        control: Option<AnyElement>,
        cx: &Context<Self>,
    ) -> AnyElement {
        let mut row = Expand::new(SharedString::from(format!("row-{module_id}-{key}")), label)
            .bind(self.bind_chip(module_id, key, cx))
            .listening(self.listening == Some((module_id, key)))
            .on_bind(cx.listener(move |this, _ev: &MouseDownEvent, window, cx| {
                this.start_listening(module_id, key, window, cx);
            }));
        if let Some(leading) = leading {
            row = row.leading(leading);
        }
        if let Some(control) = control {
            row = row.control(control);
        }
        row.render(cx).into_any_element()
    }

    pub(super) fn module_panel(&self, module: &CheatModule, cx: &Context<Self>) -> AnyElement {
        let mid = module.id;
        let send_only = module.message_names.is_empty() && !module.actions.is_empty();
        let enabled = cheat::is_enabled(mid);

        let primary_bind = module
            .fields
            .iter()
            .find(|field| matches!(field.ty, CheatFieldType::KeyBind { .. }));

        let primary_key: Option<&'static str> = if let Some(field) = primary_bind {
            Some(field.key)
        } else if send_only && module.actions.len() == 1 {
            Some(module.actions[0].id)
        } else if !send_only && module.actions.is_empty() {
            Some("toggle")
        } else {
            None
        };

        let control: AnyElement = if send_only {
            let action = &module.actions[0];
            let aid = action.id;
            Button::new(SharedString::from(format!("cheat-send-{mid}")))
                .small()
                .label(action.label)
                .on_click(cx.listener(move |this, _, _, _| this.execute_action(mid, aid)))
                .into_any_element()
        } else {
            Switch::new(SharedString::from(format!("cheat-en-{mid}")))
                .checked(enabled)
                .on_click(cx.listener(move |_this, checked: &bool, _, cx| {
                    cheat::set_enabled(mid, *checked);
                    cheat::service::send_cheat_command(hsr_ipc::CheatCommand::SetEnabled {
                        name: mid.to_string(),
                        enabled: *checked,
                    });
                    cheat::service::refresh_hooks();
                    cx.notify();
                }))
                .into_any_element()
        };

        let mut rows: Vec<AnyElement> = Vec::new();

        for field in &module.fields {
            if matches!(field.ty, CheatFieldType::KeyBind { .. }) {
                if primary_bind.map(|f| f.key) == Some(field.key) {
                    continue;
                }
                rows.push(self.bind_row(mid, field.key, field.label, None, None, cx));
            } else {
                rows.push(
                    Expand::new(
                        SharedString::from(format!("row-{mid}-{}", field.key)),
                        field.label,
                    )
                    .control(self.value_control(mid, field, cx))
                    .render(cx)
                    .into_any_element(),
                );
            }
        }

        for (index, action) in module.actions.iter().enumerate() {
            if send_only && index == 0 {
                continue;
            }
            let aid = action.id;
            let button = Button::new(SharedString::from(format!("cheat-act-{mid}-{aid}")))
                .small()
                .label(action.label)
                .on_click(cx.listener(move |this, _, _, _| this.execute_action(mid, aid)))
                .into_any_element();
            rows.push(self.bind_row(mid, aid, "", Some(button), None, cx));
        }

        let mut section = Section::new(module.name)
            .description(module.description)
            .control(control);

        if let Some(key) = primary_key {
            section = section
                .bind(self.bind_chip(mid, key, cx))
                .on_bind(cx.listener(move |this, _ev: &MouseDownEvent, window, cx| {
                    this.start_listening(mid, key, window, cx);
                }));
        }

        section.children(rows).render(cx).into_any_element()
    }
}
