use std::sync::Arc;

use gpui::{App, Hsla, Window, rgb, rgba};
use gpui_component::{Theme, ThemeMode, scroll::ScrollbarShow};

pub fn selection() -> Hsla {
    rgb(0xd2a04a).into()
}

pub fn danger() -> Hsla {
    rgb(0xe05d5d).into()
}

pub fn cheat_surface() -> Hsla {
    rgba(0x141824d9).into()
}

pub fn cheat_border() -> Hsla {
    rgba(0xd2a04a66).into()
}

pub fn gold_strong() -> Hsla {
    rgb(0xd2a04a).into()
}

pub fn gold_flash() -> Hsla {
    rgb(0xffe39b).into()
}

pub fn apply(window: &mut Window, cx: &mut App) {
    Theme::change(ThemeMode::Dark, Some(window), cx);

    let gold: Hsla = rgb(0xd2a04a).into();
    let gold_hover: Hsla = rgb(0xdfc07a).into();
    let gold_press: Hsla = rgb(0xb88530).into();

    let theme = Theme::global_mut(cx);
    theme.primary = gold;
    theme.primary_hover = gold_hover;
    theme.primary_active = gold_press;
    theme.primary_foreground = rgb(0x12141a).into();
    theme.ring = gold;
    theme.background = rgb(0x0e1017).into();
    theme.sidebar = rgba(0x10131ce6).into();
    theme.secondary = rgb(0x181c28).into();
    theme.border = rgba(0xffffff1f).into();
    theme.foreground = rgb(0xededf2).into();
    theme.muted_foreground = rgb(0x9aa1b2).into();
    theme.list_active = rgba(0xd2a04a33).into();
    theme.list_hover = rgba(0xffffff0f).into();
    theme.scrollbar_show = ScrollbarShow::Always;

    let mut highlight = (*theme.highlight_theme).clone();
    highlight.style.editor_background = Some(rgb(0x141722).into());
    highlight.style.editor_foreground = Some(theme.foreground);
    highlight.style.editor_active_line = Some(rgb(0x1d2232).into());
    highlight.style.editor_line_number = Some(theme.muted_foreground.opacity(0.65));
    highlight.style.editor_active_line_number = Some(rgb(0xffffff).into());
    highlight.style.editor_gutter_background = Some(rgb(0x10131d).into());
    theme.highlight_theme = Arc::new(highlight);
}
