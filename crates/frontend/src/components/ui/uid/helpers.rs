use gpui::*;
use gpui_component::v_flex;

use super::*;
use crate::pages::uid::UidPage;

impl UidPage {
    pub(crate) fn icon_img(&self, url: &str, size: f32) -> AnyElement {
        match self.icon_tex(url, size) {
            Some(tex) => img(tex)
                .w(px(size))
                .h(px(size))
                .flex_none()
                .object_fit(ObjectFit::Contain)
                .into_any_element(),
            None => div().w(px(size)).h(px(size)).flex_none().into_any_element(),
        }
    }

    pub(crate) fn rarity_color(rarity: u32) -> Hsla {
        match rarity {
            5 => col(C_GOLD),
            4 => col(C_PURPLE),
            _ => col(C_MUTED),
        }
    }

    pub(crate) fn grade_color(grade: &str) -> Hsla {
        match grade {
            "SSS" | "SS" | "S" => col(C_GOLD),
            "A" => col(0x7fb069),
            "B" => col(0x6f9be0),
            _ => col(C_MUTED),
        }
    }

    pub(crate) fn slot_label(&self, slot: u32) -> &'static str {
        match slot {
            1 => self.tr("头部", "Head"),
            2 => self.tr("手部", "Hands"),
            3 => self.tr("躯干", "Body"),
            4 => self.tr("脚部", "Feet"),
            5 => self.tr("位面球", "Sphere"),
            6 => self.tr("连结绳", "Rope"),
            _ => self.tr("遗器", "Relic"),
        }
    }

    pub(crate) fn card() -> Div {
        v_flex()
            .p_3()
            .gap_2()
            .rounded(px(8.))
            .border_1()
            .border_color(col(C_BORDER))
            .bg(col(C_CARD))
    }
}
