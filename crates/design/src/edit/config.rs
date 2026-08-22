use crate::edit::patch_data_in_design;
use anyhow::Context;
use crate::common::{
    data_define::{DataDefine, ValueKind},
    downloader::DownloadedAssetInfo,
    hash,
};
use serde_json::{Value, json};
use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    rc::Rc,
    sync::LazyLock,
};
use crate::builder::DynamicBuilder;
use crate::parser::DynamicParser;
use walkdir::WalkDir;

static CONFIG_TYPE_MAP: LazyLock<HashMap<&'static str, Vec<&'static str>>> = LazyLock::new(|| {
    HashMap::from([
        (
            "RPG.GameCore.AdventureAbilityConfigList",
            vec!["ConfigAdventureAbility"],
        ),
        (
            "RPG.GameCore.TurnBasedAbilityConfigList",
            vec!["ConfigAbility"],
        ),
        (
            "RPG.GameCore.GlobalModifierConfig",
            vec!["ConfigGlobalModifier"],
        ),
        (
            "RPG.GameCore.SkillTreePointPresetConfig",
            vec!["BattleLineupPage/SkillTreePointPreset"],
        ),
        (
            "RPG.GameCore.AdventureModifierLookupTable",
            vec!["ConfigAdventureModifier"],
        ),
        (
            "RPG.GameCore.ComplexSkillAIGlobalGroupLookup",
            vec!["ConfigAI/ComplexSkillAIGlobalGroup"],
        ),
        (
            "RPG.GameCore.GlobalTaskListTemplateConfig",
            vec!["ConfigGlobalTaskListTemplate"],
        ),
        (
            "RPG.GameCore.RtLevelFloorInfo",
            vec!["LevelOutput/RuntimeFloor"],
        ),
        (
            "RPG.GameCore.LevelFloorBakedInfo",
            vec!["LevelOutput_Baked/Floor"],
        ),
        (
            "RPG.GameCore.LevelFloorCrossMapBriefInfo",
            vec!["LevelOutput_Baked/FloorCrossMapBriefInfo"],
        ),
        ("RPG.GameCore.LevelRegionInfos", vec!["LevelOutput/Region"]),
        (
            "RPG.GameCore.MapRotationConfig",
            vec!["LevelOutput/RotatableRegion"],
        ),
        (
            "RPG.GameCore.EraFlipperConfig",
            vec!["LevelOutput/EraFlipper"],
        ),
        ("RPG.GameCore.LevelNavmapConfig", vec!["LevelOutput/Map"]),
        (
            "RPG.GameCore.RtLevelGroupInfoBase",
            vec!["LevelOutput/SharedRuntimeGroup", "LevelOutput/RuntimeGroup"],
        ),
        ("RPG.GameCore.SummonUnitConfig", vec!["ConfigSummonUnit"]),
        (
            "RPG.GameCore.RogueChestMapConfig",
            vec!["Gameplays/RogueDLC"],
        ),
        ("RPG.GameCore.GraphicsSettingJson", vec!["Device"]),
        (
            "RPG.GameCore.CharacterConfig",
            vec!["ConfigCharacter/Avatar"],
        ),
        (
            "RPG.GameCore.AdventureCharacterConfig",
            vec!["ConfigCharacter/LocalPlayer"],
        ),
    ])
});

pub fn modify_configs(
    config_dir: &Path,
    asset: &mut DownloadedAssetInfo,
    types: &HashMap<String, DataDefine>,
    modified_files: &mut HashSet<String>,
) -> anyhow::Result<()> {
    for (type_name, dirs) in &*CONFIG_TYPE_MAP {
        let dirs = dirs.iter().map(|v| config_dir.join(v)).collect::<Vec<_>>();
        for dir in dirs {
            for entry in WalkDir::new(dir)
                .into_iter()
                .filter_map(Result::ok)
                .filter(|e| e.file_type().is_file())
            {
                let path = normalize_path(entry.path());
                let full_path = path.to_string_lossy();
                let config_path = match full_path.find("Config/") {
                    Some(pos) => &full_path[pos..],
                    None => continue,
                };

                match modify_config(&path, config_path, type_name, asset, types, modified_files) {
                    Ok(_) => log::debug!("modified config file: {type_name} | {config_path}"),
                    Err(err) => {
                        log::error!(
                            "failed to modify config file: {type_name} | {config_path}: {err:?}"
                        );
                    }
                }
            }
        }
    }

    Ok(())
}

fn modify_config(
    full_path: &Path,
    config_path: &str,
    type_name: &str,
    asset: &mut DownloadedAssetInfo,
    types: &HashMap<String, DataDefine>,
    modified_files: &mut HashSet<String>,
) -> anyhow::Result<()> {
    let data = serde_json::from_slice::<Value>(
        &std::fs::read(full_path)
            .context(format!("input file doesnt exist {}", full_path.display()))?,
    )
    .context("input file is not a valid json")?;

    let hash_config = hash::get_32bit_hash_const(&format!(
        "BakedConfig/{}",
        config_path.replace(".json", ".bytes")
    ));

    if !asset.design_data_list.contains_key(&hash_config) {
        return Err(anyhow::anyhow!("config doesn't exist {config_path}"));
    }

    // This hash is used for configs that has layout (store offsets of the actual config)
    let hash_layout = hash::get_32bit_hash_const(&format!(
        "BakedConfig/{}",
        config_path.replace(".json", ".layout.bytes")
    ));

    let kind = ValueKind::Class(String::from(type_name));
    let mut callbacks = Vec::with_capacity(1);
    let mut builder = DynamicBuilder::new(types, &mut callbacks);

    let offsets = Rc::new(RefCell::new(HashMap::<String, usize>::new()));

    if asset.design_data_list.contains_key(&hash_layout) {
        let offsets_cloned = offsets.clone();

        builder.register_callback(Box::new(move |event| {
            let (name, offset) = match event {
                crate::builder::DynamicBuilderEvent::ArrayBuildValue {
                    value_kind: _,
                    index: _,
                    value,
                    offset,
                } => {
                    if let Some(name) = value.get("Name")
                        && let Some(name) = name.as_str()
                    {
                        (name.to_string(), offset)
                    } else {
                        return;
                    }
                }
                crate::builder::DynamicBuilderEvent::DictionaryBuildValue {
                    value_kind: _,
                    key,
                    value: _,
                    offset,
                } => (key.to_string(), offset),
            };

            // TODO: We hardcode + 1 offset here (existflag bitfields)
            // This will always works if bitfield size < 128
            // If the bitfield is bigger, this will not work most likely!
            offsets_cloned.borrow_mut().insert(name, offset + 1);
        }));
    }

    // Build the config
    builder.build(&kind, &data).unwrap();
    patch_data_in_design(asset, hash_config, builder.into_inner(), modified_files);

    // If the config has layout, we need to update it as well
    if let Some(data) = asset.design_data_list.get(&hash_layout) {
        let mut parser = DynamicParser::new(types, data);
        let bake_info_kind =
            ValueKind::Class(String::from("RPG.GameCore.ConfigBakeLayoutInfoList"));

        let mut bake_info = parser
            .parse(&bake_info_kind, false)
            .context("Failed to parse PG.GameCore.ConfigBakeLayoutInfoList")?;

        let Some(bake_info_layouts) = bake_info
            .get_mut("BakeInfoLayouts")
            .and_then(|a| a.as_array_mut())
        else {
            return Ok(()); // No BakeInfoLayouts
        };

        for layout in bake_info_layouts.iter_mut() {
            let offsets = offsets.borrow();
            let unique_name = layout.get("UniqueName").unwrap().as_str().unwrap();

            if let Some(new_offset) = offsets.get(unique_name) {
                *layout.get_mut("Offset").unwrap() = json!(new_offset);
            } else {
                return Err(anyhow::anyhow!(
                    "{unique_name} does not have new offset for {layout}"
                ));
            }
        }

        // Build the bake info
        let mut callbacks = Vec::new();
        let mut builder = DynamicBuilder::new(types, &mut callbacks);
        builder.build(&bake_info_kind, &bake_info).unwrap();
        patch_data_in_design(asset, hash_layout, builder.into_inner(), modified_files);
    }

    Ok(())
}

#[inline]
fn normalize_path<P: AsRef<Path>>(path: P) -> PathBuf {
    PathBuf::from(path.as_ref().to_string_lossy().replace('\\', "/"))
}
