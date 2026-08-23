use anyhow::Context;
use crate::common::{
    data_define::{DataDefine, ValueKind},
    hash,
};
use rayon::iter::{IntoParallelRefIterator as _, ParallelIterator as _};
use std::{collections::HashMap, fs, path::Path, sync::atomic::Ordering};
use crate::parser::DynamicParser;

use crate::parse::COUNTER_EXCELS;

pub fn parse_all_excels(
    assets: &HashMap<i32, Vec<u8>>,
    types: &HashMap<String, DataDefine>,
    out_folder: &Path,
    excel_paths: &HashMap<String, Vec<String>>,
) -> anyhow::Result<()> {
    log::debug!("Parsing Excels...");

    let out_excel = out_folder.join("ExcelOutput");

    if !out_excel.is_dir() {
        fs::create_dir_all(&out_excel).context("Failed create ExcelOutput directory")?;
    }

    excel_paths.par_iter().for_each(|(type_name, paths)| {
        let kind = ValueKind::Array(Box::new(ValueKind::Class(type_name.to_string())));
        for path in paths {
            let Some(bytes) = assets.get(&hash::get_32bit_hash_const(path)) else {
                continue;
            };

            // Skip empty first byte
            let bytes = if !bytes.is_empty() && bytes[0] == 0 {
                &bytes[1..]
            } else {
                bytes
            }
            .to_vec();

            let mut parser = DynamicParser::new(types, &bytes);
            match parser.parse(&kind, false) {
                Ok(parsed) => {
                    let file_name = path.split('/').next_back().unwrap().replace(".bytes", ".json");
                    let file_out = if file_name.starts_with("Textmap") {
                        continue;
                    } else {
                        out_excel.join(file_name)
                    };
                    fs::write(file_out, serde_json::to_string_pretty(&parsed).unwrap()).unwrap();
                    COUNTER_EXCELS.fetch_add(1, Ordering::Relaxed)
                }
                Err(err) => {
                    log::error!("failed to parse {kind:?} {path} {err}");
                    continue;
                }
            };
        }
    });

    Ok(())
}
