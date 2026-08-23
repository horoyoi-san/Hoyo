use std::path::PathBuf;

use gpui::Context;
use unpacker::{AssetEntry, ExtractOptions, ExtractStats};

use super::model::{PreviewReq, UnpackMsg};
use super::workers::copy_rgba_to_clipboard;
use super::{KEEP_FILTER, UnpackerPage};

impl UnpackerPage {
    pub(super) fn load(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let Some(handle) = rfd::AsyncFileDialog::new().pick_folder().await else {
                return;
            };
            let path = handle.path().to_path_buf();
            view.update(cx, |this, cx| {
                this.source_label = path.display().to_string();
                this.roots = vec![path];
                this.start_scan(cx);
            });
        })
        .detach();
    }

    pub(super) fn start_scan(&mut self, cx: &mut Context<Self>) {
        if self.roots.is_empty() {
            return;
        }
        self.busy = true;
        self.status = "Loading…".into();
        let roots = self.roots.clone();
        let tx = self.tx.clone();
        std::thread::spawn(move || {
            use rayon::prelude::*;
            use std::sync::atomic::{AtomicUsize, Ordering};

            let mut blocks = Vec::new();
            for r in &roots {
                blocks.extend(unpacker::collect_block_files(r));
            }
            let total = blocks.len();
            let keep = KEEP_FILTER.to_lowercase();
            let done = AtomicUsize::new(0);

            let all: Vec<AssetEntry> = blocks
                .par_iter()
                .map_with(tx.clone(), |tx, b| {
                    let mut v = Vec::new();
                    if let Ok(entries) = unpacker::scan_block(b) {
                        for e in entries {
                            if e.is_texture() && e.container.to_lowercase().contains(&keep) {
                                v.push(e);
                            }
                        }
                    }
                    let n = done.fetch_add(1, Ordering::Relaxed) + 1;
                    if n % 50 == 0 || n == total {
                        let _ = tx.send(UnpackMsg::ScanProgress(n, total));
                    }
                    v
                })
                .flatten()
                .collect();

            let _ = tx.send(UnpackMsg::ScanDone(all));
        });
        cx.notify();
    }

    pub(super) fn export(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        if self.roots.is_empty() {
            self.status = "Load a folder first.".into();
            cx.notify();
            return;
        }
        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let Some(handle) = rfd::AsyncFileDialog::new().pick_folder().await else {
                return;
            };
            let out_dir = handle.path().to_path_buf();
            view.update(cx, |this, cx| {
                this.start_export(out_dir, cx);
            });
        })
        .detach();
    }

    fn start_export(&mut self, out_dir: PathBuf, cx: &mut Context<Self>) {
        self.busy = true;
        self.status = "Exporting…".into();
        log::info!("[Unpacker] export → {}", out_dir.display());

        let roots = self.roots.clone();
        let tx = self.tx.clone();
        let opts = ExtractOptions {
            textures: true,
            text: false,
            fonts: true,
            filter: Some(KEEP_FILTER.to_string()),
        };
        let builder = std::thread::Builder::new().stack_size(16 * 1024 * 1024);
        let _ = builder.spawn(move || {
            use rayon::prelude::*;
            use std::sync::atomic::{AtomicUsize, Ordering};

            let mut blocks = Vec::new();
            for r in &roots {
                blocks.extend(unpacker::collect_block_files(r));
            }
            let total = blocks.len();

            let workers = std::thread::available_parallelism()
                .map_or(4, |n| n.get().saturating_sub(1).clamp(2, 8));

            let pool = match rayon::ThreadPoolBuilder::new()
                .num_threads(workers)
                .stack_size(16 * 1024 * 1024)
                .build()
            {
                Ok(p) => p,
                Err(e) => {
                    log::error!("[unpacker] export thread pool build failed: {e}");
                    let _ = tx.send(UnpackMsg::ExtractDone(ExtractStats {
                        blocks: 0,
                        errors: total,
                        ..Default::default()
                    }));
                    return;
                }
            };

            let done = AtomicUsize::new(0);
            let extracted = AtomicUsize::new(0);
            let skipped = AtomicUsize::new(0);
            let errors = AtomicUsize::new(0);

            let tx_done = tx.clone();
            pool.install(|| {
                blocks.par_iter().for_each_with(tx, |tx, block| {
                    match unpacker::extract_block(block, &out_dir, &opts) {
                        Ok(s) => {
                            extracted.fetch_add(s.extracted, Ordering::Relaxed);
                            skipped.fetch_add(s.skipped, Ordering::Relaxed);
                            errors.fetch_add(s.errors, Ordering::Relaxed);
                        }
                        Err(_) => {
                            errors.fetch_add(1, Ordering::Relaxed);
                        }
                    }
                    let n = done.fetch_add(1, Ordering::Relaxed) + 1;
                    let snapshot = ExtractStats {
                        blocks: n,
                        extracted: extracted.load(Ordering::Relaxed),
                        skipped: skipped.load(Ordering::Relaxed),
                        errors: errors.load(Ordering::Relaxed),
                    };
                    let _ = tx.send(UnpackMsg::ExtractProgress(n, total, snapshot));
                });
            });

            let final_stats = ExtractStats {
                blocks: total,
                extracted: extracted.load(Ordering::Relaxed),
                skipped: skipped.load(Ordering::Relaxed),
                errors: errors.load(Ordering::Relaxed),
            };
            let _ = tx_done.send(UnpackMsg::ExtractDone(final_stats));
        });
        cx.notify();
    }

    pub(super) fn select(&mut self, idx: usize, cx: &mut Context<Self>) {
        let Some(entry) = self.assets.get(idx).cloned() else {
            return;
        };
        self.selected = Some(idx);
        if let Some(old) = self.preview.take() {
            self.pending_drops.push(old);
        }
        self.preview_rgba = None;
        self.preview_error = Some("Decoding…".into());
        let _ = self.preview_tx.send(PreviewReq {
            block: entry.block,
            path_id: entry.path_id,
        });
        cx.notify();
    }

    pub(super) fn copy_preview(&mut self, cx: &mut Context<Self>) {
        let Some(rgba) = self.preview_rgba.clone() else {
            return;
        };
        self.status = match copy_rgba_to_clipboard(&rgba) {
            Ok(()) => "Copied image to clipboard.".into(),
            Err(e) => format!("Copy failed: {e}"),
        };
        cx.notify();
    }
}
