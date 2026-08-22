mod asset_meta;
mod builder;
mod bytes;
mod common;
mod edit;
mod lua;
mod parse;
mod parser;

use std::collections::{HashMap, HashSet};
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Context, Result};
use serde_json::Value;

pub use crate::builder::DynamicBuilder;
pub use crate::common::data_define::{DataDefine, ValueKind};
pub use crate::common::downloader::DownloadedAssetInfo;
pub use crate::parser::DynamicParser;
pub use lua::decompile_lua_archive;

pub type Types = HashMap<String, DataDefine>;
pub type ExcelPaths = HashMap<String, Vec<String>>;

pub fn load_types(data_json: &Path) -> Result<Types> {
    let bytes = std::fs::read(data_json)
        .with_context(|| format!("failed to read data.json: {}", data_json.display()))?;
    serde_json::from_slice(&bytes).context("data.json is not a valid type schema")
}

pub fn load_excel_paths(excel_paths_json: &Path) -> Result<ExcelPaths> {
    let bytes = std::fs::read(excel_paths_json).with_context(|| {
        format!(
            "failed to read excel_paths.json: {}",
            excel_paths_json.display()
        )
    })?;
    serde_json::from_slice(&bytes).context("excel_paths.json is not valid")
}

pub fn load_design_data(input_dir: &Path) -> Result<DownloadedAssetInfo> {
    let mut all_bytes: HashMap<String, Arc<Vec<u8>>> = HashMap::new();
    let mut stack = vec![input_dir.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let read = std::fs::read_dir(&dir)
            .with_context(|| format!("failed to read design dir: {}", dir.display()))?;
        for entry in read.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path
                .extension()
                .is_some_and(|e| e.eq_ignore_ascii_case("bytes"))
                && let Some(name) = path.file_name().map(|n| n.to_string_lossy().into_owned())
            {
                let data = std::fs::read(&path)
                    .with_context(|| format!("failed to read {}", path.display()))?;
                all_bytes.insert(name, Arc::new(data));
            }
        }
    }

    if all_bytes.is_empty() {
        anyhow::bail!("no .bytes files found under {}", input_dir.display());
    }

    common::downloader::parse_all_design_data_from_memory(&all_bytes, &[])
        .context("failed to assemble design data from local .bytes")
}

pub fn parse_all(
    input_dir: &Path,
    data_json: &Path,
    excel_paths_json: &Path,
    out_dir: &Path,
) -> Result<()> {
    let asset = load_design_data(input_dir)?;
    let types = load_types(data_json)?;
    let excel_paths = load_excel_paths(excel_paths_json).unwrap_or_default();
    let assets = &asset.design_data_list;

    best_effort(|| parse::excel::parse_all_excels(assets, &types, out_dir, &excel_paths));
    best_effort(|| parse::textmap::parse_all_textmap(assets, out_dir, true));

    catch_unwind(AssertUnwindSafe(|| {
        parse::config::parse_configs(assets, &types, out_dir, None)
    }))
    .map_err(|_| anyhow::anyhow!("parse_configs panicked"))?
    .context("parse_configs failed")
}

pub fn parse_excels(
    asset: &DownloadedAssetInfo,
    types: &Types,
    excel_paths: &ExcelPaths,
    out_dir: &Path,
) -> Result<()> {
    parse::excel::parse_all_excels(&asset.design_data_list, types, out_dir, excel_paths)
}

pub fn parse_textmaps(asset: &DownloadedAssetInfo, out_dir: &Path) -> Result<()> {
    parse::textmap::parse_all_textmap(&asset.design_data_list, out_dir, true)
}

pub fn parse_configs(asset: &DownloadedAssetInfo, types: &Types, out_dir: &Path) -> Result<()> {
    parse::config::parse_configs(&asset.design_data_list, types, out_dir, None)
}

pub fn build_files(
    input_dir: &Path,
    data_json: &Path,
    excel_paths_json: &Path,
    files: &[(String, String)],
    out_dir: &Path,
    change_md5: bool,
) -> Result<Vec<String>> {
    let temp = std::env::temp_dir().join("hsr-traingame-build");
    let _ = std::fs::remove_dir_all(&temp);
    for (rel, text) in files {
        let staged = temp.join(rel);
        if let Some(parent) = staged.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("failed to stage {}", parent.display()))?;
        }
        std::fs::write(&staged, text).with_context(|| format!("failed to stage {rel}"))?;
    }
    build_edits(
        input_dir,
        data_json,
        excel_paths_json,
        &temp,
        out_dir,
        change_md5,
    )
}

pub fn build_edits(
    input_dir: &Path,
    data_json: &Path,
    excel_paths_json: &Path,
    edited_dir: &Path,
    out_dir: &Path,
    change_md5: bool,
) -> Result<Vec<String>> {
    let mut asset = load_design_data(input_dir)?;
    let types = load_types(data_json)?;
    let excel_paths = load_excel_paths(excel_paths_json).unwrap_or_default();

    let mut modified = HashSet::new();
    best_effort(|| {
        edit::textmap::modify_textmaps(&edited_dir.join("TextMap"), &mut asset, &mut modified)
    });
    best_effort(|| {
        edit::excel::modify_excels(
            &edited_dir.join("ExcelOutput"),
            &mut asset,
            &types,
            &excel_paths,
            &mut modified,
        )
    });
    best_effort(|| {
        edit::config::modify_configs(
            &edited_dir.join("Config"),
            &mut asset,
            &types,
            &mut modified,
        )
    });

    if modified.is_empty() {
        anyhow::bail!("no data was modified under {}", edited_dir.display());
    }

    let result = edit::compile_modified_files(&mut asset, &modified, change_md5);

    let mut written = Vec::with_capacity(result.len());
    for (name, bytes) in &result {
        let path: PathBuf = out_dir.join(name);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("failed to create {}", parent.display()))?;
        }
        std::fs::write(&path, bytes).with_context(|| format!("failed to write {name}"))?;
        written.push(name.clone());
    }
    Ok(written)
}

pub fn build_one(
    input_dir: &Path,
    data_json: &Path,
    excel_paths_json: &Path,
    rel: &str,
    json_text: &str,
    out_dir: &Path,
    change_md5: bool,
) -> Result<Vec<String>> {
    let temp = std::env::temp_dir().join("hsr-traingame-build");
    let _ = std::fs::remove_dir_all(&temp);
    let staged = temp.join(rel);
    if let Some(parent) = staged.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("failed to stage {}", parent.display()))?;
    }
    std::fs::write(&staged, json_text).context("failed to stage edited json")?;

    build_edits(
        input_dir,
        data_json,
        excel_paths_json,
        &temp,
        out_dir,
        change_md5,
    )
}

pub fn parse_value(types: &Types, type_name: &str, bytes: &Vec<u8>) -> Result<Value> {
    let mut parser = DynamicParser::new(types, bytes);
    parser.parse(&ValueKind::Class(type_name.to_string()), false)
}

fn best_effort<F: FnOnce() -> Result<()>>(f: F) {
    let _ = catch_unwind(AssertUnwindSafe(f));
}
