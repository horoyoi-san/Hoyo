use std::sync::Arc;

use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::v_flex;
use rayon::prelude::*;

pub(super) fn col(hex: u32) -> Hsla {
    rgb(hex).into()
}

pub(super) fn warp_badge(cat: gacha::Category) -> impl IntoElement {
    let path = match cat {
        gacha::Category::Standard | gacha::Category::Beginner => "images/standard-warp.png",
        _ => "images/up-warp.png",
    };
    img(path).w(px(34.)).h(px(42.)).flex_none()
}

pub(super) fn bar_fill(ratio: f32) -> Hsla {
    if ratio < 0.4 {
        col(super::C_GREEN)
    } else if ratio < 0.8 {
        col(super::C_TEXT)
    } else {
        col(super::C_RED)
    }
}

fn rank_color(rank: u32) -> Hsla {
    if rank >= 5 {
        col(super::C_GOLD)
    } else {
        col(super::C_PURPLE)
    }
}

fn first_char(name: &str) -> String {
    name.chars()
        .next().map_or_else(|| "?".into(), |c| c.to_string())
}

pub(super) fn date_only(s: &str) -> &str {
    s.split(' ').next().unwrap_or(s)
}

pub(super) fn thousands(n: usize) -> String {
    let s = n.to_string();
    let bytes = s.as_bytes();
    let len = bytes.len();
    let mut out = String::with_capacity(len + len / 3);
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (len - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(*b as char);
    }
    out
}

pub(super) fn avatar_chip(page: &super::GachaPage, p: &gacha::Pull, max: u32) -> AnyElement {
    let fill = bar_fill(p.pity as f32 / max.max(1) as f32);
    v_flex()
        .items_center()
        .gap_1()
        .w(px(60.))
        .flex_none()
        .child(page.avatar(p, 56.))
        .child(
            div()
                .text_sm()
                .font_weight(FontWeight::SEMIBOLD)
                .text_color(fill)
                .child(p.pity.to_string()),
        )
        .into_any_element()
}

impl super::GachaPage {
    pub(super) fn avatar(&self, p: &gacha::Pull, width: f32) -> AnyElement {
        let rc = rank_color(p.rank);
        let id: u32 = p.item_id.parse().unwrap_or(0);
        let height = width * 1.34;
        let base = div()
            .w(px(width))
            .h(px(height))
            .flex_none()
            .rounded(px(6.))
            .overflow_hidden()
            .border_1()
            .border_color(rc.opacity(0.55))
            .bg(rc.opacity(0.18));
        if let Some(tex) = self.icons.get(&id) {
            base.child(
                img(tex.clone())
                    .w(px(width))
                    .h(px(height))
                    .object_fit(ObjectFit::Cover),
            )
            .into_any_element()
        } else {
            base.flex()
                .items_center()
                .justify_center()
                .child(
                    div()
                        .text_base()
                        .font_weight(FontWeight::BOLD)
                        .text_color(rc)
                        .child(first_char(&p.item_name)),
                )
                .into_any_element()
        }
    }

    pub(super) fn progress_card(&self) -> AnyElement {
        let p = self.progress.snapshot();
        let (label, detail, frac) = match p.phase {
            1 => (
                "Reading disk cache…".to_string(),
                "Locating your Warp link".to_string(),
                0.06_f32,
            ),
            2 => {
                let f = if p.banners_total > 0 {
                    p.banners_done as f32 / p.banners_total as f32
                } else {
                    0.0
                };
                (
                    format!("Fetching records  {}/{}", p.banners_done, p.banners_total),
                    format!("{} records so far", p.records),
                    0.10 + f * 0.70,
                )
            }
            3 => {
                let f = if p.icons_total > 0 {
                    p.icons_done as f32 / p.icons_total as f32
                } else {
                    1.0
                };
                (
                    "Downloading avatars…".to_string(),
                    format!("{}/{}", p.icons_done, p.icons_total),
                    0.82 + f * 0.18,
                )
            }
            _ => ("Working…".to_string(), String::new(), 0.4),
        };

        v_flex()
            .size_full()
            .items_center()
            .justify_center()
            .child(
                v_flex()
                    .w(px(420.))
                    .p(px(24.))
                    .gap_3()
                    .rounded(px(12.))
                    .border_1()
                    .border_color(col(super::C_BORDER))
                    .bg(col(super::C_CARD))
                    .child(
                        div()
                            .text_base()
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(col(super::C_TEXT))
                            .child(label),
                    )
                    .child(
                        div()
                            .w_full()
                            .h(px(8.))
                            .rounded(px(999.))
                            .overflow_hidden()
                            .bg(col(super::C_TRACK))
                            .child(
                                div()
                                    .h_full()
                                    .rounded(px(999.))
                                    .bg(col(super::C_ACCENT))
                                    .w(relative(frac.clamp(0.0, 1.0))),
                            ),
                    )
                    .when(!detail.is_empty(), |this| {
                        this.child(
                            div()
                                .text_sm()
                                .text_color(col(super::C_MUTED))
                                .child(detail),
                        )
                    }),
            )
            .into_any_element()
    }
}

const ICON_MIN_SIZE: u32 = 168;

pub(super) fn decode_icons(bytes: Vec<(u32, Vec<u8>)>) -> Vec<(u32, Arc<RenderImage>)> {
    bytes
        .into_par_iter()
        .filter_map(|(id, b)| {
            let img = image::load_from_memory(&b).ok()?;
            let rgba = if img.width() < ICON_MIN_SIZE || img.height() < ICON_MIN_SIZE {
                let w = img.width().max(ICON_MIN_SIZE);
                let h = (w as f32 * img.height() as f32 / img.width() as f32).round() as u32;
                img.resize_exact(w, h, image::imageops::Lanczos3).to_rgba8()
            } else {
                img.to_rgba8()
            };
            let mut bgra = rgba;
            for px in bgra.pixels_mut() {
                px.0.swap(0, 2);
            }
            Some((
                id,
                Arc::new(RenderImage::new(vec![image::Frame::new(bgra)])),
            ))
        })
        .collect()
}
