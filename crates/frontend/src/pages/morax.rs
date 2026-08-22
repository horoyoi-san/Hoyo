use gpui::*;
use gpui_component::{
    ActiveTheme, Disableable,
    button::{Button, ButtonVariants as _},
    h_flex, v_flex,
};
use morax::Metadata;
use rayon::prelude::*;
use std::path::PathBuf;
use std::time::Instant;

const OUTPUT_COUNT: usize = 5;

pub struct MoraxPage {
    status: String,
    busy: bool,
}

impl MoraxPage {
    pub fn new(_window: &mut Window, _cx: &mut Context<Self>) -> Self {
        Self {
            status: "Idle — resolves game files next to the executable.".into(),
            busy: false,
        }
    }

    fn crack(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }

        let root = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let game = root.join("GameAssembly.dll");
        let meta_dir = root
            .join("StarRail_Data")
            .join("il2cpp_data")
            .join("Metadata");
        let global = meta_dir.join("global-metadata.dat");
        let startup = meta_dir.join("startup-metadata.dat");

        for path in [&game, &global, &startup] {
            if !path.exists() {
                self.status = format!("Missing input: {}", path.display());
                cx.notify();
                return;
            }
        }

        self.busy = true;
        self.status = "Cracking…".into();

        let (tx, rx) = smol::channel::bounded(1);
        let builder = std::thread::Builder::new().stack_size(16 * 1024 * 1024);
        let _ = builder.spawn(move || {
            let _ = tx.send_blocking(dump_morax(game, global, startup));
        });

        cx.spawn(async move |this, cx| {
            let outcome = rx.recv().await;
            let _ = this.update(cx, |page, cx| {
                page.busy = false;
                page.status = match outcome {
                    Ok(Ok((seconds, summary))) => format!("Done in {seconds:.2}s · {summary}"),
                    Ok(Err(error)) => format!("Failed: {error}"),
                    Err(_) => "Failed: worker stopped unexpectedly".into(),
                };
                cx.notify();
            });
        })
        .detach();

        cx.notify();
    }
}

fn dump_morax(game: PathBuf, global: PathBuf, startup: PathBuf) -> Result<(f64, String), String> {
    let total = Instant::now();
    let out_dir = game
        .parent().map_or_else(|| PathBuf::from("Morax"), |parent| parent.join("Morax"));

    let global_data =
        std::fs::read(&global).map_err(|error| format!("read {}: {error}", global.display()))?;
    let metadata =
        Metadata::load(&game, global_data, &startup).map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&out_dir)
        .map_err(|error| format!("create {}: {error}", out_dir.display()))?;

    let md = &metadata;
    let out = &out_dir;
    type Job<'a> = (
        &'static str,
        Box<dyn Fn() -> morax::Result<()> + Send + Sync + 'a>,
    );
    let jobs: Vec<Job> = vec![
        (
            "dump.cs",
            Box::new(move || {
                Ok(std::fs::write(
                    out.join("dump.cs"),
                    morax::dump::build_dump_cs(md)?,
                )?)
            }),
        ),
        (
            "script.json",
            Box::new(move || {
                Ok(std::fs::write(
                    out.join("script.json"),
                    morax::script::build_script_json(md)?,
                )?)
            }),
        ),
        (
            "il2cpp.h",
            Box::new(move || {
                Ok(std::fs::write(
                    out.join("il2cpp.h"),
                    morax::il2cpp_header::build_il2cpp_h(md)?,
                )?)
            }),
        ),
        (
            "stringLiterals.json",
            Box::new(move || {
                Ok(std::fs::write(
                    out.join("stringLiterals.json"),
                    morax::script::build_string_literals(md)?,
                )?)
            }),
        ),
        (
            "DummyDll",
            Box::new(move || {
                morax::dummydll::build_dummy_dll(md, &out.join("DummyDll"))?;
                Ok(())
            }),
        ),
    ];

    let results: Vec<(&'static str, morax::Result<()>)> = jobs
        .into_par_iter()
        .map(|(name, job)| (name, job()))
        .collect();

    let mut ok = 0usize;
    for (name, result) in results {
        match result {
            Ok(()) => ok += 1,
            Err(error) => return Err(format!("{name}: {error}")),
        }
    }

    Ok((
        total.elapsed().as_secs_f64(),
        format!("{ok}/{OUTPUT_COUNT} outputs → {}", out_dir.display()),
    ))
}

impl Render for MoraxPage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let muted = cx.theme().muted_foreground;
        let busy = self.busy;

        let card = crate::ui::card(cx).child(
            h_flex()
                .justify_between()
                .items_start()
                .gap_4()
                .child(
                    v_flex()
                        .gap_1()
                        .child(div().font_weight(FontWeight::BOLD).text_color(cx.theme().foreground).child("Crack Morax"))
                        .child(div().text_sm().text_color(muted).child(
                            "Crack morax-obfuscated IL2CPP metadata → dump.cs, script.json, il2cpp.h, stringLiterals.json & DummyDll",
                        )),
                )
                .child(
                    Button::new("crack-morax")
                        .custom(crate::components::ui::gold_button_variant(cx))
                        .label(if busy { "Cracking…" } else { "Crack Morax" })
                        .disabled(busy)
                        .on_click(cx.listener(|this, _, _, cx| this.crack(cx))),
                ),
        );

        v_flex()
            .size_full()
            .p_4()
            .gap_3()
            .child(crate::ui::page_header(
                "Morax",
                "Crack morax-obfuscated IL2CPP metadata into a full dump",
                cx,
            ))
            .child(div().text_sm().text_color(muted).child(self.status.clone()))
            .child(
                div()
                    .id("morax-scroll")
                    .flex_1()
                    .overflow_y_scroll()
                    .child(v_flex().gap_3().child(card)),
            )
    }
}
