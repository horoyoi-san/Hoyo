use std::fs;
use std::path::PathBuf;
use std::process::Command;
use crate::embedded::resolve_project_root;
use crate::state::{chrono_now, push_log};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ScannedAssetDto {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub size: String,
    pub path: String,
    pub block: String,
    pub block_full_path: String,
    pub path_id: i64,
    pub class_id: i32,
    pub class_name: String,
    pub extension: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AssetPreviewDto {
    pub success: bool,
    pub data_url: Option<String>,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub message: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UnpackScanResult {
    pub success: bool,
    pub total_blocks: usize,
    pub total_assets: usize,
    pub assets: Vec<ScannedAssetDto>,
    pub message: String,
    #[serde(default)]
    pub cached: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UnpackExportResult {
    pub success: bool,
    pub blocks_count: usize,
    pub extracted_count: usize,
    pub skipped_count: usize,
    pub errors_count: usize,
    pub output_dir: String,
    pub message: String,
}

#[tauri::command]
pub fn execute_scan_game_assets(game_path: String, force_refresh: Option<bool>) -> Result<UnpackScanResult, String> {
    let base_path = PathBuf::from(&game_path);
    if !base_path.exists() {
        return Err(format!("Path does not exist: {}", game_path));
    }

    let cache_dir = resolve_project_root().join("bin").join("cache");
    let cache_file = cache_dir.join("asset_manifest_cache.json");

    if force_refresh != Some(true) && cache_file.is_file() {
        if let Ok(content) = fs::read_to_string(&cache_file) {
            if let Ok(mut cached) = serde_json::from_str::<UnpackScanResult>(&content) {
                cached.cached = true;
                push_log(format!(
                    "[{}] [OK] Loaded {} indexed assets from local manifest cache (instant)",
                    chrono_now(),
                    cached.total_assets
                ));
                return Ok(cached);
            }
        }
    }

    let target_dir = if base_path.join("StarRail_Data").exists() {
        base_path.join("StarRail_Data")
    } else if base_path.join("Game_Data").exists() {
        base_path.join("Game_Data")
    } else {
        base_path.clone()
    };

    push_log(format!("[{}] [*] Scanning game block archives in {:?}", chrono_now(), target_dir));
    let blocks = unpacker::collect_block_files(&target_dir);
    let total_blocks = blocks.len();

    let mut scanned_assets = Vec::new();
    let mut count = 0;

    for block_path in &blocks {
        if let Ok(entries) = unpacker::scan_block(block_path) {
            for entry in entries {
                count += 1;
                let (kind, ext) = if entry.is_texture() {
                    let e = if entry.name.ends_with(".png") || entry.container.ends_with(".png") {
                        "png"
                    } else if entry.name.ends_with(".jpg") || entry.container.ends_with(".jpg") {
                        "jpg"
                    } else {
                        "png"
                    };
                    ("texture".to_string(), e.to_string())
                } else if entry.is_text() {
                    let e = if entry.name.ends_with(".json") || entry.container.ends_with(".json") {
                        "json"
                    } else if entry.name.ends_with(".txt") || entry.container.ends_with(".txt") {
                        "txt"
                    } else if entry.name.ends_with(".lua") || entry.container.ends_with(".lua") {
                        "lua"
                    } else {
                        "bytes"
                    };
                    ("text".to_string(), e.to_string())
                } else if entry.class_name.to_lowercase().contains("mesh") || entry.class_name.to_lowercase().contains("gameobject") {
                    ("mesh".to_string(), "obj".to_string())
                } else if entry.class_name.to_lowercase().contains("audio") {
                    let e = if entry.name.ends_with(".pck") || entry.container.ends_with(".pck") {
                        "pck"
                    } else {
                        "wem"
                    };
                    ("audio".to_string(), e.to_string())
                } else {
                    ("text".to_string(), "asset".to_string())
                };

                let name = if entry.name.is_empty() {
                    if !entry.container.is_empty() {
                        entry.container.split('/').next_back().unwrap_or("Asset").to_string()
                    } else {
                        format!("Asset_{}", entry.path_id)
                    }
                } else {
                    entry.name
                };

                scanned_assets.push(ScannedAssetDto {
                    id: format!("{}_{}", entry.path_id, count),
                    name,
                    kind,
                    size: "Block Asset".to_string(),
                    path: if entry.container.is_empty() { entry.class_name.clone() } else { entry.container.clone() },
                    block: block_path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
                    block_full_path: block_path.to_string_lossy().to_string(),
                    path_id: entry.path_id,
                    class_id: entry.class_id,
                    class_name: entry.class_name,
                    extension: ext,
                });

                if scanned_assets.len() >= 30000 {
                    break;
                }
            }
        }
        if scanned_assets.len() >= 30000 {
            break;
        }
    }

    push_log(format!("[{}] [OK] Scanned {} blocks, indexed {} game assets", chrono_now(), total_blocks, scanned_assets.len()));

    let res = UnpackScanResult {
        success: true,
        total_blocks,
        total_assets: scanned_assets.len(),
        assets: scanned_assets,
        message: format!("Indexed {} assets across {} block files", count, total_blocks),
        cached: false,
    };

    let _ = fs::create_dir_all(&cache_dir);
    if let Ok(json_str) = serde_json::to_string(&res) {
        let _ = fs::write(&cache_file, json_str);
        push_log(format!("[{}] [*] Saved asset manifest cache to {:?}", chrono_now(), cache_file));
    }

    Ok(res)
}

#[tauri::command]
pub fn get_asset_image_preview(block_path: String, path_id: i64) -> Result<AssetPreviewDto, String> {
    let p = PathBuf::from(&block_path);
    if !p.is_file() {
        return Err(format!("Block file not found: {block_path}"));
    }
    match unpacker::decode_texture(&p, path_id) {
        Ok(img) => {
            let width = img.width();
            let height = img.height();
            let mut png_bytes: Vec<u8> = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut png_bytes);
            if let Err(e) = img.write_to(&mut cursor, image::ImageFormat::Png) {
                return Err(format!("PNG encoding error: {e}"));
            }
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
            Ok(AssetPreviewDto {
                success: true,
                data_url: Some(format!("data:image/png;base64,{b64}")),
                width,
                height,
                format: "PNG / RGBA8".to_string(),
                message: "OK".to_string(),
            })
        }
        Err(e) => Ok(AssetPreviewDto {
            success: false,
            data_url: None,
            width: 0,
            height: 0,
            format: "Unknown".to_string(),
            message: format!("Decode error: {e}"),
        }),
    }
}

#[tauri::command]
pub fn export_single_asset(
    block_path: String,
    path_id: i64,
    container_path: String,
    output_dir: String,
) -> Result<String, String> {
    let block = PathBuf::from(&block_path);
    let clean_out = output_dir.trim().replace('/', "\\");
    let out_base = if clean_out.is_empty() {
        resolve_project_root().join("Extracted_Assets")
    } else {
        let p = PathBuf::from(&clean_out);
        if p.is_relative() {
            resolve_project_root().join(p)
        } else {
            p
        }
    };
    let _ = fs::create_dir_all(&out_base);
    
    // Attempt decoding texture first
    if let Ok(img) = unpacker::decode_texture(&block, path_id) {
        let clean_container = container_path.trim_start_matches('/').trim_start_matches('\\').replace('/', "\\");
        let mut rel_path = PathBuf::from(if clean_container.is_empty() { format!("Asset_{path_id}.png") } else { clean_container });
        if rel_path.extension().is_none() || rel_path.extension().and_then(|s| s.to_str()) != Some("png") {
            rel_path.set_extension("png");
        }
        let target_file = out_base.join(&rel_path);
        if let Some(parent) = target_file.parent() {
            let _ = fs::create_dir_all(parent);
        }
        img.save(&target_file).map_err(|e| format!("Failed to save image: {e}"))?;
        let win_path = target_file.to_string_lossy().replace('/', "\\");
        push_log(format!("[{}] [OK] Single asset exported to: {}", chrono_now(), win_path));
        return Ok(win_path);
    }

    // Otherwise use general unpacker
    let opts = unpacker::ExtractOptions {
        textures: true,
        text: true,
        fonts: true,
        filter: None,
        preserve_raw: false,
        raw_dir: None,
    };
    let stats = unpacker::extract_block(&block, &out_base, &opts)
        .map_err(|e| format!("Extraction error: {e}"))?;
    let win_path = out_base.to_string_lossy().replace('/', "\\");
    push_log(format!("[{}] [OK] Extracted block assets: {} files to {}", chrono_now(), stats.extracted, win_path));
    Ok(win_path)
}

#[tauri::command]
pub fn show_item_in_folder(item_path: String) -> Result<(), String> {
    let clean_path = item_path.trim().replace('/', "\\");
    let p = PathBuf::from(&clean_path);
    let abs_p = if p.is_relative() {
        resolve_project_root().join(&p)
    } else {
        p
    };

    let win_path = abs_p.to_string_lossy().replace('/', "\\");

    if abs_p.is_file() {
        let select_arg = format!("/select,{}", win_path);
        push_log(format!("[{}] 📂 Revealing file in Explorer: {}", chrono_now(), win_path));
        Command::new("explorer.exe")
            .arg(select_arg)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    } else if abs_p.is_dir() {
        push_log(format!("[{}] 📂 Opening folder in Explorer: {}", chrono_now(), win_path));
        Command::new("explorer.exe")
            .arg(&win_path)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    } else if let Some(parent) = abs_p.parent() {
        let _ = fs::create_dir_all(parent);
        let parent_win = parent.to_string_lossy().replace('/', "\\");
        push_log(format!("[{}] 📂 Opening parent folder in Explorer: {}", chrono_now(), parent_win));
        Command::new("explorer.exe")
            .arg(&parent_win)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    } else {
        Command::new("explorer.exe")
            .arg(&win_path)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn execute_unpack_assets(
    game_path: String,
    output_dir: String,
    filter: Option<String>,
    textures: bool,
    text: bool,
    fonts: bool,
    preserve_raw: Option<bool>,
) -> Result<UnpackExportResult, String> {
    let in_dir = PathBuf::from(&game_path);
    let target_in = if in_dir.join("StarRail_Data").exists() {
        in_dir.join("StarRail_Data")
    } else if in_dir.join("Game_Data").exists() {
        in_dir.join("Game_Data")
    } else {
        in_dir
    };

    let out_dir = if output_dir.trim().is_empty() {
        resolve_project_root().join("Extracted_Assets")
    } else {
        let p = PathBuf::from(&output_dir);
        if p.is_relative() {
            resolve_project_root().join(p)
        } else {
            p
        }
    };

    std::fs::create_dir_all(&out_dir).map_err(|e| format!("Failed to create output directory: {e}"))?;

    let raw_target_dir = if preserve_raw.unwrap_or(false) {
        let dump_base = out_dir.parent().unwrap_or(&out_dir);
        let r = dump_base.join("RAW").join("Extracted_Assets");
        let _ = std::fs::create_dir_all(&r);
        Some(r)
    } else {
        None
    };

    let opts = unpacker::ExtractOptions {
        textures,
        text,
        fonts,
        filter: if filter.as_deref().unwrap_or("").trim().is_empty() { None } else { filter },
        preserve_raw: preserve_raw.unwrap_or(false),
        raw_dir: raw_target_dir,
    };

    push_log(format!("[{}] [*] Extracting assets from {:?} to {:?}", chrono_now(), target_in, out_dir));
    let stats = unpacker::extract_dir(&target_in, &out_dir, &opts, |_, _, _| true)
        .map_err(|e| format!("Extraction error: {e}"))?;

    push_log(format!("[{}] [OK] Extraction finished! Extracted: {}, Skipped: {}, Errors: {}", chrono_now(), stats.extracted, stats.skipped, stats.errors));

    Ok(UnpackExportResult {
        success: true,
        blocks_count: stats.blocks,
        extracted_count: stats.extracted,
        skipped_count: stats.skipped,
        errors_count: stats.errors,
        output_dir: out_dir.to_string_lossy().to_string(),
        message: format!("Successfully extracted {} assets to {:?}", stats.extracted, out_dir),
    })
}
