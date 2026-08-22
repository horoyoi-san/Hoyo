mod character;
mod helpers;
mod page;
mod relics;
mod toolbar;

use gpui::*;
use gpui_component::button::ButtonCustomVariant;

pub(crate) const C_BG: u32 = 0x151823;
pub(crate) const C_CARD: u32 = 0x1d2130;
pub(crate) const C_CARD2: u32 = 0x242939;
pub(crate) const C_BORDER: u32 = 0x323950;
pub(crate) const C_TEXT: u32 = 0xecedf2;
pub(crate) const C_MUTED: u32 = 0x9aa1b8;
pub(crate) const C_GOLD: u32 = 0xe0a95c;
pub(crate) const C_PURPLE: u32 = 0xa683e0;
pub(crate) const C_DANGER: u32 = 0xd6564e;
pub(crate) const C_EMPTY: u32 = 0x2a8bf5;

pub(crate) const RING_OUTLINE_URL: &str =
    "https://srtools.neonteam.dev/icons/misc/DotOutline210R.webp";
pub(crate) const LIGHTCONE_EMPTY_URL: &str =
    "https://srtools.neonteam.dev/icons/lightcone-frame/FrameLightConeEmpty.webp";

pub(crate) fn col(hex: u32) -> Hsla {
    rgb(hex).into()
}

pub(crate) fn gold_button(cx: &App) -> ButtonCustomVariant {
    ButtonCustomVariant::new(cx)
        .color(col(0xb97200))
        .foreground(col(0xffffff))
        .hover(col(0xd89800))
        .active(col(0xb97200))
        .shadow(true)
}
