use std::collections::HashSet;
use std::rc::Rc;

use gpui::*;
use gpui_component::{
    ActiveTheme, h_flex,
    input::{Input, InputEvent, InputState},
    v_flex,
};

use crate::components::ui::PanelExt as _;

type SelectCallback = Rc<dyn Fn(u32, &mut Window, &mut App)>;

pub(super) struct PacketListView {
    search: Entity<InputState>,
    exclude: HashSet<u32>,
    on_select: SelectCallback,
    _subscription: Subscription,
}

impl PacketListView {
    pub(super) fn new(
        window: &mut Window,
        cx: &mut Context<Self>,
        search: Entity<InputState>,
        exclude: HashSet<u32>,
        on_select: impl Fn(u32, &mut Window, &mut App) + 'static,
    ) -> Self {
        let subscription = cx.subscribe_in(
            &search,
            window,
            |_this, _input, ev: &InputEvent, _window, cx| {
                if matches!(ev, InputEvent::Change) {
                    cx.notify();
                }
            },
        );
        Self {
            search,
            exclude,
            on_select: Rc::new(on_select),
            _subscription: subscription,
        }
    }
}

impl Render for PacketListView {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let query = self.search.read(cx).value().to_lowercase();

        let exclude = &self.exclude;
        let mut items: Vec<(u32, String)> = crate::proto::store::packet_names()
            .into_iter()
            .filter(|(cmd_id, _)| !exclude.contains(cmd_id))
            .filter(|(cmd_id, name)| {
                query.is_empty()
                    || name.to_lowercase().contains(&query)
                    || cmd_id.to_string().contains(&query)
            })
            .collect();
        items.sort_by(|a, b| a.1.cmp(&b.1));
        let count = items.len();

        let on_select = self.on_select.clone();
        let c_hover = theme.list_hover;
        let c_fg = theme.foreground;
        let c_muted = theme.muted_foreground;

        let list = uniform_list("packet-picker-list", count, move |range, _window, _cx| {
            range
                .filter_map(|i| {
                    let (cmd_id, name) = items.get(i)?.clone();
                    let on_select = on_select.clone();
                    Some(
                        div()
                            .id(SharedString::from(format!("pick-{cmd_id}")))
                            .cursor_pointer()
                            .w_full()
                            .px_2()
                            .py_1()
                            .hover(|row| row.bg(c_hover))
                            .on_click(move |_, window, cx| on_select(cmd_id, window, cx))
                            .child(
                                h_flex()
                                    .gap_2()
                                    .items_center()
                                    .justify_between()
                                    .child(
                                        div()
                                            .flex_1()
                                            .min_w_0()
                                            .truncate()
                                            .text_sm()
                                            .text_color(c_fg)
                                            .child(name),
                                    )
                                    .child(
                                        div()
                                            .flex_none()
                                            .text_xs()
                                            .text_color(c_muted)
                                            .child(cmd_id.to_string()),
                                    ),
                            )
                            .into_any_element(),
                    )
                })
                .collect::<Vec<_>>()
        });

        v_flex()
            .p_3()
            .gap_2()
            .w(px(440.))
            .h(px(420.))
            .child(Input::new(&self.search))
            .child(div().flex_1().min_h_0().panel(cx).child(list.size_full()))
    }
}
