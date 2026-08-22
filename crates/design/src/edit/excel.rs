use crate::edit::{BaseConfigHeader, patch_data_in_design};
use anyhow::Context;
use crate::common::{
    data_define::{DataDefine, ValueKind},
    downloader::DownloadedAssetInfo,
    hash,
};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::{Cursor, Write},
    path::Path,
};
use crate::builder::DynamicBuilder;
use crate::bytes::{FromBytes, ToBytes};

pub fn modify_excels(
    excel_output_dir: &Path,
    asset: &mut DownloadedAssetInfo,
    types: &HashMap<String, DataDefine>,
    excel_paths: &HashMap<String, Vec<String>>,
    modified_files: &mut HashSet<String>,
) -> anyhow::Result<()> {
    if !excel_output_dir.is_dir() {
        return Ok(());
    }

    let files = fs::read_dir(excel_output_dir)
        .context("Failed to read directory")?
        .filter_map(std::result::Result::ok);

    for path in files {
        let file_name = path.file_name();
        let file_stem = file_name
            .to_str()
            .and_then(|name| Path::new(name).file_stem())
            .map(|stem| format!("/{}.bytes", stem.to_str().unwrap()))
            .unwrap_or_default()
            .to_string();

        match modify_excel(
            path.path(),
            asset,
            types,
            excel_paths,
            modified_files,
            &file_stem,
        ) {
            Ok(()) => log::debug!("modified excel file: {}", file_name.display()),
            Err(err) => log::error!(
                "failed to modify excel file {}: {}",
                file_name.display(),
                err
            ),
        }
    }

    Ok(())
}

fn modify_excel(
    file_path: std::path::PathBuf,
    asset: &mut DownloadedAssetInfo,
    types: &HashMap<String, DataDefine>,
    excel_paths: &HashMap<String, Vec<String>>,
    modified_files: &mut HashSet<String>,
    file_stem: &str,
) -> anyhow::Result<()> {
    let file =
        fs::read(&file_path).with_context(|| format!("Failed to read file: {file_path:?}"))?;

    let json = serde_json::from_slice::<Value>(&file)
        .with_context(|| format!("Failed to parse JSON from file: {file_path:?}"))?;

    let Some((kind_name, hash, header_info)) = excel_paths.iter().find_map(|(kind, paths)| {
        let (hash, header_hash) = paths.iter().find_map(|v| {
            if v.contains(file_stem)
                && asset
                    .design_data_list
                    .contains_key(&hash::get_32bit_hash_const(v))
            {
                let (index_key, possible_header_hash) = {
                    let base_name = kind
                        .strip_suffix("Row")
                        .unwrap_or(kind)
                        .replace("RPG.GameCore.", "");
                    let path = Path::new(v);
                    let file_name = format!("{base_name}ExcelTable");
                    let new_file_name = format!("{file_name}.binary_header.bytes");

                    (
                        format!("{file_name}.IndexKey"),
                        hash::get_32bit_hash_const(
                            &path
                                .with_file_name(new_file_name)
                                .to_string_lossy()
                                .replace('\\', "/"),
                        ),
                    )
                };

                let header_hash = asset
                    .design_data_list
                    .contains_key(&possible_header_hash)
                    .then_some((possible_header_hash, index_key));

                Some((hash::get_32bit_hash_const(v), header_hash))
            } else {
                None
            }
        })?;

        Some((kind, hash, header_hash))
    }) else {
        return Err(anyhow::anyhow!(
            "Couldn't find matching excel path for {file_stem}"
        ));
    };

    let row_kind = ValueKind::Class(kind_name.to_string());

    let mut cursor = Cursor::new(Vec::new());
    let mut sizes = Vec::new();

    if let Some(array) = json.as_array() {
        (array.len() as i64).to_bytes(&mut cursor).unwrap();
        for item in array {
            let mut cb = Vec::new();
            let mut builder = DynamicBuilder::new(types, &mut cb);
            if let Err(err) = builder.build(&row_kind, item) {
                return Err(anyhow::anyhow!(
                    "Failed to build {kind_name} {file_stem} for {} {err}",
                    file_path.display()
                ));
            }

            // get header info if any
            let key = if let Some((_, name)) = &header_info
                && let Some(define) = types.get(name)
                && let DataDefine::Struct {
                    fields,
                    interfaces: _,
                } = define
            {
                Some(if fields.len() == 2 {
                    let mut values = Vec::with_capacity(2);
                    for field in fields {
                        values.push(item.get(&field.field_name).unwrap().as_u64().unwrap());
                    }

                    hash::get_index_key_uint_uint(values[0] as u32, values[1] as u32)
                } else {
                    item.get(&fields.first().unwrap().field_name)
                        .unwrap()
                        .as_u64()
                        .unwrap() as i32
                })
            } else {
                None
            };

            let data = builder.into_inner();
            sizes.push((key, data.len()));
            cursor.write_all(&data).unwrap();
        }
    }

    let mut result = cursor.into_inner();

    let first_byte = {
        let excel_bytes = asset.design_data_list.get(&hash).unwrap();
        if !excel_bytes.is_empty() && excel_bytes[0] == 0 {
            Some(&excel_bytes[..1])
        } else {
            None
        }
    };

    if let Some(first_byte) = first_byte {
        let mut combined = Vec::with_capacity(first_byte.len() + result.len());
        combined.extend_from_slice(first_byte);
        combined.append(&mut result);
        result = combined;
    }

    patch_data_in_design(asset, hash, result, modified_files);

    // Patch header if the excel has header
    if let Some((header_hash, _)) = header_info {
        let mut cursor = Cursor::new(&asset.design_data_list[&header_hash]);
        let mut header = BaseConfigHeader::<i32>::from_bytes(&mut cursor).unwrap(); // excels' header uses i32 type (only TextMap that uses ulong)

        for (i, (key, size)) in sizes.into_iter().enumerate() {
            if let Some(key) = key {
                header.change_length_by_key(key, size as i32);
            } else {
                header.change_length(i, size as i32);
            }
        }

        header.recalculate();
        patch_data_in_design(asset, header_hash, header.to_vec(), modified_files);
    }

    Ok(())
}
