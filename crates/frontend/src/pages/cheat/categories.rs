use gpui::*;
use gpui_component::v_flex;

use crate::components::ui::nav_item;

pub(super) const CATEGORIES: &[(&str, &[&str])] = &[
    (
        "Visible",
        &[
            "hkrpg.uid",
            "hkrpg.hide_ui",
            "hkrpg.hud",
            "hkrpg.censorship",
        ],
    ),
    ("World", &["hkrpg.speed"]),
    ("Misc", &["hkrpg.loading_scene", "hkrpg.unlock_fps"]),
    ("KeyBind", &[]),
];

fn category_icon(index: usize) -> AnyElement {
    let path = match index {
        0 => "icons/Eye.png",
        1 => "icons/World.png",
        2 => "icons/Misc.png",
        _ => "icons/KeyBind.png",
    };
    img(path)
        .size(px(24.))
        .object_fit(ObjectFit::Contain)
        .flex_none()
        .into_any_element()
}

impl super::CheatPage {
    pub(super) fn category_nav(&self, cx: &Context<Self>) -> Div {
        let mut nav = v_flex().w(px(160.)).gap_1().flex_none();
        for (index, (title, _)) in CATEGORIES.iter().enumerate() {
            let selected = self.selected_cat == index;
            nav = nav.child(nav_item(
                SharedString::from(format!("cheat-cat-{index}")),
                *title,
                category_icon(index),
                selected,
                cx.listener(move |this, _ev: &MouseDownEvent, _window, cx| {
                    this.selected_cat = index;
                    cx.notify();
                }),
                cx,
            ));
        }
        nav
    }
}
