#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod assets;
mod cheat;
mod components;
mod config_store;
mod ipc;
mod logging;
mod pages;
mod proto;
mod theme;
mod ui;

use gpui::*;
use gpui_component::Root;
use mimalloc::MiMalloc;

#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

fn main() {
    let _ = rayon::ThreadPoolBuilder::new()
        .stack_size(16 * 1024 * 1024)
        .build_global();

    logging::init();

    let app = gpui_platform::application().with_assets(assets::Assets);

    app.run(move |cx: &mut App| {
        gpui_component::init(cx);

        logging::start_backend_log_stream();
        cheat::model::uid_import::start();

        let options = WindowOptions {
            window_bounds: Some(WindowBounds::centered(size(px(980.), px(640.)), cx)),
            titlebar: Some(gpui_component::TitleBar::title_bar_options()),
            ..Default::default()
        };

        cx.spawn(async move |cx| {
            cx.open_window(options, |window, cx| {
                window.set_window_title("HSR Owner");
                crate::theme::apply(window, cx);

                let view = cx.new(|cx| app::HsrApp::new(window, cx));
                cx.new(|cx| Root::new(view, window, cx))
            })
            .expect("failed to open window");
        })
        .detach();
    });
}
