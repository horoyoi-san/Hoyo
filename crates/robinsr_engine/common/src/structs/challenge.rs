use std::{collections::HashMap, fs, path::Path, sync::LazyLock};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengeConfig {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "GroupID")]
    pub group_id: u32,
    pub floor: Option<u32>,
    #[serde(rename = "MapEntranceID")]
    pub map_entrance_id: u32,
    #[serde(rename = "MapEntranceID2", default)]
    pub map_entrance_id2: Option<u32>,
    #[serde(rename = "MazeGroupID1", default)]
    pub maze_group_id1: u32,
    #[serde(rename = "MazeGroupID2", default)]
    pub maze_group_id2: Option<u32>,
    #[serde(rename = "NpcMonsterIDList1", default)]
    pub npc_monster_id_list1: Vec<u32>,
    #[serde(rename = "NpcMonsterIDList2", default)]
    pub npc_monster_id_list2: Vec<u32>,
    #[serde(rename = "EventIDList1", default)]
    pub event_id_list1: Vec<u32>,
    #[serde(rename = "EventIDList2", default)]
    pub event_id_list2: Vec<u32>,
    #[serde(rename = "MazeBuffID", default)]
    pub maze_buff_id: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChallengeMazeConfigJson {
    pub challenge_config: Vec<ChallengeConfig>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengePeak {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "MazeGroupID", default)]
    pub maze_group_id: u32,
    #[serde(rename = "MapEntranceID", default)]
    pub map_entrance_id: u32,
    #[serde(rename = "NpcMonsterIDList", default)]
    pub npc_monster_id_list: Vec<u32>,
    #[serde(rename = "EventIDList", default)]
    pub event_id_list: Vec<u32>,
    #[serde(rename = "TagList", default)]
    pub tag_list: Vec<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChallengePeakConfigJson {
    pub challenge_peak_config: Vec<ChallengePeak>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengePeakBoss {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "HardTagList", default)]
    pub hard_tag_list: Vec<u32>,
    #[serde(rename = "BuffList", default)]
    pub buff_list: Vec<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChallengePeakBossConfigJson {
    pub challenge_peak_boss_config: Vec<ChallengePeakBoss>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengePeakGroup {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "BossLevelID", default)]
    pub boss_level_id: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChallengePeakGroupConfigJson {
    pub challenge_peak_group: Vec<ChallengePeakGroup>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengeTierce {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "MazeGroupID", default)]
    pub maze_group_id: u32,
    #[serde(rename = "MapEntranceID", default)]
    pub map_entrance_id: u32,
    #[serde(rename = "NpcMonsterIDList", default)]
    pub npc_monster_id_list: Vec<u32>,
    #[serde(rename = "EventIDList", default)]
    pub event_id_list: Vec<u32>,
    #[serde(rename = "TargetID", default)]
    pub target_id: Vec<u32>,
    #[serde(rename = "TierceTargetID", default)]
    pub tierce_target_id: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChallengeTierceConfigJson {
    pub challenge_tierce: Vec<ChallengeTierce>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StageConfigEntry {
    #[serde(rename = "StageID")]
    pub stage_id: u32,
    pub level: u32,
    #[serde(rename = "MonsterList", default)]
    pub monster_list: Vec<Vec<u32>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StageConfigJson {
    pub stage_config: Vec<StageConfigEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MapEntranceEntry {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "PlaneID")]
    pub plane_id: u32,
    #[serde(rename = "FloorID")]
    pub floor_id: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MapEntranceJson {
    pub map_entrance_config: Vec<MapEntranceEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MazePlaneEntry {
    #[serde(rename = "PlaneID")]
    pub plane_id: u32,
    #[serde(rename = "WorldID", default)]
    pub world_id: u32,
    #[serde(rename = "StartFloorID", default)]
    pub start_floor_id: u32,
    #[serde(rename = "FloorIDList", default)]
    pub floor_id_list: Vec<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MazePlaneJson {
    pub maze_plane_config: Vec<MazePlaneEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnchorVector {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnchorItem {
    #[serde(rename = "ID")]
    pub id: u32,
    pub pos: AnchorVector,
    pub rot: AnchorVector,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnchorConfigEntry {
    #[serde(rename = "entryID")]
    pub entry_id: u32,
    pub anchor: Vec<AnchorItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnchorConfigJson {
    pub anchor_config: Vec<AnchorConfigEntry>,
}

#[derive(Default)]
pub struct ChallengeResources {
    pub challenges: HashMap<u32, ChallengeConfig>,
    pub challenge_list: Vec<ChallengeConfig>,
    pub peaks: HashMap<u32, ChallengePeak>,
    pub peak_bosses: HashMap<u32, ChallengePeakBoss>,
    pub peak_groups: Vec<ChallengePeakGroup>,
    pub tierces: HashMap<u32, ChallengeTierce>,
    pub stages: HashMap<u32, StageConfigEntry>,
    pub map_entrances: HashMap<u32, MapEntranceEntry>,
    pub maze_planes: Vec<MazePlaneEntry>,
    pub anchors: HashMap<u32, AnchorItem>,
}

fn find_file(name: &str) -> Option<String> {
    let mut candidates = vec![
        format!("resources/{}", name),
        format!("bin/resources/{}", name),
        format!("../resources/{}", name),
        format!("crates/robinsr_engine/resources/{}", name),
        format!("../crates/robinsr_engine/resources/{}", name),
        format!("bin/{}", name),
        name.to_string(),
    ];
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join(name).to_string_lossy().to_string());
            candidates.push(parent.join("resources").join(name).to_string_lossy().to_string());
            if let Some(grandparent) = parent.parent() {
                candidates.push(grandparent.join("bin").join("resources").join(name).to_string_lossy().to_string());
                candidates.push(grandparent.join("resources").join(name).to_string_lossy().to_string());
                candidates.push(grandparent.join("crates").join("robinsr_engine").join("resources").join(name).to_string_lossy().to_string());
            }
        }
    }
    for c in &candidates {
        if Path::new(c).is_file() {
            if let Ok(content) = fs::read_to_string(c) {
                return Some(content);
            }
        }
    }
    None
}

impl ChallengeResources {
    pub fn load() -> Self {
        let mut res = Self::default();

        if let Some(content) = find_file("ChallengeMazeConfig.json") {
            if let Ok(parsed) = serde_json::from_str::<ChallengeMazeConfigJson>(&content) {
                for item in parsed.challenge_config {
                    res.challenges.insert(item.id, item.clone());
                    res.challenge_list.push(item);
                }
            }
        }

        if let Some(content) = find_file("ChallengePeakConfig.json") {
            if let Ok(parsed) = serde_json::from_str::<ChallengePeakConfigJson>(&content) {
                for item in parsed.challenge_peak_config {
                    res.peaks.insert(item.id, item);
                }
            }
        }

        if let Some(content) = find_file("ChallengePeakBossConfig.json") {
            if let Ok(parsed) = serde_json::from_str::<ChallengePeakBossConfigJson>(&content) {
                for item in parsed.challenge_peak_boss_config {
                    res.peak_bosses.insert(item.id, item);
                }
            }
        }

        if let Some(content) = find_file("ChallengePeakGroupConfig.json") {
            if let Ok(parsed) = serde_json::from_str::<ChallengePeakGroupConfigJson>(&content) {
                res.peak_groups = parsed.challenge_peak_group;
            }
        }

        if let Some(content) = find_file("ChallengeMazeTierceConfig.json") {
            if let Ok(parsed) = serde_json::from_str::<ChallengeTierceConfigJson>(&content) {
                for item in parsed.challenge_tierce {
                    res.tierces.insert(item.id, item);
                }
            }
        }

        if let Some(content) = find_file("StageConfig.json") {
            if let Ok(parsed) = serde_json::from_str::<StageConfigJson>(&content) {
                for item in parsed.stage_config {
                    res.stages.insert(item.stage_id, item);
                }
            }
        }

        if let Some(content) = find_file("MapEntrance.json") {
            if let Ok(parsed) = serde_json::from_str::<MapEntranceJson>(&content) {
                for item in parsed.map_entrance_config {
                    res.map_entrances.insert(item.id, item);
                }
            }
        }

        if let Some(content) = find_file("MazePlane.json") {
            if let Ok(parsed) = serde_json::from_str::<MazePlaneJson>(&content) {
                res.maze_planes = parsed.maze_plane_config;
            }
        }

        if let Some(content) = find_file("Anchor.json") {
            if let Ok(parsed) = serde_json::from_str::<AnchorConfigJson>(&content) {
                for item in parsed.anchor_config {
                    if let Some(first_anchor) = item.anchor.into_iter().next() {
                        res.anchors.insert(item.entry_id, first_anchor);
                    }
                }
            }
        }

        res
    }

    pub fn get_challenge_plane_info(&self, entrance_id: u32) -> Option<(u32, u32, u32)> {
        // Returns (floor_id, plane_id, world_id)
        let entrance = self.map_entrances.get(&entrance_id)?;
        let floor_id = entrance.floor_id;
        for plane in &self.maze_planes {
            if plane.floor_id_list.contains(&floor_id) || plane.start_floor_id == floor_id {
                return Some((floor_id, plane.plane_id, plane.world_id));
            }
        }
        Some((floor_id, entrance.plane_id, 501))
    }
}

pub static CHALLENGE_RES: LazyLock<ChallengeResources> = LazyLock::new(ChallengeResources::load);
