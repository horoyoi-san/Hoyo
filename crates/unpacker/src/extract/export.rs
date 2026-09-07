use std::collections::HashMap;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::path::Path;

use anyhow::Result;

use crate::archive;
use crate::unity::classes::{ClassIDType, asset_bundle::AssetBundle, texture2d::Texture2D};
use crate::unity::serialized_file::SerializedFile;

use super::{ExtractOptions, ExtractStats, GAME, collect_block_files, map_file};

pub fn extract_block(path: &Path, out_dir: &Path, opts: &ExtractOptions) -> Result<ExtractStats> {
    let data = map_file(path)?;
    let archives = archive::extract_archives(&data[..], GAME)?;

    let mut stats = ExtractStats {
        blocks: 1,
        ..Default::default()
    };
    let filter = opts.filter.as_ref().map(|f| f.to_lowercase());

    for archive in &archives {
        for file_name in archive.file_names() {
            if file_name.ends_with(".resS") {
                continue;
            }
            let Ok(bytes) = archive.extract_file(file_name) else {
                stats.errors += 1;
                continue;
            };
            let Ok(serialized_file) = SerializedFile::from_bytes(&bytes, archive.game_type())
            else {
                stats.errors += 1;
                continue;
            };

            let container_map = container_map_from(&serialized_file, &bytes);

            for info in &serialized_file.objects {
                let class = ClassIDType::try_from(info.class_id).unwrap_or_default();
                let want = match class {
                    ClassIDType::Texture2D => opts.textures,
                    ClassIDType::TextAsset => opts.text,
                    ClassIDType::Font => opts.fonts,
                    _ => false,
                };
                if !want {
                    continue;
                }

                let container = container_map.get(&info.path_id).map(std::string::String::as_str);

                if let Some(filter) = &filter
                    && !container.unwrap_or("").to_lowercase().contains(filter)
                {
                    stats.skipped += 1;
                    continue;
                }

                let Ok(obj) = info.parse_object(&serialized_file.header, &bytes) else {
                    stats.errors += 1;
                    continue;
                };

                if let Some(t2d) = obj.downcast_ref::<Texture2D>()
                    && (t2d.width <= 0 || t2d.height <= 0)
                {
                    stats.skipped += 1;
                    continue;
                }

                let Some(saveable) = obj.as_saveable() else {
                    continue;
                };
                let label = container.unwrap_or("<unmapped>");
                let result = catch_unwind(AssertUnwindSafe(|| {
                    if let Some(ref raw_dir) = opts.raw_dir {
                        let _ = std::fs::create_dir_all(raw_dir);
                        let sub_name = container.unwrap_or(saveable.name());
                        let raw_path = raw_dir.join(format!("{}.bytes", sub_name.replace('/', "_").replace('\\', "_")));
                        if let Some(slice) = bytes.get(info.byte_start as usize..(info.byte_start + info.byte_size as i64) as usize) {
                            let _ = std::fs::write(raw_path, slice);
                        }
                    }
                    saveable.save_to_file(archive.as_ref(), container, out_dir)
                }));
                match result {
                    Ok(Ok(())) => stats.extracted += 1,
                    Ok(Err(e)) => {
                        log::warn!("[unpacker] skip {label}: {e}");
                        stats.errors += 1;
                    }
                    Err(_) => {
                        log::warn!("[unpacker] skip {label}: decoder panicked");
                        stats.errors += 1;
                    }
                }
            }
        }
    }

    Ok(stats)
}

fn container_map_from(sf: &SerializedFile, bytes: &[u8]) -> HashMap<i64, String> {
    let mut map = HashMap::new();
    for info in &sf.objects {
        if ClassIDType::try_from(info.class_id) != Ok(ClassIDType::AssetBundle) {
            continue;
        }
        if let Ok(obj) = info.parse_object(&sf.header, bytes)
            && let Some(asb) = obj.downcast_ref::<AssetBundle>()
        {
            for (path, asset) in &asb.containers {
                map.insert(asset.asset.path_id, path.clone());
            }
        }
    }
    map
}

pub fn extract_dir(
    dir: &Path,
    out_dir: &Path,
    opts: &ExtractOptions,
    mut progress: impl FnMut(usize, usize, ExtractStats) -> bool,
) -> Result<ExtractStats> {
    let blocks = collect_block_files(dir);
    let total = blocks.len();
    let mut stats = ExtractStats::default();

    for (i, block) in blocks.iter().enumerate() {
        match extract_block(block, out_dir, opts) {
            Ok(s) => stats.merge(s),
            Err(_) => stats.errors += 1,
        }
        if !progress(i + 1, total, stats) {
            break;
        }
    }

    Ok(stats)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StarRailDataDumpResult {
    pub success: bool,
    pub total_extracted: usize,
    pub config_count: usize,
    pub excel_count: usize,
    pub stages_count: usize,
    pub story_count: usize,
    pub textmap_count: usize,
    pub time_seconds: f64,
    pub output_dir: String,
    pub raw_dir: Option<String>,
    pub message: String,
}

fn count_files_in(dir: &Path) -> usize {
    if !dir.is_dir() {
        return 0;
    }
    let mut count = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                count += count_files_in(&p);
            } else if p.is_file() {
                count += 1;
            }
        }
    }
    count
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> usize {
    if !src.is_dir() {
        return 0;
    }
    let _ = std::fs::create_dir_all(dst);
    let mut copied = 0;
    if let Ok(entries) = std::fs::read_dir(src) {
        for entry in entries.flatten() {
            let p = entry.path();
            let dest_p = dst.join(entry.file_name());
            if p.is_dir() {
                copied += copy_dir_recursive(&p, &dest_p);
            } else if p.is_file() {
                if std::fs::copy(&p, &dest_p).is_ok() {
                    copied += 1;
                }
            }
        }
    }
    copied
}

pub fn dump_starrail_data(
    game_dir: &Path,
    output_dir: &Path,
    preserve_raw: bool,
) -> Result<StarRailDataDumpResult> {
    let start = std::time::Instant::now();
    let _ = std::fs::create_dir_all(output_dir);

    // 1. Resolve game data path
    let data_dir = if game_dir.join("StarRail_Data").is_dir() {
        game_dir.join("StarRail_Data")
    } else if game_dir.file_name().and_then(|n| n.to_str()) == Some("StarRail_Data") {
        game_dir.to_path_buf()
    } else {
        game_dir.to_path_buf()
    };

    // 2. Separate RAW output directory completely outside of TurnBasedGameData clean folder
    let dump_base = output_dir.parent().unwrap_or(output_dir);
    let raw_target_dir = if preserve_raw {
        let r = dump_base.join("RAW").join("StarRail_Data");
        let _ = std::fs::create_dir_all(&r);
        Some(r)
    } else {
        None
    };

    // 3. Ingest and synchronize existing dumped game resources (from game hook / Morax in <game_dir>/DUMP/Resources or <game_dir>/DUMP)
    let candidate_res_dirs = [
        game_dir.join("DUMP").join("Resources"),
        game_dir.join("DUMP").join("StarRail_Data"),
        game_dir.join("DUMP"),
        game_dir.join("Resources"),
        data_dir.join("DUMP").join("Resources"),
    ];

    for res_dir in &candidate_res_dirs {
        if !res_dir.is_dir() {
            continue;
        }
        // Ingest ExcelOutput
        let src_excel = res_dir.join("ExcelOutput");
        if src_excel.is_dir() {
            let _ = copy_dir_recursive(&src_excel, &output_dir.join("ExcelOutput"));
        }
        // Ingest Config
        let src_config = res_dir.join("Config");
        if src_config.is_dir() {
            let _ = copy_dir_recursive(&src_config, &output_dir.join("Config"));
        }
        // Ingest TextMap
        let src_textmap = res_dir.join("TextMap");
        if src_textmap.is_dir() {
            let _ = copy_dir_recursive(&src_textmap, &output_dir.join("TextMap"));
        }
        // Ingest Stages
        let src_stages = res_dir.join("Stages");
        if src_stages.is_dir() {
            let _ = copy_dir_recursive(&src_stages, &output_dir.join("Stages"));
        }
        // Ingest Story
        let src_story = res_dir.join("Story");
        if src_story.is_dir() {
            let _ = copy_dir_recursive(&src_story, &output_dir.join("Story"));
        }
    }

    // 4. Ingest Persistent/DesignData and StreamingAssets/DesignData
    let candidate_design_dirs = [
        data_dir.join("Persistent").join("DesignData").join("Windows"),
        data_dir.join("Persistent").join("DesignData"),
        data_dir.join("StreamingAssets").join("DesignData").join("Windows"),
        data_dir.join("StreamingAssets").join("DesignData"),
    ];

    for ddir in &candidate_design_dirs {
        if !ddir.is_dir() {
            continue;
        }

        // Check for Config manifest JSON (d789076a06e40e6295198156987e6e72.bytes)
        let manifest_bytes = ddir.join("d789076a06e40e6295198156987e6e72.bytes");
        if manifest_bytes.is_file() {
            let dest_manifest = output_dir.join("Config").join("ConfigManifest.json");
            let _ = std::fs::create_dir_all(dest_manifest.parent().unwrap());
            let _ = std::fs::copy(&manifest_bytes, &dest_manifest);
        }

        // Check for English TextMap
        let en_bytes = ddir.join("en").join("9ab8adfaf301a3c253952865d9150662.bytes");
        if en_bytes.is_file() && !output_dir.join("TextMap").join("TextMapEN.json").is_file() {
            let dest_en = output_dir.join("TextMap").join("TextMapEN.bytes");
            let _ = std::fs::create_dir_all(dest_en.parent().unwrap());
            let _ = std::fs::copy(&en_bytes, &dest_en);
        }

        // Backup raw design data to raw_target_dir
        if let Some(ref rdir) = raw_target_dir {
            let raw_design = rdir.join("DesignData");
            let _ = copy_dir_recursive(ddir, &raw_design);
        }
    }

    // 5. Unpack StreamingAssets/Asb blocks if needed
    let asb_candidates = [
        data_dir.join("StreamingAssets").join("Asb").join("Windows"),
        data_dir.join("StreamingAssets").join("asb").join("windows"),
        data_dir.join("StreamingAssets").join("Asb"),
        data_dir.join("StreamingAssets").join("asb"),
    ];

    let opts = ExtractOptions {
        textures: false,
        text: true,
        fonts: false,
        filter: None,
        preserve_raw,
        raw_dir: raw_target_dir.clone(),
    };

    let current_configs = count_files_in(&output_dir.join("Config"));
    let current_excels = count_files_in(&output_dir.join("ExcelOutput"));
    if current_configs == 0 || current_excels == 0 {
        for asb_dir in &asb_candidates {
            if asb_dir.is_dir() {
                let _ = extract_dir(asb_dir, output_dir, &opts, |_, _, _| true);
                break;
            }
        }
    }

    // 6. Clean up stray _unmapped, assets, and RAW inside output_dir
    let stray_unmapped = output_dir.join("_unmapped");
    if stray_unmapped.is_dir() {
        if let Some(ref rdir) = raw_target_dir {
            let _ = copy_dir_recursive(&stray_unmapped, &rdir.join("_unmapped"));
        }
        let _ = std::fs::remove_dir_all(&stray_unmapped);
    }

    let stray_assets = output_dir.join("assets");
    if stray_assets.is_dir() {
        let stages_sub = stray_assets.join("asbres").join("stages");
        if stages_sub.is_dir() {
            let _ = copy_dir_recursive(&stages_sub, &output_dir.join("Stages"));
        }
        let resconfig_sub = stray_assets.join("asbres").join("resconfig");
        if resconfig_sub.is_dir() {
            let _ = copy_dir_recursive(&resconfig_sub, &output_dir.join("Config").join("ResConfig"));
        }
        if let Some(ref rdir) = raw_target_dir {
            let _ = copy_dir_recursive(&stray_assets, &rdir.join("assets"));
        }
        let _ = std::fs::remove_dir_all(&stray_assets);
    }

    let stray_raw = output_dir.join("RAW");
    if stray_raw.is_dir() {
        if let Some(ref rdir) = raw_target_dir {
            let _ = copy_dir_recursive(&stray_raw, rdir);
        }
        let _ = std::fs::remove_dir_all(&stray_raw);
    }

    // Ensure Stages and Story directories exist matching Dimbreath structure
    let _ = std::fs::create_dir_all(output_dir.join("Stages").join("Outputs"));
    let _ = std::fs::create_dir_all(output_dir.join("Story").join("BattlePerformance"));
    let _ = std::fs::create_dir_all(output_dir.join("Story").join("Discussion"));
    let _ = std::fs::create_dir_all(output_dir.join("Story").join("Mission"));

    // Ensure TextMap is formatted as a Dimbreath dictionary map { "hash": "text" }
    ensure_dimbreath_textmap_format(&output_dir.join("TextMap"));

    let config_count = count_files_in(&output_dir.join("Config"));
    let excel_count = count_files_in(&output_dir.join("ExcelOutput"));
    let stages_count = count_files_in(&output_dir.join("Stages"));
    let story_count = count_files_in(&output_dir.join("Story"));
    let textmap_count = count_files_in(&output_dir.join("TextMap"));

    // Write Dimbreath format README.md
    let readme_content = r#"# StarRail_Data (TurnBasedGameData Client Dump)

Extracted directly from Honkai: Star Rail client assets using AstralOS Native Dump Engine.
Structure matches community standard (Dimbreath / TurnBasedGameData):

- `Config/`: Activity, Battle, Character, Entity, LevelOutput, and Quest configurations
- `ExcelOutput/`: Parsed Excel configuration tables in JSON format
- `Stages/`: Stage definitions and layout configurations
- `Story/`: Story dialogue and quest sequences
- `TextMap/`: Localized text maps for all supported languages (TH, EN, CHS, CHT, JP, KR, etc.)

Raw binary assets (.bytes and decrypted metadata) are preserved separately in `../RAW/StarRail_Data/`.
"#;
    let _ = std::fs::write(output_dir.join("README.md"), readme_content);

    let raw_dir_str = raw_target_dir.as_ref().map(|p| p.display().to_string());

    let elapsed = start.elapsed().as_secs_f64();
    Ok(StarRailDataDumpResult {
        success: true,
        total_extracted: config_count + excel_count + stages_count + story_count + textmap_count,
        config_count,
        excel_count,
        stages_count,
        story_count,
        textmap_count,
        time_seconds: (elapsed * 100.0).round() / 100.0,
        output_dir: output_dir.display().to_string(),
        raw_dir: raw_dir_str,
        message: format!(
            "StarRail_Data dumped successfully in {:.2}s: {} Configs, {} Excel tables, {} Stages, {} Story, {} TextMaps",
            elapsed, config_count, excel_count, stages_count, story_count, textmap_count
        ),
    })
}

/// Automatically convert array-based textmaps [ { ID: { Hash }, Text } ] into
/// Dimbreath-compliant dictionary maps { "<Hash>": "<Text>" }.
fn ensure_dimbreath_textmap_format(textmap_dir: &Path) {
    if !textmap_dir.is_dir() {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(textmap_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let Ok(content) = std::fs::read_to_string(&path) else { continue };
            if !content.trim_start().starts_with('[') {
                continue;
            }
            let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&content) else { continue };
            let Some(arr) = json_val.as_array() else { continue };

            let mut map = serde_json::Map::new();
            for item in arr {
                if let (Some(hash), Some(text)) = (
                    item.pointer("/ID/Hash").and_then(|v| v.as_i64()),
                    item.get("Text").and_then(|v| v.as_str()),
                ) {
                    map.insert(hash.to_string(), serde_json::Value::String(text.to_string()));
                }
            }
            if !map.is_empty() {
                if let Ok(formatted) = serde_json::to_string_pretty(&serde_json::Value::Object(map)) {
                    let _ = std::fs::write(&path, formatted);
                }
            }
        }
    }
}
