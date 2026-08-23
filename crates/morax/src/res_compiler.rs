use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    time::Instant,
};

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Vector {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneMonsterInfo {
    pub pos: Vector,
    pub rot: Vector,
    pub group_id: u32,
    pub inst_id: u32,
    pub monster_id: u32,
    pub event_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneNpcInfo {
    pub pos: Vector,
    pub rot: Vector,
    pub group_id: u32,
    pub inst_id: u32,
    pub npc_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScenePropInfo {
    pub pos: Vector,
    pub rot: Vector,
    pub group_id: u32,
    pub inst_id: u32,
    pub prop_state: u32,
    pub prop_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TeleportInfo {
    pub pos: Vector,
    pub rot: Vector,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneData {
    pub npcs: Vec<SceneNpcInfo>,
    pub props: Vec<ScenePropInfo>,
    pub monsters: Vec<SceneMonsterInfo>,
    pub teleports: HashMap<u32, TeleportInfo>,
    pub finished_sub_missions: Vec<u32>,
    pub finished_main_missions: Vec<u32>,
    pub chests: Vec<u32>,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LevelOutputConfig {
    pub is_entered_scene_info: bool,
    pub scenes: HashMap<u32, SceneData>,
    pub plane_type: u32,
    pub world_id: u32,
    pub sections: Vec<u32>,
    pub saved_values: HashMap<String, i32>,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AvatarConfig {
    pub weakness_buff_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JsonConfig {
    pub level_output_configs: HashMap<u32, HashMap<String, LevelOutputConfig>>,
    pub avatar_configs: HashMap<u32, AvatarConfig>,
    pub map_default_entrance_map: HashMap<u32, u32>,
    pub relic_avatar_recommend: HashMap<u32, Vec<u32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResCompileResult {
    pub success: bool,
    pub scene_groups_count: usize,
    pub avatars_count: usize,
    pub map_entrances_count: usize,
    pub time_seconds: f64,
    pub output_file: String,
    pub file_size_mb: f64,
    pub message: String,
}

pub struct ResourceCompiler;

impl ResourceCompiler {
    /// Compiles a raw game Resources directory into a unified res.json file
    pub fn compile_from_directory(
        resources_dir: &Path,
        output_file: &Path,
    ) -> Result<ResCompileResult> {
        let start = Instant::now();

        if !resources_dir.is_dir() {
            return Err(anyhow::anyhow!(
                "ไม่พบโฟลเดอร์ Resources ต้นทาง '{}' (กรุณาเลือกโฟลเดอร์ที่มีอยู่จริง)",
                resources_dir.display()
            ));
        }

        let excel_dir = resources_dir.join("ExcelOutput");
        let config_scene_dir = resources_dir.join("Config").join("LevelOutput").join("Scene");
        if !excel_dir.is_dir() && !config_scene_dir.is_dir() {
            return Err(anyhow::anyhow!(
                "โฟลเดอร์ '{}' ไม่พบโฟลเดอร์ ExcelOutput หรือ Config/LevelOutput/Scene กรุณาตรวจสอบโฟลเดอร์ Resources อีกครั้ง",
                resources_dir.display()
            ));
        }

        let mut config = JsonConfig::default();

        // 1. Check for fallback baseline res.json if available
        let baseline_candidates = [
            PathBuf::from("res.json"),
            PathBuf::from("../../res.json"),
            PathBuf::from("../res.json"),
        ];
        for cand in &baseline_candidates {
            if cand.is_file() {
                if let Ok(content) = fs::read_to_string(cand) {
                    if let Ok(parsed) = serde_json::from_str::<JsonConfig>(&content) {
                        config = parsed;
                        break;
                    }
                }
            }
        }

        // 2. Parse ExcelOutput/AvatarConfig.json
        let excel_dir = resources_dir.join("ExcelOutput");
        let avatar_cfg_path = excel_dir.join("AvatarConfig.json");
        if avatar_cfg_path.is_file() {
            if let Ok(content) = fs::read_to_string(&avatar_cfg_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(map) = val.as_object() {
                        for (k, v) in map {
                            if let Ok(id) = k.parse::<u32>() {
                                let w_buff = v.get("WeaknessBuffID").or_else(|| v.get("weaknessBuffId"))
                                    .and_then(|x| x.as_u64())
                                    .unwrap_or(0) as u32;
                                config.avatar_configs.insert(id, AvatarConfig { weakness_buff_id: w_buff });
                            }
                        }
                    } else if let Some(arr) = val.as_array() {
                        for item in arr {
                            if let Some(id) = item.get("AvatarID").or_else(|| item.get("avatarId")).and_then(|x| x.as_u64()) {
                                let w_buff = item.get("WeaknessBuffID").or_else(|| item.get("weaknessBuffId"))
                                    .and_then(|x| x.as_u64())
                                    .unwrap_or(0) as u32;
                                config.avatar_configs.insert(id as u32, AvatarConfig { weakness_buff_id: w_buff });
                            }
                        }
                    }
                }
            }
        }

        // 3. Parse ExcelOutput/MappingInfo.json (Map Default Entrance)
        let map_info_path = excel_dir.join("MappingInfo.json");
        if map_info_path.is_file() {
            if let Ok(content) = fs::read_to_string(&map_info_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(arr) = val.as_array() {
                        for item in arr {
                            let entry_id = item.get("ID").or_else(|| item.get("id")).and_then(|x| x.as_u64());
                            let floor_id = item.get("FloorID").or_else(|| item.get("floorId")).and_then(|x| x.as_u64());
                            if let (Some(e), Some(f)) = (entry_id, floor_id) {
                                config.map_default_entrance_map.insert(e as u32, f as u32);
                            }
                        }
                    }
                }
            }
        }

        // 4. Parse ExcelOutput/AvatarRelicRecommend.json
        let relic_rec_path = excel_dir.join("AvatarRelicRecommend.json");
        if relic_rec_path.is_file() {
            if let Ok(content) = fs::read_to_string(&relic_rec_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(arr) = val.as_array() {
                        for item in arr {
                            if let Some(avatar_id) = item.get("AvatarID").or_else(|| item.get("avatarId")).and_then(|x| x.as_u64()) {
                                if let Some(sets) = item.get("SetIDList").or_else(|| item.get("setIdList")).and_then(|x| x.as_array()) {
                                    let list: Vec<u32> = sets.iter().filter_map(|s| s.as_u64().map(|v| v as u32)).collect();
                                    config.relic_avatar_recommend.insert(avatar_id as u32, list);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Serialize into JSON and Save
        if let Some(parent) = output_file.parent() {
            let _ = fs::create_dir_all(parent);
        }

        // Auto-Backup existing res.json before overwrite (QoL Safety)
        if output_file.is_file() {
            let bak_path = output_file.with_extension("json.bak");
            let _ = fs::copy(output_file, bak_path);
        }
        if Path::new("res.json").is_file() {
            let _ = fs::copy("res.json", "res.json.bak");
        }
        if Path::new("bin/res.json").is_file() {
            let _ = fs::copy("bin/res.json", "bin/res.json.bak");
        }

        let json_bytes = serde_json::to_string(&config)
            .map_err(|e| anyhow::anyhow!("Failed to serialize res.json: {e}"))?;

        fs::write(output_file, &json_bytes)
            .map_err(|e| anyhow::anyhow!("Failed to write {}: {e}", output_file.display()))?;

        // Sync to project root and bin/ if applicable
        let _ = fs::write("res.json", &json_bytes);
        let _ = fs::write("bin/res.json", &json_bytes);

        let elapsed = start.elapsed().as_secs_f64();
        let file_size_mb = (json_bytes.len() as f64) / (1024.0 * 1024.0);

        Ok(ResCompileResult {
            success: true,
            scene_groups_count: config.level_output_configs.len(),
            avatars_count: config.avatar_configs.len(),
            map_entrances_count: config.map_default_entrance_map.len(),
            time_seconds: (elapsed * 100.0).round() / 100.0,
            output_file: output_file.display().to_string(),
            file_size_mb: (file_size_mb * 100.0).round() / 100.0,
            message: format!(
                "Successfully compiled res.json ({:.2} MB) with {} scene maps, {} avatars in {:.2}s",
                file_size_mb,
                config.level_output_configs.len(),
                config.avatar_configs.len(),
                elapsed
            ),
        })
    }
}
