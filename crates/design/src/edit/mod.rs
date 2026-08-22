use crate::common::downloader::DownloadedAssetInfo;
use indexmap::IndexMap;
use md5::{Digest, Md5};
use std::{
    collections::{HashMap, HashSet},
    hash::Hash,
    io::Cursor,
};
use crate::asset_meta::design_index::FileEntry;
use crate::bytes::{FromBytes, ToBytes};

pub mod config;
pub mod excel;
pub mod textmap;

#[derive(Debug)]
struct BaseConfigHeader<T> {
    pub items: IndexMap<T, (u64, i32, i32, u8)>,
}

impl<T> BaseConfigHeader<T>
where
    T: Eq + Hash + ToBytes + FromBytes,
{
    fn recalculate(&mut self) {
        let (initial_offset, initial_layer) =
            if let Some((_, (_exist_flag, offset, _length, layer))) = self.items.first() {
                (*offset, *layer)
            } else {
                (0, 0)
            };

        let mut current_layer = initial_layer;
        let mut offset = initial_offset;

        for (_exist_flag, offset_ref, length, layer) in self.items.values_mut() {
            if current_layer != *layer {
                offset = *offset_ref;
                current_layer = *layer;
            }

            *offset_ref = offset;
            offset += *length;
        }
    }

    pub fn change_length(&mut self, index: usize, length: i32) {
        if let Some((_, (_, _, len, _))) = self.items.get_index_mut(index) {
            *len = length;
        }
    }

    pub fn change_length_by_key(&mut self, key: T, length: i32) {
        if let Some((_, _, len, _)) = self.items.get_mut(&key) {
            *len = length;
        }
    }

    fn to_vec(&self) -> Vec<u8> {
        let mut cursor = Cursor::new(Vec::new());
        self.to_bytes(&mut cursor).unwrap();
        cursor.into_inner()
    }
}

impl<T> FromBytes for BaseConfigHeader<T>
where
    T: Eq + Hash + ToBytes + FromBytes,
{
    fn from_bytes<R: std::io::Seek + std::io::Read>(r: &mut R) -> std::io::Result<Self> {
        let len = i64::from_bytes(r)?;

        let mut items = IndexMap::with_capacity(len as usize);

        for _ in 0..len {
            let exist_flag = u64::from_bytes(r)?;
            let hash = T::from_bytes(r)?;
            let offset = i32::from_bytes(r)?;
            let length = i32::from_bytes(r)?;
            let layer = u8::from_bytes(r)?;

            items.insert(hash, (exist_flag, offset, length, layer));
        }

        Ok(Self { items })
    }
}

impl<T> ToBytes for BaseConfigHeader<T>
where
    T: Eq + Hash + ToBytes + FromBytes,
{
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        (self.items.len() as i64).to_bytes(w)?;

        for (hash, (exist_flag, offset, length, layer)) in &self.items {
            exist_flag.to_bytes(w)?;
            hash.to_bytes(w)?;
            offset.to_bytes(w)?;
            length.to_bytes(w)?;
            layer.to_bytes(w)?;
        }

        Ok(())
    }
}

fn patch_data_in_design(
    asset: &mut DownloadedAssetInfo,
    hash: i32,
    data: Vec<u8>,
    modified_files: &mut HashSet<String>,
) {
    // Patch the actual data
    let length = if let Some(item) = asset.design_data_list.get_mut(&hash) {
        *item = data;
        item.len() as u32
    } else {
        return;
    };

    // Patch the design data
    for file in &mut asset.design_index.file_list {
        let mut offset = file.data_entries.first().map_or(0, |e| e.offset);
        for entry in &mut file.data_entries {
            if hash == entry.name_hash {
                modified_files.insert(format!("DesignV_{}", asset.mini_asset.design_index_hash));
                modified_files.insert(file.file_byte_name.to_string());
                entry.size = length;
            }
            entry.offset = offset;
            offset += entry.size;
        }
        file.size = file.data_entries.iter().map(|e| e.size as i64).sum::<i64>();
    }
}

pub fn compile_modified_files(
    asset: &mut DownloadedAssetInfo,
    modified_files: &HashSet<String>,
    change_md5: bool,
) -> HashMap<String, Vec<u8>> {
    log::debug!(
        "compiling {} modified files (change md5: {change_md5})",
        modified_files.len()
    );

    let mut result = HashMap::with_capacity(modified_files.len() + 1);

    // compile modified files
    result.extend(
        asset
            .design_index
            .file_list
            .iter()
            .filter(|file| modified_files.contains(&file.file_byte_name))
            .map(|file| {
                (
                    get_file_name(file),
                    file.data_entries
                        .iter()
                        .flat_map(|entry| asset.design_data_list.get(&entry.name_hash).unwrap())
                        .copied()
                        .collect::<Vec<_>>(),
                )
            }),
    );

    let mut design_index_name = modified_files
        .iter()
        .find(|v| v.starts_with("DesignV"))
        .cloned()
        .unwrap();

    // change modified files md5 if specified
    if change_md5 {
        for asset in &mut asset.design_index.file_list {
            if modified_files.contains(&asset.file_byte_name) {
                let file = result.remove(&get_file_name(asset)).unwrap();

                let mut hasher = Md5::new();
                hasher.update(&file);
                let new_md5_hash = hex::encode(hasher.finalize());

                log::debug!(
                    "changed file md5 hash {} -> {new_md5_hash}",
                    asset.file_byte_name
                );

                asset.file_byte_name = new_md5_hash;

                result.insert(get_file_name(asset), file);
            }
        }
    }

    // compile design index
    let mut cursor = Cursor::new(Vec::new());
    asset.design_index.to_bytes(&mut cursor).unwrap();
    let design_index_bytes = cursor.into_inner();

    // change design index md5 if specified
    if change_md5 {
        let mut hasher = Md5::new();
        hasher.update(&design_index_bytes);
        let new_design_index_name = format!("DesignV_{}", hex::encode(hasher.finalize()));

        log::debug!(
            "changed design index file name {design_index_name} -> {new_design_index_name}",
        );

        design_index_name = new_design_index_name;
    }

    result.insert(format!("{design_index_name}.bytes"), design_index_bytes);

    result
}

fn get_file_name(asset: &FileEntry) -> String {
    if let Some(tag) = asset.tag.0.as_ref()
        && !tag.is_empty()
    {
        format!("{tag}/{}.bytes", asset.file_byte_name)
    } else {
        format!("{}.bytes", asset.file_byte_name)
    }
}
