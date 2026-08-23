use std::panic::{AssertUnwindSafe, catch_unwind};
use std::path::PathBuf;
use std::time::Instant;

use gpui::prelude::FluentBuilder as _;
use gpui::*;
use gpui_component::{
    ActiveTheme, Disableable, Sizable as _,
    button::{Button, ButtonVariants as _},
    h_flex, v_flex,
};

use crate::game_manager::{self, GameDirValidation};

enum ExtractorMsg {
    Log(String),
    Status(String),
    Finished(Result<(f64, String), String>),
}

pub struct ExtractorPage {
    validation: GameDirValidation,
    is_busy: bool,
    status_message: String,
    logs: Vec<String>,
}

impl ExtractorPage {
    pub fn new(_window: &mut Window, _cx: &mut Context<Self>) -> Self {
        let validation = game_manager::get_game_dir()
            .map(|p| game_manager::validate_game_dir(&p))
            .unwrap_or_default();

        let status_message = if validation.is_valid {
            format!("Game folder ready: {}", validation.path.display())
        } else {
            "Please select your Honkai: Star Rail game directory to start extracting raw data."
                .to_string()
        };

        Self {
            validation,
            is_busy: false,
            status_message,
            logs: vec!["Ready to extract game data without running the game.".to_string()],
        }
    }

    pub fn refresh_game_dir(&mut self, cx: &mut Context<Self>) {
        if let Some(path) = game_manager::get_game_dir() {
            self.validation = game_manager::validate_game_dir(&path);
            if self.validation.is_valid {
                self.status_message = format!("Game folder ready: {}", self.validation.path.display());
            } else {
                self.status_message = "Selected folder does not seem to contain game files.".to_string();
            }
        } else {
            self.validation = GameDirValidation::default();
            self.status_message = "No game folder selected.".to_string();
        }
        cx.notify();
    }

    fn browse_folder(&mut self, cx: &mut Context<Self>) {
        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let mut dialog = rfd::AsyncFileDialog::new().set_title("Select Honkai: Star Rail Game Directory");
            if let Some(current) = game_manager::get_game_dir() {
                dialog = dialog.set_directory(current);
            }
            let Some(handle) = dialog.pick_folder().await else {
                return;
            };
            let path = handle.path().to_path_buf();
            view.update(cx, |this, cx| {
                this.validation = game_manager::set_game_dir(path.clone());
                this.status_message = format!("Loaded: {}", path.display());
                this.logs
                    .push(format!("Selected game directory: {}", path.display()));
                cx.notify();
            });
        })
        .detach();
    }

    fn auto_detect(&mut self, cx: &mut Context<Self>) {
        self.status_message = "Auto-detecting game folder...".into();
        cx.notify();
        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let detected = smol::unblock(game_manager::auto_detect_game_dir).await;
            view.update(cx, |this, cx| {
                if let Some(folder) = detected {
                    this.validation = game_manager::set_game_dir(folder.clone());
                    this.status_message = format!("Auto-detected: {}", folder.display());
                    this.logs
                        .push(format!("Auto-detected game directory: {}", folder.display()));
                } else {
                    this.status_message =
                        "Could not auto-detect game folder. Please browse manually.".into();
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn open_game_folder(&self) {
        if self.validation.is_valid {
            let _ = std::process::Command::new("explorer")
                .arg(&self.validation.path)
                .spawn();
        }
    }

    fn open_output_folder(&self) {
        let out_dir = game_manager::default_dump_output_dir();
        let _ = std::fs::create_dir_all(&out_dir);
        let _ = std::process::Command::new("explorer")
            .arg(&out_dir)
            .spawn();
    }

    fn extract_il2cpp(&mut self, cx: &mut Context<Self>) {
        if self.is_busy || !self.validation.is_valid {
            return;
        }

        let game_dir = self.validation.path.clone();
        let game = game_dir.join("GameAssembly.dll");
        let meta_dir = game_dir
            .join("StarRail_Data")
            .join("il2cpp_data")
            .join("Metadata");
        let global = meta_dir.join("global-metadata.dat");
        let startup = meta_dir.join("startup-metadata.dat");
        let out_dir = game_manager::default_dump_output_dir().join("IL2CPP");

        if !game.exists() || !global.exists() {
            self.status_message = "Error: GameAssembly.dll or global-metadata.dat missing.".into();
            cx.notify();
            return;
        }

        self.is_busy = true;
        self.status_message = "Starting IL2CPP extraction...".into();
        self.logs
            .push(format!("Starting IL2CPP extraction to {}", out_dir.display()));

        let (tx, rx) = smol::channel::bounded(32);
        std::thread::Builder::new()
            .name("il2cpp-extractor".into())
            .stack_size(32 * 1024 * 1024)
            .spawn(move || {
                let worker_res = catch_unwind(AssertUnwindSafe(|| {
                    extract_il2cpp_safe(game, global, startup, out_dir, &tx)
                }));

                let final_res = match worker_res {
                    Ok(r) => r,
                    Err(p) => {
                        let err_str = if let Some(s) = p.downcast_ref::<&str>() {
                            s.to_string()
                        } else if let Some(s) = p.downcast_ref::<String>() {
                            s.clone()
                        } else {
                            "Unknown panic occurred in extraction worker".to_string()
                        };
                        Err(format!("Worker panic: {err_str}"))
                    }
                };

                let _ = tx.send_blocking(ExtractorMsg::Finished(final_res));
            })
            .ok();

        cx.spawn(async move |this, cx| {
            while let Ok(msg) = rx.recv().await {
                let _ = this.update(cx, |page, cx| {
                    match msg {
                        ExtractorMsg::Log(line) => {
                            page.logs.push(line);
                        }
                        ExtractorMsg::Status(status) => {
                            page.status_message = status;
                        }
                        ExtractorMsg::Finished(outcome) => {
                            page.is_busy = false;
                            match outcome {
                                Ok((secs, summary)) => {
                                    page.status_message =
                                        format!("IL2CPP extracted in {secs:.2}s: {summary}");
                                    page.logs.push(format!(
                                        "✓ IL2CPP extracted in {secs:.2}s ({summary})"
                                    ));
                                }
                                Err(err) => {
                                    page.status_message = format!("IL2CPP extraction failed: {err}");
                                    page.logs.push(format!("✗ IL2CPP failed: {err}"));
                                }
                            }
                        }
                    }
                    cx.notify();
                });
            }
        })
        .detach();

        cx.notify();
    }

    fn extract_all_raw_data(&mut self, cx: &mut Context<Self>) {
        if self.is_busy || !self.validation.is_valid {
            return;
        }

        self.extract_il2cpp(cx);
    }
}

fn extract_il2cpp_safe(
    game: PathBuf,
    global: PathBuf,
    startup: PathBuf,
    out_dir: PathBuf,
    tx: &smol::channel::Sender<ExtractorMsg>,
) -> Result<(f64, String), String> {
    let start = Instant::now();

    let _ = tx.send_blocking(ExtractorMsg::Status(
        "Step 1/6: Reading GameAssembly.dll & metadata files...".into(),
    ));
    let _ = tx.send_blocking(ExtractorMsg::Log(
        "Reading GameAssembly.dll and global-metadata.dat...".into(),
    ));

    let global_data =
        std::fs::read(&global).map_err(|e| format!("read {}: {e}", global.display()))?;

    let _ = tx.send_blocking(ExtractorMsg::Status(
        "Step 2/6: Parsing PE headers & decoding metadata...".into(),
    ));

    let metadata = catch_unwind(AssertUnwindSafe(|| {
        morax::Metadata::load(&game, global_data, &startup)
    }))
    .map_err(|_| "Metadata::load encountered an unexpected error / panic".to_string())?
    .map_err(|e| format!("Failed to parse metadata: {e}"))?;

    std::fs::create_dir_all(&out_dir)
        .map_err(|e| format!("create {}: {e}", out_dir.display()))?;

    let md = &metadata;
    let out = &out_dir;

    let mut ok_count = 0usize;

    // 1. dump.cs
    let _ = tx.send_blocking(ExtractorMsg::Status(
        "Step 3/6: Generating dump.cs (C# Type Declarations)...".into(),
    ));
    let _ = tx.send_blocking(ExtractorMsg::Log("Generating dump.cs...".into()));
    let dump_cs_res = catch_unwind(AssertUnwindSafe(|| {
        morax::dump::build_dump_cs(md)
            .and_then(|cs| Ok(std::fs::write(out.join("dump.cs"), cs)?))
    }));
    match dump_cs_res {
        Ok(Ok(())) => {
            ok_count += 1;
            let _ = tx.send_blocking(ExtractorMsg::Log("✓ dump.cs created".into()));
        }
        Ok(Err(e)) => {
            let _ = tx.send_blocking(ExtractorMsg::Log(format!("⚠ dump.cs error: {e}")));
        }
        Err(_) => {
            let _ = tx.send_blocking(ExtractorMsg::Log("⚠ dump.cs generation panicked".into()));
        }
    }

    // 2. il2cpp.h
    let _ = tx.send_blocking(ExtractorMsg::Status(
        "Step 4/6: Generating il2cpp.h (C++ Structs & Headers)...".into(),
    ));
    let _ = tx.send_blocking(ExtractorMsg::Log("Generating il2cpp.h...".into()));
    let il2cpp_h_res = catch_unwind(AssertUnwindSafe(|| {
        morax::il2cpp_header::build_il2cpp_h(md)
            .and_then(|h| Ok(std::fs::write(out.join("il2cpp.h"), h)?))
    }));
    match il2cpp_h_res {
        Ok(Ok(())) => {
            ok_count += 1;
            let _ = tx.send_blocking(ExtractorMsg::Log("✓ il2cpp.h created".into()));
        }
        Ok(Err(e)) => {
            let _ = tx.send_blocking(ExtractorMsg::Log(format!("⚠ il2cpp.h error: {e}")));
        }
        Err(_) => {
            let _ = tx.send_blocking(ExtractorMsg::Log("⚠ il2cpp.h generation panicked".into()));
        }
    }

    // 3. stringLiterals.json
    let _ = tx.send_blocking(ExtractorMsg::Log("Generating stringLiterals.json...".into()));
    let strings_res = catch_unwind(AssertUnwindSafe(|| {
        morax::script::build_string_literals(md)
            .and_then(|json| Ok(std::fs::write(out.join("stringLiterals.json"), json)?))
    }));
    match strings_res {
        Ok(Ok(())) => {
            ok_count += 1;
            let _ = tx.send_blocking(ExtractorMsg::Log("✓ stringLiterals.json created".into()));
        }
        Ok(Err(e)) => {
            let _ = tx.send_blocking(ExtractorMsg::Log(format!("⚠ stringLiterals.json error: {e}")));
        }
        Err(_) => {
            let _ = tx.send_blocking(ExtractorMsg::Log("⚠ stringLiterals generation panicked".into()));
        }
    }

    // 4. script.json
    let _ = tx.send_blocking(ExtractorMsg::Status(
        "Step 5/6: Generating script.json (Ghidra / IDA Pro Symbol Map)...".into(),
    ));
    let _ = tx.send_blocking(ExtractorMsg::Log("Generating script.json...".into()));
    let script_res = catch_unwind(AssertUnwindSafe(|| {
        morax::script::build_script_json(md)
            .and_then(|json| Ok(std::fs::write(out.join("script.json"), json)?))
    }));
    match script_res {
        Ok(Ok(())) => {
            ok_count += 1;
            let _ = tx.send_blocking(ExtractorMsg::Log("✓ script.json created".into()));
        }
        Ok(Err(e)) => {
            let _ = tx.send_blocking(ExtractorMsg::Log(format!("⚠ script.json error: {e}")));
        }
        Err(_) => {
            let _ = tx.send_blocking(ExtractorMsg::Log("⚠ script.json generation panicked".into()));
        }
    }

    // 5. DummyDll
    let _ = tx.send_blocking(ExtractorMsg::Status(
        "Step 6/6: Building managed DummyDll assemblies...".into(),
    ));
    let _ = tx.send_blocking(ExtractorMsg::Log("Building DummyDll assemblies...".into()));
    let dummy_res = catch_unwind(AssertUnwindSafe(|| {
        morax::dummydll::build_dummy_dll(md, &out.join("DummyDll"))
    }));
    match dummy_res {
        Ok(Ok(count)) => {
            ok_count += 1;
            let _ = tx.send_blocking(ExtractorMsg::Log(format!(
                "✓ DummyDll assemblies built ({count} DLLs)"
            )));
        }
        Ok(Err(e)) => {
            let _ = tx.send_blocking(ExtractorMsg::Log(format!("⚠ DummyDll error: {e}")));
        }
        Err(_) => {
            let _ = tx.send_blocking(ExtractorMsg::Log("⚠ DummyDll building panicked".into()));
        }
    }

    let elapsed = start.elapsed().as_secs_f64();
    if ok_count == 0 {
        return Err("Extraction could not generate output files. Check logs for details.".into());
    }

    Ok((
        elapsed,
        format!("{ok_count}/5 outputs generated in {}", out_dir.display()),
    ))
}

impl Render for ExtractorPage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let is_valid = self.validation.is_valid;
        let busy = self.is_busy;

        let status_dot_bg = if is_valid {
            rgb(0x4cd964)
        } else {
            rgb(0xe05d5d)
        };

        // Path selector panel
        let path_card = crate::ui::card(cx).child(
            v_flex()
                .gap_3()
                .child(
                    h_flex()
                        .justify_between()
                        .items_center()
                        .child(
                            h_flex()
                                .gap_2()
                                .items_center()
                                .child(
                                    div()
                                        .size(px(10.))
                                        .rounded_full()
                                        .bg(status_dot_bg),
                                )
                                .child(
                                    div()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme.foreground)
                                        .child("Game Directory Location"),
                                ),
                        )
                        .child(
                            h_flex()
                                .gap_2()
                                .child(
                                    Button::new("auto-detect-btn")
                                        .label("Auto-Detect")
                                        .small()
                                        .ghost()
                                        .on_click(cx.listener(|this, _, _, cx| this.auto_detect(cx))),
                                )
                                .child(
                                    Button::new("browse-btn")
                                        .custom(crate::components::ui::gold_button_variant(cx))
                                        .label("Browse Folder...")
                                        .small()
                                        .on_click(cx.listener(|this, _, _, cx| this.browse_folder(cx))),
                                ),
                        ),
                )
                .child(
                    div()
                        .px_3()
                        .py_2()
                        .rounded(px(4.))
                        .bg(rgba(0x0e111acc))
                        .border_1()
                        .border_color(rgba(0xffffff14))
                        .text_sm()
                        .text_color(if is_valid {
                            theme.foreground
                        } else {
                            theme.muted_foreground
                        })
                        .child(if is_valid {
                            self.validation.path.to_string_lossy().to_string()
                        } else {
                            "No valid Honkai: Star Rail directory selected. Click 'Browse Folder...' or 'Auto-Detect'.".to_string()
                        }),
                )
                .child(
                    h_flex()
                        .gap_3()
                        .flex_wrap()
                        .child(file_badge("GameAssembly.dll", self.validation.has_game_assembly, theme))
                        .child(file_badge("IL2CPP Metadata", self.validation.has_metadata, theme))
                        .child(file_badge("Asset Blocks", self.validation.has_streaming_assets, theme))
                        .child(file_badge("Warp WebCache", self.validation.has_web_caches, theme))
                        .child(
                            div()
                                .flex_1()
                                .when(is_valid, |this| {
                                    this.child(
                                        h_flex()
                                            .justify_end()
                                            .gap_2()
                                            .child(
                                                Button::new("open-game-folder")
                                                    .label("Open Game Dir")
                                                    .ghost()
                                                    .small()
                                                    .on_click(cx.listener(|this, _, _, _| this.open_game_folder())),
                                            )
                                            .child(
                                                Button::new("open-output-folder")
                                                    .label("Open Output Dir")
                                                    .ghost()
                                                    .small()
                                                    .on_click(cx.listener(|this, _, _, _| this.open_output_folder())),
                                            ),
                                    )
                                }),
                        ),
                ),
        );

        // Tool cards
        let il2cpp_card = crate::ui::card(cx).child(
            h_flex()
                .justify_between()
                .items_start()
                .gap_4()
                .child(
                    v_flex()
                        .gap_1()
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme.foreground)
                                .child("1. Extract IL2CPP Metadata & Headers"),
                        )
                        .child(
                            div()
                                .text_sm()
                                .text_color(theme.muted_foreground)
                                .child("Extracts dump.cs, C++ headers (il2cpp.h), Ghidra/IDA script (script.json), stringLiterals.json, and managed DummyDlls directly without running the game."),
                        ),
                )
                .child(
                    Button::new("extract-il2cpp-btn")
                        .custom(crate::components::ui::gold_button_variant(cx))
                        .label(if busy { "Extracting..." } else { "Extract IL2CPP" })
                        .disabled(busy || !is_valid)
                        .on_click(cx.listener(|this, _, _, cx| this.extract_il2cpp(cx))),
                ),
        );

        let asset_card = crate::ui::card(cx).child(
            h_flex()
                .justify_between()
                .items_start()
                .gap_4()
                .child(
                    v_flex()
                        .gap_1()
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme.foreground)
                                .child("2. Unity Asset Bundles & Sprites (Unpacker)"),
                        )
                        .child(
                            div()
                                .text_sm()
                                .text_color(theme.muted_foreground)
                                .child(format!(
                                    "Scans StreamingAssets ({}) for character textures, UI icons, audio files, and Lua scripts with instant preview.",
                                    if self.validation.has_streaming_assets {
                                        format!("{} block files found", self.validation.asset_blocks_count)
                                    } else {
                                        "Not detected".to_string()
                                    }
                                )),
                        ),
                )
                .child(
                    Button::new("goto-unpacker-btn")
                        .label("Open Asset Unpacker")
                        .ghost()
                        .disabled(!is_valid),
                ),
        );

        let gacha_card = crate::ui::card(cx).child(
            h_flex()
                .justify_between()
                .items_start()
                .gap_4()
                .child(
                    v_flex()
                        .gap_1()
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme.foreground)
                                .child("3. Warp History & Gacha Analyzer"),
                        )
                        .child(
                            div()
                                .text_sm()
                                .text_color(theme.muted_foreground)
                                .child("Reads Warp cache from disk, extracts character/lightcone pull history, and calculates 5-star pity statistics without launching the game."),
                        ),
                )
                .child(
                    Button::new("goto-gacha-btn")
                        .label("Open Gacha Tool")
                        .ghost(),
                ),
        );

        // Action bar
        let action_bar = h_flex()
            .justify_between()
            .items_center()
            .child(
                div()
                    .text_sm()
                    .text_color(if busy {
                        crate::theme::gold_strong()
                    } else {
                        theme.muted_foreground
                    })
                    .child(self.status_message.clone()),
            )
            .child(
                Button::new("extract-all-btn")
                    .custom(crate::components::ui::gold_button_variant(cx))
                    .label(if busy { "Processing..." } else { "✦ Extract Raw Data" })
                    .disabled(busy || !is_valid)
                    .on_click(cx.listener(|this, _, _, cx| this.extract_all_raw_data(cx))),
            );

        // Logs display
        let logs_panel = div()
            .id("extractor-logs-scroll")
            .flex_1()
            .min_h(px(120.))
            .p_3()
            .rounded(px(6.))
            .bg(rgba(0x0a0c12f2))
            .border_1()
            .border_color(rgba(0xffffff14))
            .overflow_y_scroll()
            .child(
                v_flex()
                    .gap_1()
                    .children(self.logs.iter().rev().map(|log| {
                        div()
                            .text_xs()
                            .font_weight(FontWeight::NORMAL)
                            .text_color(if log.starts_with('✓') {
                                rgb(0x4cd964).into()
                            } else if log.starts_with('✗') || log.starts_with('⚠') {
                                rgb(0xe05d5d).into()
                            } else {
                                theme.muted_foreground
                            })
                            .child(log.clone())
                    })),
            );

        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .child(crate::ui::page_header(
                "Raw Data Extractor",
                "Extract metadata, headers, asset bundles, configs, and warp records offline without running the game.",
                cx,
            ))
            .child(path_card)
            .child(
                div()
                    .id("extractor-scroll")
                    .flex_1()
                    .overflow_y_scroll()
                    .child(
                        v_flex()
                            .gap_3()
                            .child(il2cpp_card)
                            .child(asset_card)
                            .child(gacha_card)
                            .child(logs_panel),
                    ),
            )
            .child(action_bar)
    }
}

fn file_badge(name: &str, exists: bool, theme: &gpui_component::Theme) -> AnyElement {
    let dot_bg = if exists {
        rgb(0x4cd964)
    } else {
        rgb(0xe05d5d)
    };

    h_flex()
        .gap_1p5()
        .items_center()
        .px_2()
        .py_1()
        .rounded(px(4.))
        .bg(if exists {
            rgba(0x4cd9641a)
        } else {
            rgba(0xe05d5d1a)
        })
        .border_1()
        .border_color(if exists {
            rgba(0x4cd96440)
        } else {
            rgba(0xe05d5d40)
        })
        .child(
            div()
                .size(px(6.))
                .rounded_full()
                .bg(dot_bg),
        )
        .child(
            div()
                .text_xs()
                .font_weight(FontWeight::MEDIUM)
                .text_color(if exists {
                    rgb(0x4cd964).into()
                } else {
                    theme.muted_foreground
                })
                .child(name.to_string()),
        )
        .into_any_element()
}
