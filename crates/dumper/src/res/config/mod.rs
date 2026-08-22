use std::{collections::HashMap, path::PathBuf};

use il2cpp::{
    get_native_method,
    vm::{boxed_value::BoxedBool, object::Il2CppObject, string::Il2CppString, value::Void},
};
use indicatif::{ProgressBar, ProgressStyle};
use reflection::{method_info::MethodInfo, serializer::BoxedSerializer};

mod level_output_floor;
mod mission;
mod rogue_chest_map;
mod rogue_npc;
mod summon_unit;
mod video_caption;

pub fn dump() {
    log::debug!("[Config Dumper] Dumping Configs");

    let mut serializer = BoxedSerializer::default();

    for (name, paths) in config_manifest() {
        match name.as_str() {
            "AdventureAbilityConfig" => {
                dump_from_config_list("LoadAdventureAbilityConfigList", paths, &mut serializer);
            }
            "TurnBasedAbilityConfig" => {
                dump_from_config_list("LoadTurnBasedAbilityConfigList", paths, &mut serializer);
            }
            "BattleLineupSkillTreePresetConfig" => {
                dump_from_config_list("LoadSkillTreePointPresetConfig", paths, &mut serializer);
            }
            "GlobalModifierConfig" => {
                dump_from_config_list("LoadGlobalModifierConfig", paths, &mut serializer);
            }
            "AdventureModifierConfig" => {
                dump_from_config_list("LoadAdventureModifierLookupTable", paths, &mut serializer);
            }
            "ComplexSkillAIGlobalGroupConfig" => {
                dump_from_config_list(
                    "LoadComplexSkillAIGlobalGroupLookup",
                    paths,
                    &mut serializer,
                );
            }
            "GlobalTaskTemplate" => {
                dump_from_config_list("LoadGlobalTaskListTemplateConfig", paths, &mut serializer);
            }
            _ => {}
        }
    }

    summon_unit::dump(&mut serializer);
    level_output_floor::dump(&mut serializer);
    video_caption::dump(&mut serializer);
    rogue_npc::dump(&mut serializer);
    rogue_chest_map::dump(&mut serializer);
    mission::dump(&mut serializer);
}

fn config_manifest() -> HashMap<String, Vec<String>> {
    get_native_method("RPG.GameCore.GameCoreConfigManager::LoadConfigManifest()")
        .unwrap()
        .invoke::<Void>(Il2CppObject::NULL, &[])
        .unwrap();

    let get_manifest = MethodInfo::from_handle(
        get_native_method("RPG.GameCore.ConfigManifest::get_ManifestItems()").unwrap(),
    )
    .unwrap();

    let mut serializer = BoxedSerializer::default();
    let serialized = serializer
        .serialize(
            get_manifest.get_return_type().unwrap(),
            get_manifest
                .get_il2cpp_method()
                .invoke(Il2CppObject::NULL, &[])
                .unwrap(),
        )
        .unwrap();

    let items: Vec<serde_json::Value> = serde_json::from_value(serialized).unwrap();
    items
        .into_iter()
        .map(|item| {
            let type_name = item
                .get(&**crate::res::CONFIG_MANIFEST_TYPE_FIELD)
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let path_list = item
                .get(&**crate::res::CONFIG_MANIFEST_PATH_LIST_FIELD)
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            (type_name, path_list)
        })
        .collect()
}

fn dump_from_config_list(
    func_name: &str,
    mut paths: Vec<String>,
    serializer: &mut BoxedSerializer,
) {
    let config_name = func_name.strip_prefix("Load").unwrap_or(func_name);
    log::debug!("Dumping {config_name}...");

    paths.retain(|path| is_json_exists(path));

    let pb = ProgressBar::new(paths.len() as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template(
                "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len}\n  {msg}",
            )
            .unwrap()
            .progress_chars("=>-"),
    );

    pb.enable_steady_tick(std::time::Duration::from_millis(100));

    for path in paths {
        if let Err(err) = microseh::try_seh(|| dump_config(func_name, &path, serializer, &pb)) {
            log::debug!("[{func_name}] -> {path} | Error: Failed to dump. Message: {err:?}");
        }
        pb.inc(1);
    }

    pb.finish_with_message(format!("Done dumping {config_name}"));
}

fn dump_config(func_name: &str, path: &str, serializer: &mut BoxedSerializer, pb: &ProgressBar) {
    pb.set_message(format!(
        "Dumping: {}",
        if path.len() > 50 {
            format!("...{}", &path[path.len() - 47..])
        } else {
            path.to_string()
        }
    ));

    let Some(load_method) = get_native_method(&format!(
        "RPG.GameCore.GameCoreConfigLoader::{func_name}(System.String)"
    )) else {
        log::debug!("[{func_name}] method is not exist in GameCoreConfigLoader");
        return;
    };

    let load_method_info = MethodInfo::from_handle(load_method).unwrap();

    let data = match load_method
        .invoke::<Il2CppObject>(Il2CppObject::NULL, &[&Il2CppString::from(path)])
    {
        Ok(data) => data,
        Err(err) => {
            log::debug!("[{func_name}] -> {path} | Error: Failed to load. Message: {err:?}");
            return;
        }
    };

    let serialized = match serializer.serialize(load_method_info.get_return_type().unwrap(), data) {
        Ok(serialized) => serialized,
        Err(err) => {
            log::debug!("{func_name} -> {path} | Error: Failed to serialize. Message: {err:?}");
            return;
        }
    };

    let output_path = PathBuf::from(format!("./DUMP/Resources/{path}"));
    if let Some(parent) = output_path.parent()
        && !parent.is_dir()
    {
        std::fs::create_dir_all(parent).unwrap();
    }

    std::fs::write(
        output_path,
        serde_json::to_string_pretty(&serialized).unwrap(),
    )
    .unwrap();
}

fn is_json_exists(path: &str) -> bool {
    get_native_method("RPG.Client.AssetLoader::ExistsDesignData(System.String)")
        .and_then(|m| {
            m.invoke::<BoxedBool>(Il2CppObject::NULL, &[&Il2CppString::from(path)])
                .ok()
        })
        .is_some_and(|b| b.unbox())
}
