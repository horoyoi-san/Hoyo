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
