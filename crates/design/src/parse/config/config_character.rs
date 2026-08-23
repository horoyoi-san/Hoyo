use super::ConfigManifest;
use crate::parse::{COUNTER_CONFIGS, config::parse_config};
use crate::parse_and_count;
use anyhow::Result;
use crate::common::data_define::DataDefine;
use dashmap::DashSet;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use serde_json::Value;
use std::{collections::HashMap, fs, path::Path, sync::atomic::Ordering};

#[inline]
fn extract_path<P: AsRef<Path>>(
    path: P,
) -> std::io::Result<(Vec<String>, Vec<String>, Vec<String>)> {
    let data = fs::read(path)?;
    let json: Vec<Value> = serde_json::from_slice(&data)?;
    let mut config_characters: Vec<String> = json
        .iter()
        .filter_map(|item| item.get("JsonPath")?.as_str().map(std::string::ToString::to_string))
        .collect();

    let config_manikins = json
        .iter()
        .filter_map(|item| item.get("ManikinJsonPath")?.as_str().map(std::string::ToString::to_string))
        .collect();

    let config_adventure_characters = json
        .iter()
        .filter_map(|item| item.get("PlayerJsonPath")?.as_str().map(std::string::ToString::to_string))
        .collect();

    // BattleEvent
    config_characters.extend(json.into_iter().filter_map(|item| {
        if let Some(cfg) = item.get("Config")?.as_str().map(std::string::ToString::to_string)
            && cfg.ends_with(".json")
        {
            Some(cfg)
        } else {
            None
        }
    }));

    Ok((
        config_characters,
        config_manikins,
        config_adventure_characters,
    ))
}

pub fn parse(
    assets: &HashMap<i32, Vec<u8>>,
    types: &HashMap<String, DataDefine>,
    out_folder: &Path,
    _: &ConfigManifest,
) -> Result<()> {
    let (config_characters, config_manikins, config_adventure_characters) = [
        "ExcelOutput/ActivityAvatarConfig.json",
        "ExcelOutput/AetherDivideSpirit.json",
        "ExcelOutput/AvatarConfig.json",
        "ExcelOutput/AvatarConfigEnhanced.json",
        "ExcelOutput/AvatarConfigLD.json",
        "ExcelOutput/AvatarConfigTrial.json",
        "ExcelOutput/AdventurePlayer.json",
        "ExcelOutput/AdventurePlayerEnhanced.json",
        "ExcelOutput/AdventurePlayerLD.json",
        "ExcelOutput/AdventurePlayerTrial.json",
        "ExcelOutput/ActivityAdventurePlayer.json",
        "ExcelOutput/SpecialAvatar.json",
        "ExcelOutput/BattleEventData.json",
    ]
    .iter()
    .filter_map(|path| extract_path(out_folder.join(path)).ok())
    .fold(
        (Vec::new(), Vec::new(), Vec::new()),
        |(mut acc1, mut acc2, mut acc3), (v1, v2, v3)| {
            acc1.extend(v1);
            acc2.extend(v2);
            acc3.extend(v3);
            (acc1, acc2, acc3)
        },
    );

    let anim_event_paths = DashSet::new();

    config_characters
        .par_iter()
        .filter(|path| !path.is_empty())
        .for_each(|path| {
            if let Ok(config) = parse_config(
                path,
                "RPG.GameCore.CharacterConfig",
                assets,
                types,
                out_folder,
            ) {
                COUNTER_CONFIGS.fetch_add(1, Ordering::Relaxed);
                if let Some(Value::Array(anim_event_config_paths)) =
                    config.get("AnimEventConfigList")
                {
                    for anim_event_config_path in anim_event_config_paths {
                        let Some(path) = anim_event_config_path.as_str() else {
                            continue;
                        };

                        anim_event_paths.insert(path.to_string());
                    }
                }
            }
        });

    config_manikins
        .par_iter()
        .filter(|path| !path.is_empty())
        .for_each(|path| {
            if let Ok(config) = parse_config(
                path,
                "RPG.GameCore.ManikinCharacterConfig",
                assets,
                types,
                out_folder,
            ) {
                COUNTER_CONFIGS.fetch_add(1, Ordering::Relaxed);
                if let Some(Value::Array(anim_event_config_paths)) =
                    config.get("AnimEventConfigList")
                {
                    for anim_event_config_path in anim_event_config_paths {
                        let Some(path) = anim_event_config_path.as_str() else {
                            continue;
                        };

                        anim_event_paths.insert(path.to_string());
                    }
                }
            }
        });

    config_adventure_characters
        .par_iter()
        .filter(|path| !path.is_empty())
        .for_each(|path| {
            if let Ok(config) = parse_config(
                path,
                "RPG.GameCore.AdventureCharacterConfig",
                assets,
                types,
                out_folder,
            ) {
                COUNTER_CONFIGS.fetch_add(1, Ordering::Relaxed);
                if let Some(Value::Array(anim_event_config_paths)) =
                    config.get("AnimEventConfigList")
                {
                    for anim_event_config_path in anim_event_config_paths {
                        let Some(path) = anim_event_config_path.as_str() else {
                            continue;
                        };

                        anim_event_paths.insert(path.to_string());
                    }
                }
            }
        });

    anim_event_paths.par_iter().for_each(|path| {
        parse_and_count!(
            &path,
            "RPG.GameCore.CharacterAnimEventConfig",
            assets,
            types,
            out_folder
        );

        parse_and_count!(
            &path.replace(".json", ".layout.json"),
            "RPG.GameCore.ConfigBakeLayoutInfoList",
            assets,
            types,
            out_folder
        );
    });

    Ok(())
}
