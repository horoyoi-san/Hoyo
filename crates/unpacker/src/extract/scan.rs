use std::collections::HashMap;
use std::path::Path;

use anyhow::Result;

use crate::archive;
use crate::unity::classes::{ClassIDType, UnityObject, asset_bundle::AssetBundle};
use crate::unity::object::ObjectInfo;
use crate::unity::serialized_file::SerializedFile;

use super::{AssetEntry, GAME, collect_block_files, map_file};

pub fn scan_block(path: &Path) -> Result<Vec<AssetEntry>> {
    let data = map_file(path)?;
    let archives = archive::extract_archives(&data[..], GAME)?;

    let mut out = Vec::new();
    for archive in &archives {
        for file_name in archive.file_names() {
            if file_name.ends_with(".resS") {
                continue;
            }
            let Ok(bytes) = archive.extract_file(file_name) else {
                continue;
            };
            let Ok(serialized_file) = SerializedFile::from_bytes(&bytes, archive.game_type())
            else {
                continue;
            };

            let objects = parse_objects(&serialized_file, &bytes);
            let container_map = container_map(&objects);

            for (info, obj) in &objects {
                let container = container_map
                    .get(&info.path_id)
                    .cloned()
                    .unwrap_or_default();
                let class = ClassIDType::try_from(info.class_id).unwrap_or_default();
                let name = obj
                    .as_saveable()
                    .map(|s| s.name().to_string())
                    .unwrap_or_default();

                out.push(AssetEntry {
                    block: path.to_path_buf(),
                    container,
                    class_id: info.class_id,
                    class_name: format!("{class:?}"),
                    name,
                    path_id: info.path_id,
                });
            }
        }
    }

    Ok(out)
}

pub fn scan_dir(dir: &Path, mut progress: impl FnMut(usize, usize)) -> Result<Vec<AssetEntry>> {
    let blocks = collect_block_files(dir);
    let total = blocks.len();
    let mut out = Vec::new();
    for (i, block) in blocks.iter().enumerate() {
        if let Ok(mut entries) = scan_block(block) {
            out.append(&mut entries);
        }
        progress(i + 1, total);
    }
    Ok(out)
}

fn parse_objects<'a>(
    sf: &'a SerializedFile,
    bytes: &[u8],
) -> Vec<(&'a ObjectInfo, Box<dyn UnityObject>)> {
    sf.objects
        .iter()
        .filter_map(|info| Some((info, info.parse_object(&sf.header, bytes).ok()?)))
        .collect()
}

fn container_map(objects: &[(&ObjectInfo, Box<dyn UnityObject>)]) -> HashMap<i64, String> {
    objects
        .iter()
        .filter_map(|(_, obj)| obj.downcast_ref::<AssetBundle>())
        .flat_map(|asb| {
            asb.containers
                .iter()
                .map(|(path, info)| (info.asset.path_id, path.clone()))
        })
        .collect()
}
