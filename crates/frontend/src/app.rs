use std::sync::Arc;

use gpui::{prelude::FluentBuilder as _, *};
use gpui_component::{ActiveTheme, Root, TitleBar, h_flex, v_flex};
use rayon::prelude::*;

use crate::components::ui::{
    ANIM_BIN_BYTES, CosmicStar, create_cosmic_stars, decode_bg_frame, load_anim_bin,
    render_background_video, render_starfield, update_cosmic_stars,
};
use crate::pages::{
    CheatPage, ConfigPage, ConsolePage, DesignPage, DumperPage, GachaPage, LuaPage, MoraxPage,
    SnifferPage, UidPage, UnpackerPage,
};

#[derive(Clone, Copy, PartialEq, Eq)]
enum Page {
    Dumper,
    Morax,
    Sniffer,
    Cheat,
    Lua,
    Unpacker,
    Design,
    Gacha,
    Uid,
    Config,
    Console,
}

pub struct HsrApp {
    page: Page,
    dumper: Entity<DumperPage>,
    morax: Entity<MoraxPage>,
    sniffer: Entity<SnifferPage>,
    cheat: Entity<CheatPage>,
    lua: Entity<LuaPage>,
    unpacker: Entity<UnpackerPage>,
    design: Entity<DesignPage>,
    gacha: Entity<GachaPage>,
    uid: Entity<UidPage>,
    config: Entity<ConfigPage>,
    console: Entity<ConsolePage>,
    stars: Vec<CosmicStar>,
    bg_frames: Vec<Arc<RenderImage>>,
    bg_frame_idx: usize,
}

impl HsrApp {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let dumper = cx.new(|cx| DumperPage::new(window, cx));
        let morax = cx.new(|cx| MoraxPage::new(window, cx));
        let sniffer = cx.new(|cx| SnifferPage::new(window, cx));
        let cheat = cx.new(|cx| CheatPage::new(window, cx));
        let lua = cx.new(|cx| LuaPage::new(window, cx));
        let unpacker = cx.new(|cx| UnpackerPage::new(window, cx));
        let design = cx.new(|cx| DesignPage::new(window, cx));
        let gacha = cx.new(|cx| GachaPage::new(window, cx));
        let uid = cx.new(|cx| UidPage::new(window, cx));
        let sniffer_weak = sniffer.downgrade();
        let cheat_weak = cheat.downgrade();
        let config = cx.new(|cx| ConfigPage::new(window, cx, sniffer_weak, cheat_weak));
        let console = cx.new(|cx| ConsolePage::new(window, cx));

        let stars = create_cosmic_stars(36);
        let all_raw_frames = load_anim_bin(ANIM_BIN_BYTES);

        let total_frames_count = all_raw_frames.len();
        let warmup_count = 60.min(total_frames_count);
        let initial_frames: Vec<Arc<RenderImage>> = if warmup_count > 0 {
            all_raw_frames[..warmup_count]
                .into_par_iter()
                .filter_map(|bytes| decode_bg_frame(bytes))
                .collect()
        } else {
            Vec::new()
        };

        if total_frames_count > warmup_count {
            let remaining_raw: Vec<&'static [u8]> = all_raw_frames[warmup_count..].to_vec();
            cx.spawn(async move |this, cx| {
                let more_frames = smol::unblock(move || {
                    let frames: Vec<Arc<RenderImage>> = remaining_raw
                        .into_par_iter()
                        .filter_map(decode_bg_frame)
                        .collect();
                    frames
                })
                .await;

                if !more_frames.is_empty() {
                    let _ = this.update(cx, |this: &mut Self, cx| {
                        this.bg_frames.extend(more_frames);
                        cx.notify();
                    });
                }
            })
            .detach();
        }

        cx.spawn(async move |this, cx| {
            loop {
                smol::Timer::after(std::time::Duration::from_millis(33)).await;
                let alive = this
                    .update(cx, |this: &mut Self, cx| {
                        let len = this.bg_frames.len();
                        if len > 0 {
                            if this.bg_frame_idx + 1 < len {
                                this.bg_frame_idx += 1;
                            } else if len >= total_frames_count && total_frames_count > 0 {
                                this.bg_frame_idx = 0;
                            }
                        }
                        update_cosmic_stars(&mut this.stars);
                        cx.notify();
                    })
                    .is_ok();
                if !alive {
                    break;
                }
            }
        })
        .detach();

        Self {
            page: Page::Dumper,
            dumper,
            morax,
            sniffer,
            cheat,
            lua,
            unpacker,
            design,
            gacha,
            uid,
            config,
            console,
            stars,
            bg_frames: initial_frames,
            bg_frame_idx: 0,
        }
    }

    fn nav_icon(page: Page) -> AnyElement {
        let path = match page {
            Page::Dumper => "icons/Dumper.png",
            Page::Morax => "icons/Morax.png",
            Page::Sniffer => "icons/Sniffer.png",
            Page::Cheat => "icons/Cheat.png",
            Page::Lua => "icons/Lua.png",
            Page::Unpacker => "icons/Unpacker.png",
            Page::Design => "icons/Design.png",
            Page::Gacha => "icons/Gacha.png",
            Page::Uid => "icons/World.png",
            Page::Config => "icons/Config.png",
            Page::Console => "icons/Terminal.png",
        };
        img(path)
            .size(px(24.))
            .object_fit(ObjectFit::Contain)
            .flex_none()
            .into_any_element()
    }

    fn nav_item(
        &self,
        page: Page,
        title: &'static str,
        subtitle: &'static str,
        cx: &Context<Self>,
    ) -> impl IntoElement {
        let selected = self.page == page;
        let icon = Self::nav_icon(page);
        let id = SharedString::from(format!("nav-{title}"));
        crate::components::ui::sidebar_card(
            id,
            title,
            subtitle,
            icon,
            selected,
            cx.listener(move |this, _, _, cx| {
                this.page = page;
                cx.notify();
            }),
        )
    }

    fn status_dot(&self, cx: &App) -> impl IntoElement {
        let connected = crate::ipc::is_connected();
        let color: Hsla = if connected {
            rgb(0x4cd964).into()
        } else {
            cx.theme().muted_foreground
        };

        h_flex()
            .gap_2()
            .px_3()
            .py_2()
            .rounded(px(4.))
            .border_1()
            .border_color(rgba(0xffffff14))
            .bg(rgba(0x10131ee6))
            .items_center()
            .child(
                div()
                    .size(px(8.))
                    .rounded_full()
                    .bg(color)
                    .when(connected, gpui::Styled::shadow_sm),
            )
            .child(
                div()
                    .text_xs()
                    .font_weight(FontWeight::MEDIUM)
                    .text_color(if connected {
                        rgb(0x4cd964).into()
                    } else {
                        cx.theme().muted_foreground
                    })
                    .child(if connected {
                        "Backend Connected"
                    } else {
                        "Backend Offline"
                    }),
            )
    }

    fn sidebar(&self, cx: &Context<Self>) -> impl IntoElement {
        div()
            .w(px(224.))
            .h_full()
            .flex_none()
            .relative()
            .bg(rgba(0x0e111ae6))
            .border_r_1()
            .border_color(rgba(0xffffff14))
            .child(
                img("images/sidebar-bg.png")
                    .absolute()
                    .top(px(0.))
                    .left(px(0.))
                    .size_full()
                    .object_fit(ObjectFit::Cover),
            )
            .child(
                div()
                    .absolute()
                    .top(px(0.))
                    .left(px(0.))
                    .size_full()
                    .bg(rgba(0x0a0d16ed)),
            )
            .child(
                v_flex()
                    .size_full()
                    .p_2p5()
                    .gap_1p5()
                    .child(
                        h_flex()
                            .items_center()
                            .gap_2()
                            .px_2()
                            .py_2()
                            .child(crate::ui::hsr_star(20.0, crate::theme::gold_strong()))
                            .child(
                                div()
                                    .text_base()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(crate::theme::gold_strong())
                                    .child("HSR OWNER"),
                            ),
                    )
                    .child(
                        div()
                            .id("sidebar-nav-scroll")
                            .flex_1()
                            .min_h_0()
                            .overflow_y_scroll()
                            .px_2p5()
                            .py_3()
                            .child(
                                v_flex()
                                    .gap_2p5()
                                    .child(self.nav_item(Page::Dumper, "Dumper", "Game Dumper", cx))
                                    .child(self.nav_item(
                                        Page::Morax,
                                        "Morax",
                                        "IL2CPP Cracker",
                                        cx,
                                    ))
                                    .child(self.nav_item(
                                        Page::Sniffer,
                                        "Sniffer",
                                        "Packet Stream",
                                        cx,
                                    ))
                                    .child(self.nav_item(Page::Cheat, "Cheat", "Game Easier", cx))
                                    .child(self.nav_item(Page::Lua, "Lua", "XLua Engine", cx))
                                    .child(self.nav_item(
                                        Page::Unpacker,
                                        "Unpacker",
                                        "Asset Studio",
                                        cx,
                                    ))
                                    .child(self.nav_item(
                                        Page::Design,
                                        "Design",
                                        "Config Editor",
                                        cx,
                                    ))
                                    .child(self.nav_item(Page::Gacha, "Gacha", "Warp Analyzer", cx))
                                    .child(self.nav_item(Page::Uid, "UID", "Relic", cx))
                                    .child(self.nav_item(
                                        Page::Config,
                                        "Config",
                                        "Claude Codex Gemini Grok",
                                        cx,
                                    ))
                                    .child(self.nav_item(
                                        Page::Console,
                                        "Console",
                                        "Live Logs",
                                        cx,
                                    )),
                            ),
                    )
                    .child(self.status_dot(cx)),
            )
    }

    fn title_bar(&self, cx: &Context<Self>) -> impl IntoElement {
        TitleBar::new()
            .bg(rgba(0x0a0c12f2))
            .border_b_1()
            .border_color(rgba(0xffffff14))
            .child(
                h_flex()
                    .items_center()
                    .gap_2()
                    .child(crate::ui::hsr_star(16.0, crate::theme::gold_strong()))
                    .child(
                        div()
                            .text_sm()
                            .font_weight(FontWeight::BOLD)
                            .text_color(cx.theme().foreground)
                            .child("HSR Owner"),
                    ),
            )
    }

    fn body(&self) -> AnyElement {
        match self.page {
            Page::Dumper => self.dumper.clone().into_any_element(),
            Page::Morax => self.morax.clone().into_any_element(),
            Page::Sniffer => self.sniffer.clone().into_any_element(),
            Page::Cheat => self.cheat.clone().into_any_element(),
            Page::Lua => self.lua.clone().into_any_element(),
            Page::Unpacker => self.unpacker.clone().into_any_element(),
            Page::Design => self.design.clone().into_any_element(),
            Page::Gacha => self.gacha.clone().into_any_element(),
            Page::Uid => self.uid.clone().into_any_element(),
            Page::Config => self.config.clone().into_any_element(),
            Page::Console => self.console.clone().into_any_element(),
        }
    }
}

impl Render for HsrApp {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let dialog_layer = Root::render_dialog_layer(window, cx);
        let notification_layer = Root::render_notification_layer(window, cx);
        let background = cx.theme().background;

        let current_bg = self.bg_frames.get(self.bg_frame_idx).cloned();
        let bg_canvas = render_background_video(current_bg);
        let star_canvas = render_starfield(&self.stars);

        div()
            .size_full()
            .relative()
            .bg(background)
            .child(bg_canvas.size_full().absolute().inset_0())
            .child(star_canvas.size_full().absolute().inset_0())
            .child(
                div()
                    .absolute()
                    .inset_0()
                    .size_full()
                    .bg(background.opacity(0.10)),
            )
            .child(
                v_flex().size_full().child(self.title_bar(cx)).child(
                    h_flex()
                        .flex_1()
                        .min_h_0()
                        .child(self.sidebar(cx))
                        .child(div().flex_1().min_w_0().h_full().child(self.body())),
                ),
            )
            .children(dialog_layer)
            .children(notification_layer)
    }
}
