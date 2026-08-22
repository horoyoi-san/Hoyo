use anyhow::{Context, Result};
use std::{collections::HashMap, io::Cursor, sync::Arc};

use super::hash;
use crate::asset_meta::{design_index::DesignIndex, mini_asset::MiniAsset};
use crate::bytes::FromBytes;

pub struct DownloadedAssetInfo {
    pub design_data_list: HashMap<i32, Vec<u8>>,
    pub mini_asset: MiniAsset,
    pub design_index: DesignIndex,
}

pub fn parse_all_design_data_from_memory(
    all_bytes: &HashMap<String, Arc<Vec<u8>>>,
    filter_hashes: &[i32],
) -> Result<DownloadedAssetInfo> {
    let mini_asset_bytes = all_bytes
        .get("M_DesignV.bytes")
        .context("Missing mini asset M_DesignV.bytes")?;
    let mini_asset = MiniAsset::from_bytes(&mut Cursor::new(&**mini_asset_bytes))?;

    let index_name = format!("DesignV_{}.bytes", mini_asset.design_index_hash);
    let design_index_bytes = all_bytes
        .get(&index_name)
        .with_context(|| format!("Missing design index file: {index_name}"))?;
    let design_index = DesignIndex::from_bytes(&mut Cursor::new(&**design_index_bytes))?;

    let mut result: HashMap<i32, Vec<u8>> = HashMap::new();

    for file_entry in &design_index.file_list {
        let name = format!("{}.bytes", file_entry.file_byte_name);
        let Some(data) = all_bytes.get(&name) else {
            continue;
        };

        if file_entry.name_hash == hash::get_32bit_hash_const("BakedConfig/ConfigManifest.json") {
            result.insert(file_entry.name_hash, data.clone().to_vec());
            continue;
        }

        if !filter_hashes.is_empty()
            && !file_entry
                .data_entries
                .iter()
                .any(|e| filter_hashes.contains(&e.name_hash))
        {
            continue;
        }

        for entry in &file_entry.data_entries {
            let start = entry.offset as usize;
            let end = (entry.offset + entry.size) as usize;
            if end <= data.len() {
                result.insert(entry.name_hash, data[start..end].to_vec());
            } else {
                log::warn!("Invalid offset for hash {} in {}", entry.name_hash, name);
            }
        }
    }

    Ok(DownloadedAssetInfo {
        design_data_list: result,
        mini_asset,
        design_index,
    })
}
