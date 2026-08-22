use super::ConfigManifest;
use crate::parse_and_count;
use anyhow::Result;
use crate::common::data_define::DataDefine;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use std::{collections::HashMap, path::Path};

/// RPG.GameCore.GraphicsSettingJson
pub fn parse(
    assets: &HashMap<i32, Vec<u8>>,
    types: &HashMap<String, DataDefine>,
    out_folder: &Path,
    _: &ConfigManifest,
) -> Result<()> {
    let paths = [
        "Config/Device/iOS.json",
        "Config/Device/Android.json",
        "Config/Device/PC.json",
        "Config/Device/PS.json",
    ];

    paths
        .par_iter()
        .filter(|path| !path.is_empty())
        .for_each(|path| {
            parse_and_count!(
                path,
                "RPG.GameCore.GraphicsSettingJson",
                assets,
                types,
                out_folder
            );
        });

    Ok(())
}
