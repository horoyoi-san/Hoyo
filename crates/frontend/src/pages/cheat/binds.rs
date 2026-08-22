use gpui::*;
use gpui_component::{ActiveTheme, Icon, Sizable as _, h_flex, v_flex};

impl super::CheatPage {
    fn bind_display(&self, module_id: &str, key: &str) -> (SharedString, SharedString) {
        let Some(module) = self.modules.iter().find(|module| module.id == module_id) else {
            return (module_id.to_string().into(), key.to_string().into());
        };

        let function = if key == "toggle" {
            "Toggle".to_string()
        } else if let Some(field) = module.fields.iter().find(|field| field.key == key) {
            field.label.to_string()
        } else if let Some(action) = module.actions.iter().find(|action| action.id == key) {
            action.label.to_string()
        } else {
            key.to_string()
        };

        (module.name.to_string().into(), function.into())
    }

    fn static_bind_target(
        &self,
        module_id: &str,
        key: &str,
    ) -> Option<(&'static str, &'static str)> {
        let module = self.modules.iter().find(|module| module.id == module_id)?;
        let static_key: &'static str = if key == "toggle" {
            "toggle"
        } else if let Some(field) = module.fields.iter().find(|field| field.key == key) {
            field.key
        } else {
            module.actions.iter().find(|action| action.id == key)?.id
        };
        Some((module.id, static_key))
    }

    pub(super) fn keybind_list(&self, cx: &Context<Self>) -> Div {
        let theme = cx.theme();

        let mut binds: Vec<(String, String, i32)> = crate::cheat::all_keybinds()
            .into_iter()
            .filter(|(_, _, code)| *code != 0)
            .collect();
        binds.sort_by(|a, b| (a.0.as_str(), a.1.as_str()).cmp(&(b.0.as_str(), b.1.as_str())));

        let mut list = v_flex().w_full().items_center().gap_2().pt_2();

        if binds.is_empty() {
            return list.child(
                div()
                    .mt_8()
                    .text_sm()
                    .text_color(theme.muted_foreground)
                    .child("No key binds yet — middle-click a feature (or its hotkey chip) to bind one."),
            );
        }

        for (module_id, key, code) in binds {
            let (title, function) = self.bind_display(&module_id, &key);
            let label = crate::cheat::keycode::label(code);
            let target = self.static_bind_target(&module_id, &key);
            let listening = target.is_some_and(|(m, k)| self.listening == Some((m, k)));

            let (fg, bg, border) = if listening {
                (theme.primary_foreground, theme.primary, theme.primary)
            } else {
                (
                    theme.foreground,
                    theme.primary.opacity(0.15),
                    theme.primary.opacity(0.55),
                )
            };
            let mut badge = div()
                .id(SharedString::from(format!("kb-badge-{module_id}-{key}")))
                .flex()
                .justify_center()
                .items_center()
                .min_w(px(30.))
                .h(px(30.))
                .px(px(8.))
                .rounded(px(999.))
                .bg(bg)
                .border_1()
                .border_color(border)
                .text_xs()
                .font_weight(FontWeight::SEMIBOLD)
                .text_color(fg)
                .child(if listening { "…".to_string() } else { label });
            if let Some((mid, k)) = target {
                badge = badge.cursor_pointer().on_mouse_down(
                    MouseButton::Left,
                    cx.listener(move |this, _ev: &MouseDownEvent, window, cx| {
                        this.start_listening(mid, k, window, cx);
                    }),
                );
            }

            let mut row = h_flex()
                .id(SharedString::from(format!("kb-row-{module_id}-{key}")))
                .w(px(560.))
                .justify_between()
                .items_center()
                .gap_3()
                .px_4()
                .py_3()
                .rounded(theme.radius)
                .border_1()
                .border_color(crate::theme::cheat_border())
                .bg(crate::theme::cheat_surface())
                .child(
                    h_flex()
                        .gap_3()
                        .items_center()
                        .min_w_0()
                        .child(
                            Icon::empty()
                                .path("icons/keyboard.svg")
                                .small()
                                .text_color(theme.muted_foreground),
                        )
                        .child(
                            v_flex()
                                .min_w_0()
                                .child(
                                    div()
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(theme.foreground)
                                        .child(title),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme.muted_foreground)
                                        .child(function),
                                ),
                        ),
                )
                .child(badge);
            if let Some((mid, k)) = target {
                row = row.on_mouse_down(
                    MouseButton::Middle,
                    cx.listener(move |this, _ev: &MouseDownEvent, window, cx| {
                        this.start_listening(mid, k, window, cx);
                    }),
                );
            }
            if listening {
                row = row.bg(theme.primary.opacity(0.10));
            }

            list = list.child(row);
        }

        list
    }
}
