use std::panic::{AssertUnwindSafe, catch_unwind};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use gpui::Context;

use crate::pages::design::{ConfigEntry, DesignPage};

fn schema_paths(cwd: &Path) -> (PathBuf, PathBuf) {
    let dump = cwd.join("DUMP");
    (dump.join("data.json"), dump.join("excel_paths.json"))
}

fn design_dir(cwd: &Path) -> PathBuf {
    cwd.join("StarRail_Data")
        .join("Persistent")
        .join("DesignData")
        .join("Windows")
}

fn lua_dir(cwd: &Path) -> PathBuf {
    cwd.join("StarRail_Data")
        .join("StreamingAssets")
        .join("Lua")
        .join("Windows")
}

impl DesignPage {
    pub(crate) fn parse(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }

        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let (data_json, excel_paths) = schema_paths(&cwd);
        if !data_json.is_file() || !excel_paths.is_file() {
            self.status =
                "data.json / excel_paths.json not found - run Dumper -> Data to generate them"
                    .into();
            cx.notify();
            return;
        }
        let design = design_dir(&cwd);
        if !design.is_dir() {
            self.status = format!("design data folder not found: {}", design.display());
            cx.notify();
            return;
        }

        let lua_input = lua_dir(&cwd);

        let parser_root = cwd.join("Parser");
        let design_out = parser_root.join("Design");
        let lua_out = parser_root.join("Lua");

        self.busy = true;
        self.status = "Loading design data...".into();
        self.source_label = design.display().to_string();
        self.reset_buffers();
        self.entries.clear();
        self.expanded.clear();
        cx.notify();

        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let loaded = {
                let (design, data_json, excel_paths) =
                    (design.clone(), data_json.clone(), excel_paths.clone());
                cx.background_executor()
                    .spawn(async move {
                        let asset = design::load_design_data(&design)?;
                        let types = design::load_types(&data_json)?;
                        let excel = design::load_excel_paths(&excel_paths).unwrap_or_default();
                        anyhow::Ok((asset, types, excel))
                    })
                    .await
            };
            let (asset, types, excel) = match loaded {
                Ok(v) => v,
                Err(err) => {
                    view.update(cx, |this, cx| {
                        this.status = format!("Parse failed: {err:#}");
                        this.busy = false;
                        cx.notify();
                    });
                    return;
                }
            };
            let (asset, types, excel) = (Arc::new(asset), Arc::new(types), Arc::new(excel));

            view.update(cx, |this, cx| {
                this.status = "Parsing excel...".into();
                cx.notify();
            });
            {
                let (a, t, e, o) = (
                    asset.clone(),
                    types.clone(),
                    excel.clone(),
                    design_out.clone(),
                );
                cx.background_executor()
                    .spawn(async move {
                        let _ = catch_unwind(AssertUnwindSafe(|| {
                            let _ = design::parse_excels(&a, &t, &e, &o);
                        }));
                    })
                    .await;
            }

            view.update(cx, |this, cx| {
                this.status = "Parsing textmap...".into();
                cx.notify();
            });
            {
                let (a, o) = (asset.clone(), design_out.clone());
                cx.background_executor()
                    .spawn(async move {
                        let _ = catch_unwind(AssertUnwindSafe(|| {
                            let _ = design::parse_textmaps(&a, &o);
                        }));
                    })
                    .await;
            }

            view.update(cx, |this, cx| {
                this.status = "Parsing config...".into();
                cx.notify();
            });
            let cfg_err = {
                let (a, t, o) = (asset.clone(), types.clone(), design_out.clone());
                cx.background_executor()
                    .spawn(async move {
                        match catch_unwind(AssertUnwindSafe(|| design::parse_configs(&a, &t, &o))) {
                            Ok(Ok(())) => None,
                            Ok(Err(e)) => Some(format!("{e:#}")),
                            Err(_) => Some("config parse panicked".to_string()),
                        }
                    })
                    .await
            };

            view.update(cx, |this, cx| {
                this.status = "Decompiling Lua...".into();
                cx.notify();
            });
            let lua_err = if !lua_input.is_dir() {
                Some(format!("Lua folder not found: {}", lua_input.display()))
            } else {
                let (input, out) = (lua_input.clone(), lua_out.clone());
                cx.background_executor()
                    .spawn(async move {
                        match catch_unwind(AssertUnwindSafe(|| {
                            design::decompile_lua_archive(&input, &out)
                        })) {
                            Ok(Ok(())) => None,
                            Ok(Err(e)) => Some(e),
                            Err(_) => Some("lua decompile panicked".to_string()),
                        }
                    })
                    .await
            };

            view.update(cx, |this, cx| {
                this.status = "Scanning...".into();
                cx.notify();
            });
            let entries = {
                let (d, l) = (design_out.clone(), lua_out.clone());
                cx.background_executor()
                    .spawn(async move {
                        let mut out = Vec::new();
                        scan_dir_prefixed(&d, "Design", &mut out);
                        scan_dir_prefixed(&l, "Lua", &mut out);
                        out
                    })
                    .await
            };

            view.update(cx, |this, cx| {
                let mut msg = match &cfg_err {
                    Some(e) => format!("{} files (config error: {e})", entries.len()),
                    None => format!("{} files parsed.", entries.len()),
                };
                if let Some(e) = &lua_err {
                    msg.push_str(&format!("  ·  lua: {e}"));
                }
                this.status = msg;
                this.root = Some(parser_root);
                this.entries = entries;
                this.rebuild_tree(cx);
                this.busy = false;
                cx.notify();
            });
        })
        .detach();
    }

    pub(crate) fn open_folder(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let Some(handle) = rfd::AsyncFileDialog::new().pick_folder().await else {
                return;
            };
            let root = handle.path().to_path_buf();
            let scan_root = root.clone();
            let entries = cx
                .background_executor()
                .spawn(async move { scan_dir(&scan_root) })
                .await;

            view.update(cx, |this, cx| {
                this.source_label = root.display().to_string();
                this.status = format!("{} files.", entries.len());
                this.root = Some(root);
                this.entries = entries;
                this.reset_buffers();
                this.expanded.clear();
                this.rebuild_tree(cx);
                cx.notify();
            });
        })
        .detach();
    }

    pub(crate) fn edit(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }

        let mut files: Vec<(String, String)> = Vec::new();
        let mut invalid: Vec<String> = Vec::new();
        let mut writes: Vec<(PathBuf, String)> = Vec::new();
        for &idx in &self.dirty {
            if let Some(entry) = self.entries.get(idx) {
                if entry.is_lua {
                    continue;
                }
                let text = self.buffers.get(&idx).cloned().unwrap_or_default();
                if serde_json::from_str::<serde_json::Value>(&text).is_err() {
                    invalid.push(entry.rel.clone());
                } else {
                    let build_rel = entry
                        .rel
                        .strip_prefix("Design/")
                        .unwrap_or(&entry.rel)
                        .to_string();
                    writes.push((entry.abs.clone(), text.clone()));
                    files.push((build_rel, text));
                }
            }
        }
        if !invalid.is_empty() {
            self.status = format!("Invalid JSON, please fix: {}", invalid.join(", "));
            cx.notify();
            return;
        }
        if files.is_empty() {
            self.status = "No modified files.".into();
            cx.notify();
            return;
        }

        for (abs, text) in &writes {
            let _ = std::fs::write(abs, text);
        }

        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let (data_json, excel_paths) = schema_paths(&cwd);
        if !data_json.is_file() {
            self.status = "data.json not found - run Dumper -> Data to generate it".into();
            cx.notify();
            return;
        }
        let design = design_dir(&cwd);
        let out_dir = cwd.join("Parser").join("EditOutput");
        let built_idxs: Vec<usize> = self.dirty.iter().copied().collect();

        self.busy = true;
        self.status = format!("Building bytes for {} file(s)...", files.len());
        cx.notify();

        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let out_show = out_dir.clone();
            let result = cx
                .background_executor()
                .spawn(async move {
                    match catch_unwind(AssertUnwindSafe(|| {
                        design::build_files(
                            &design,
                            &data_json,
                            &excel_paths,
                            &files,
                            &out_dir,
                            false,
                        )
                    })) {
                        Ok(r) => r,
                        Err(_) => Err(anyhow::anyhow!("build panicked")),
                    }
                })
                .await;

            view.update(cx, |this, cx| {
                match result {
                    Ok(written) => {
                        this.status =
                            format!("Wrote {} .bytes to {}", written.len(), out_show.display());
                        for idx in built_idxs {
                            if let Some(buf) = this.buffers.get(&idx).cloned() {
                                this.original.insert(idx, buf);
                            }
                            this.dirty.remove(&idx);
                        }
                    }
                    Err(err) => this.status = format!("Build failed: {err:#}"),
                }
                this.busy = false;
                cx.notify();
            });
        })
        .detach();
    }

    fn reset_buffers(&mut self) {
        self.selected = None;
        self.open.clear();
        self.buffers.clear();
        self.original.clear();
        self.dirty.clear();
    }
}

fn scan_dir(root: &Path) -> Vec<ConfigEntry> {
    let mut out = Vec::new();
    scan_dir_prefixed(root, "", &mut out);
    out
}

fn scan_dir_prefixed(root: &Path, prefix: &str, out: &mut Vec<ConfigEntry>) {
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let Ok(read) = std::fs::read_dir(&dir) else {
            continue;
        };
        for entry in read.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
                continue;
            };
            let is_lua = ext.eq_ignore_ascii_case("lua");
            let is_json = ext.eq_ignore_ascii_case("json");
            if !(is_lua || is_json) {
                continue;
            }
            if let Some(rel) = rel_path(root, &path) {
                let rel = if prefix.is_empty() {
                    rel
                } else {
                    format!("{prefix}/{rel}")
                };
                out.push(ConfigEntry {
                    rel,
                    abs: path,
                    is_lua,
                });
            }
        }
    }
}

fn rel_path(root: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(root).ok()?;
    Some(rel.to_string_lossy().replace('\\', "/"))
}
