use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    time::Instant,
};

// ---------------------------------------------------------------------------
// Output structs (written to res.json, read by RobinSR server)
// ---------------------------------------------------------------------------

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Vector {
    #[serde(default)]
    pub x: i32,
    #[serde(default)]
    pub y: i32,
    #[serde(default)]
    pub z: i32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneMonsterInfo {
    #[serde(default)]
    pub pos: Vector,
    #[serde(default)]
    pub rot: Vector,
    #[serde(default)]
    pub group_id: u32,
    #[serde(default)]
    pub inst_id: u32,
    #[serde(default)]
    pub monster_id: u32,
    #[serde(default)]
    pub event_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneNpcInfo {
    #[serde(default)]
    pub pos: Vector,
    #[serde(default)]
    pub rot: Vector,
    #[serde(default)]
    pub group_id: u32,
    #[serde(default)]
    pub inst_id: u32,
    #[serde(default)]
    pub npc_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScenePropInfo {
    #[serde(default)]
    pub pos: Vector,
    #[serde(default)]
    pub rot: Vector,
    #[serde(default)]
    pub group_id: u32,
    #[serde(default)]
    pub inst_id: u32,
    #[serde(default)]
    pub prop_state: u32,
    #[serde(default)]
    pub prop_id: u32,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TeleportInfo {
    #[serde(default)]
    pub pos: Vector,
    #[serde(default)]
    pub rot: Vector,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub anchor_id: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inst_id: Option<u32>,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneData {
    #[serde(default)]
    pub monsters: Vec<SceneMonsterInfo>,
    #[serde(default)]
    pub npcs: Vec<SceneNpcInfo>,
    #[serde(default)]
    pub props: Vec<ScenePropInfo>,
    #[serde(default)]
    pub teleports: HashMap<String, TeleportInfo>,
    #[serde(default)]
    pub chests: Vec<u32>,
    #[serde(default)]
    pub finished_sub_missions: Vec<u32>,
    #[serde(default)]
    pub finished_main_missions: Vec<u32>,
}

impl SceneData {
    fn is_empty(&self) -> bool {
        self.npcs.is_empty() && self.props.is_empty() && self.monsters.is_empty() && self.chests.is_empty()
    }
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LevelOutputConfig {
    #[serde(default)]
    pub is_entered_scene_info: bool,
    #[serde(default)]
    pub plane_type: u32,
    #[serde(default)]
    pub world_id: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_anchor_id: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_group_id: Option<u32>,
    #[serde(default)]
    pub sections: Vec<u32>,
    #[serde(default)]
    pub saved_values: HashMap<String, i32>,
    #[serde(default)]
    pub scenes: HashMap<String, SceneData>,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AvatarConfig {
    #[serde(default)]
    pub weakness_buff_id: u32,
    #[serde(default)]
    pub technique_buff_ids: Vec<u32>,
}

#[derive(Deserialize, Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResJson {
    pub level_output_configs: HashMap<String, HashMap<String, LevelOutputConfig>>,
    pub avatar_configs: HashMap<String, AvatarConfig>,
    pub map_default_entrance_map: HashMap<String, u32>,
    pub relic_avatar_recommend: HashMap<String, Vec<u32>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResCompileResult {
    pub success: bool,
    pub file_size_mb: f64,
    pub total_entrances: usize,
    pub total_avatars: usize,
    pub total_groups: usize,
    pub scene_groups_count: usize,
    pub avatars_count: usize,
    pub map_entrances_count: usize,
    pub time_seconds: f64,
    pub output_file: String,
    pub message: String,
}

// ---------------------------------------------------------------------------
// Internal structs for parsing source game data
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug, Default)]
struct RuntimeFloor {
    #[serde(rename = "FloorID", default)]
    floor_id: u32,
    #[serde(rename = "GroupInstanceCommonMap", default)]
    group_instance_common_map: HashMap<String, serde_json::Value>,
    #[serde(rename = "GroupInstanceList", default)]
    group_instance_list: Vec<GroupInstanceRef>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "PascalCase")]
struct GroupCommonMeta {
    #[serde(default)]
    is_delete: bool,
    #[serde(default)]
    category: String,
    #[serde(default)]
    load_side: String,
    #[serde(default)]
    load_on_initial: bool,
    #[serde(default)]
    load_condition: Option<ConditionBlock>,
    #[serde(default)]
    unload_condition: Option<ConditionBlock>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "PascalCase")]
struct ConditionBlock {
    #[serde(default)]
    operation: String,
    #[serde(default)]
    conditions: Vec<Condition>,
}

#[derive(Deserialize, Debug, Clone, Default)]
struct Condition {
    #[serde(rename = "Type", default)]
    cond_type: String,
    #[serde(rename = "Phase", default)]
    phase: String,
    #[serde(rename = "ID", default)]
    id: u32,
}

#[derive(Deserialize, Debug, Clone, Default)]
struct GroupInstanceRef {
    #[serde(rename = "ID", default)]
    id: u32,
    #[serde(rename = "GroupPath", default)]
    group_path: String,
    #[serde(rename = "IsDelete", default)]
    is_delete: bool,
}

struct MapEntranceRow {
    id: u32,
    floor_id: u32,
    plane_id: u32,
    start_group_id: u32,
    start_anchor_id: u32,
    finish_main: HashSet<u32>,
    finish_sub: HashSet<u32>,
    begin_main: HashSet<u32>,
}

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------

pub struct ResourceCompiler;

impl ResourceCompiler {
    fn to_coord(val: &serde_json::Value) -> i32 {
        if let Some(n) = val.as_f64() {
            (n * 1000.0).round() as i32
        } else if let Some(n) = val.as_i64() {
            (n * 1000) as i32
        } else {
            0
        }
    }

    fn parse_prop_state(val: &serde_json::Value) -> u32 {
        if let Some(n) = val.as_u64() {
            return n as u32;
        }
        if let Some(s) = val.as_str() {
            return match s {
                "Closed" => 0, "Open" => 1, "Locked" => 2,
                "BridgeState1" => 3, "BridgeState2" => 4, "BridgeState3" => 5, "BridgeState4" => 6,
                "CheckPointDisable" => 7, "CheckPointEnable" => 8,
                "TriggerDisable" => 9, "TriggerEnable" => 10,
                "ChestLocked" => 11, "ChestClosed" => 12, "ChestUsed" => 13,
                "Elevator1" => 14, "Elevator2" => 15, "Elevator3" => 16,
                "WaitActive" => 17, "EventClose" => 18, "EventOpen" => 19,
                "Hidden" => 20,
                "TeleportGate0" => 21, "TeleportGate1" => 22, "TeleportGate2" => 23, "TeleportGate3" => 24,
                "Destructed" => 25,
                "CustomState01" => 101, "CustomState02" => 102, "CustomState03" => 103,
                "CustomState04" => 104, "CustomState05" => 105, "CustomState06" => 106,
                "CustomState07" => 107, "CustomState08" => 108, "CustomState09" => 109,
                _ => s.parse::<u32>().unwrap_or(0),
            };
        }
        0
    }

    fn parse_plane_type(s: &str) -> u32 {
        match s {
            "Town" => 1, "Maze" => 2, "Train" => 3, "Challenge" => 4,
            "Rogue" => 5, "Raid" => 6, "AetherDivide" => 7, "TrialActivity" => 8,
            _ => 0,
        }
    }

    fn is_unload_triggered(uc: &Option<ConditionBlock>, row: &MapEntranceRow) -> bool {
        let Some(block) = uc else { return false };
        let satisfied = |c: &Condition| -> bool {
            match (c.cond_type.as_str(), c.phase.as_str()) {
                ("MainMission", "Finish") => row.finish_main.contains(&c.id),
                ("MainMission", "Accept") => {
                    row.finish_main.contains(&c.id) || row.begin_main.contains(&c.id)
                }
                ("SubMission", "Finish") => row.finish_sub.contains(&c.id),
                ("SubMission", "Accept") => row.finish_sub.contains(&c.id),
                _ => false,
            }
        };
        if block.operation == "And" {
            block.conditions.iter().all(satisfied)
        } else {
            block.conditions.iter().any(satisfied)
        }
    }

    fn parse_level_group(content: &str, group_id: u32) -> SceneData {
        let val = match serde_json::from_str::<serde_json::Value>(content) {
            Ok(v) => v,
            Err(_) => return SceneData::default(),
        };

        let mut monsters = Vec::new();
        if let Some(arr) = val.get("MonsterList").and_then(|x| x.as_array()) {
            for m in arr {
                if m.get("IsDelete").and_then(|x| x.as_bool()).unwrap_or(false) {
                    continue;
                }
                monsters.push(SceneMonsterInfo {
                    pos: Vector {
                        x: Self::to_coord(m.get("PosX").unwrap_or(&serde_json::Value::Null)),
                        y: Self::to_coord(m.get("PosY").unwrap_or(&serde_json::Value::Null)),
                        z: Self::to_coord(m.get("PosZ").unwrap_or(&serde_json::Value::Null)),
                    },
                    rot: Vector {
                        x: Self::to_coord(m.get("RotX").unwrap_or(&serde_json::Value::Null)),
                        y: Self::to_coord(m.get("RotY").unwrap_or(&serde_json::Value::Null)),
                        z: Self::to_coord(m.get("RotZ").unwrap_or(&serde_json::Value::Null)),
                    },
                    group_id,
                    inst_id: m
                        .get("ID")
                        .or_else(|| m.get("InstID"))
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                    monster_id: m
                        .get("NPCMonsterID")
                        .or_else(|| m.get("MonsterID"))
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                    event_id: m
                        .get("EventID")
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                });
            }
        }

        let mut npcs = Vec::new();
        if let Some(arr) = val.get("NPCList").and_then(|x| x.as_array()) {
            for n in arr {
                if n.get("IsDelete").and_then(|x| x.as_bool()).unwrap_or(false) {
                    continue;
                }
                npcs.push(SceneNpcInfo {
                    pos: Vector {
                        x: Self::to_coord(n.get("PosX").unwrap_or(&serde_json::Value::Null)),
                        y: Self::to_coord(n.get("PosY").unwrap_or(&serde_json::Value::Null)),
                        z: Self::to_coord(n.get("PosZ").unwrap_or(&serde_json::Value::Null)),
                    },
                    rot: Vector {
                        x: Self::to_coord(n.get("RotX").unwrap_or(&serde_json::Value::Null)),
                        y: Self::to_coord(n.get("RotY").unwrap_or(&serde_json::Value::Null)),
                        z: Self::to_coord(n.get("RotZ").unwrap_or(&serde_json::Value::Null)),
                    },
                    group_id,
                    inst_id: n
                        .get("ID")
                        .or_else(|| n.get("InstID"))
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                    npc_id: n
                        .get("NPCID")
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                });
            }
        }

        let mut props = Vec::new();
        let mut chests = Vec::new();

        if let Some(arr) = val.get("PropList").and_then(|x| x.as_array()) {
            for p in arr {
                if p.get("IsDelete").and_then(|x| x.as_bool()).unwrap_or(false) {
                    continue;
                }
                
                if let Some(chest_id) = p.get("ChestID").and_then(|x| x.as_u64()) {
                    if chest_id > 0 {
                        chests.push(chest_id as u32);
                    }
                }

                let state_val = p
                    .get("State")
                    .or_else(|| p.get("PropState"))
                    .unwrap_or(&serde_json::Value::Null);
                props.push(ScenePropInfo {
                    pos: Vector {
                        x: Self::to_coord(p.get("PosX").unwrap_or(&serde_json::Value::Null)),
                        y: Self::to_coord(p.get("PosY").unwrap_or(&serde_json::Value::Null)),
                        z: Self::to_coord(p.get("PosZ").unwrap_or(&serde_json::Value::Null)),
                    },
                    rot: Vector {
                        x: Self::to_coord(p.get("RotX").unwrap_or(&serde_json::Value::Null)),
                        y: Self::to_coord(p.get("RotY").unwrap_or(&serde_json::Value::Null)),
                        z: Self::to_coord(p.get("RotZ").unwrap_or(&serde_json::Value::Null)),
                    },
                    group_id,
                    inst_id: p
                        .get("ID")
                        .or_else(|| p.get("InstID"))
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                    prop_state: Self::parse_prop_state(state_val),
                    prop_id: p
                        .get("PropID")
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as u32,
                });
            }
        }

        SceneData {
            monsters,
            npcs,
            props,
            teleports: HashMap::new(),
            chests,
            finished_sub_missions: Vec::new(),
            finished_main_missions: Vec::new(),
        }
    }

    fn find_anchor(content: &str, anchor_id: u32) -> Option<(Vector, Vector)> {
        let (_, pos, rot) = Self::find_anchor_info(content, anchor_id)?;
        Some((pos, rot))
    }

    fn find_anchor_info(content: &str, target_id: u32) -> Option<(u32, Vector, Vector)> {
        let val = serde_json::from_str::<serde_json::Value>(content).ok()?;
        let arr = val.get("AnchorList")?.as_array()?;
        for (idx, a) in arr.iter().enumerate() {
            let a_id = a
                .get("ID")
                .or_else(|| a.get("AnchorID"))
                .and_then(|x| x.as_u64())
                .unwrap_or((idx + 1) as u64) as u32;
            let inst_id = a.get("InstID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
            let is_del = a.get("IsDelete").and_then(|x| x.as_bool()).unwrap_or(false);
            if is_del {
                continue;
            }
            if a_id == target_id
                || inst_id == target_id
                || (target_id >= 300_000 && a_id == target_id - 300_000)
                || (arr.len() == 1)
            {
                let pos = Vector {
                    x: Self::to_coord(a.get("PosX").unwrap_or(&serde_json::Value::Null)),
                    y: Self::to_coord(a.get("PosY").unwrap_or(&serde_json::Value::Null)),
                    z: Self::to_coord(a.get("PosZ").unwrap_or(&serde_json::Value::Null)),
                };
                let rot = Vector {
                    x: Self::to_coord(a.get("RotX").unwrap_or(&serde_json::Value::Null)),
                    y: Self::to_coord(a.get("RotY").unwrap_or(&serde_json::Value::Null)),
                    z: Self::to_coord(a.get("RotZ").unwrap_or(&serde_json::Value::Null)),
                };
                return Some((a_id, pos, rot));
            }
        }
        None
    }

    fn find_anchor_for_prop(content: &str, prop_inst_id: u32) -> Option<(u32, Vector, Vector)> {
        let val = serde_json::from_str::<serde_json::Value>(content).ok()?;
        let mut target_anchor_id = 0;
        if let Some(props) = val.get("PropList").and_then(|x| x.as_array()) {
            for p in props {
                let id = p.get("ID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                if id == prop_inst_id {
                    target_anchor_id = p.get("AnchorID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                    break;
                }
            }
        }
        if target_anchor_id == 0 && prop_inst_id >= 300_000 {
            target_anchor_id = prop_inst_id - 300_000;
        }

        let arr = val.get("AnchorList")?.as_array()?;
        for (idx, a) in arr.iter().enumerate() {
            let a_id = a
                .get("ID")
                .or_else(|| a.get("AnchorID"))
                .and_then(|x| x.as_u64())
                .unwrap_or((idx + 1) as u64) as u32;
            let is_del = a.get("IsDelete").and_then(|x| x.as_bool()).unwrap_or(false);
            if is_del {
                continue;
            }
            if a_id == target_anchor_id || target_anchor_id == 0 {
                let pos = Vector {
                    x: Self::to_coord(a.get("PosX").unwrap_or(&serde_json::Value::Null)),
                    y: Self::to_coord(a.get("PosY").unwrap_or(&serde_json::Value::Null)),
                    z: Self::to_coord(a.get("PosZ").unwrap_or(&serde_json::Value::Null)),
                };
                let rot = Vector {
                    x: Self::to_coord(a.get("RotX").unwrap_or(&serde_json::Value::Null)),
                    y: Self::to_coord(a.get("RotY").unwrap_or(&serde_json::Value::Null)),
                    z: Self::to_coord(a.get("RotZ").unwrap_or(&serde_json::Value::Null)),
                };
                return Some((a_id, pos, rot));
            }
        }
        None
    }

    fn read_json_string(path: &Path) -> Option<String> {
        let raw = fs::read_to_string(path).ok()?;
        Some(raw.trim_start_matches('\u{feff}').to_string())
    }

    pub fn compile_from_directory(dir: &Path, out: &Path) -> Result<ResCompileResult> {
        let start = Instant::now();
        let excel_dir = dir.join("ExcelOutput");
        let rf_dir = dir.join("Config").join("LevelOutput").join("RuntimeFloor");

        // ---- 1. MazePlane ----
        let mut maze_planes: HashMap<u32, (u32, u32)> = HashMap::new();
        if let Some(content) = Self::read_json_string(&excel_dir.join("MazePlane.json")) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        let plane_id = item
                            .get("PlaneID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        let world_id = item
                            .get("WorldID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        let plane_type_str = item
                            .get("PlaneType")
                            .and_then(|x| x.as_str())
                            .unwrap_or("");
                        if plane_id > 0 {
                            maze_planes.insert(
                                plane_id,
                                (world_id, Self::parse_plane_type(plane_type_str)),
                            );
                        }
                    }
                }
            }
        }

        // ---- 2. MapEntrance ----
        let mut map_entrances: Vec<MapEntranceRow> = Vec::new();
        if let Some(content) = Self::read_json_string(&excel_dir.join("MapEntrance.json")) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        let id = item
                            .get("ID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        let floor_id = item
                            .get("FloorID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        let plane_id = item
                            .get("PlaneID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        if id == 0 || floor_id == 0 || plane_id == 0 {
                            continue;
                        }
                        let parse_set = |key| {
                            item.get(key)
                                .and_then(|x| x.as_array())
                                .map(|a| {
                                    a.iter()
                                        .filter_map(|v| v.as_u64().map(|n| n as u32))
                                        .collect::<HashSet<_>>()
                                })
                                .unwrap_or_default()
                        };
                        map_entrances.push(MapEntranceRow {
                            id,
                            floor_id,
                            plane_id,
                            start_group_id: item
                                .get("StartGroupID")
                                .and_then(|x| x.as_u64())
                                .unwrap_or(0) as u32,
                            start_anchor_id: item
                                .get("StartAnchorID")
                                .and_then(|x| x.as_u64())
                                .unwrap_or(0) as u32,
                            finish_main: parse_set("FinishMainMissionList"),
                            finish_sub: parse_set("FinishSubMissionList"),
                            begin_main: parse_set("BeginMainMissionList"),
                        });
                    }
                }
            }
        }

        // ---- 2.5. TeleportConfig ----
        let mut teleport_configs_by_floor: HashMap<u32, Vec<(u32, u32, u32)>> = HashMap::new();
        if let Some(content) = Self::read_json_string(&excel_dir.join("TeleportConfig.json")) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        let id = item.get("ID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                        let floor_id = item.get("FloorID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                        let group_id = item.get("GroupID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                        let config_id = item.get("ConfigID").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                        if id > 0 && floor_id > 0 && group_id > 0 {
                            teleport_configs_by_floor.entry(floor_id).or_default().push((id, group_id, config_id));
                        }
                    }
                }
            }
        }

        // ---- 3. AvatarRelicRecommend ----
        let mut relic_avatar_recommend: HashMap<String, Vec<u32>> = HashMap::new();
        if let Some(content) =
            Self::read_json_string(&excel_dir.join("AvatarRelicRecommend.json"))
        {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        let avatar_id = item
                            .get("AvatarID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        let mut set_ids = Vec::new();
                        if let Some(list) = item
                            .get("SetIDList")
                            .or_else(|| item.get("Set2IDList"))
                            .and_then(|x| x.as_array())
                        {
                            for s in list {
                                if let Some(sid) = s.as_u64() {
                                    set_ids.push(sid as u32);
                                }
                            }
                        }
                        if let Some(list) = item.get("Set4IDList").and_then(|x| x.as_array()) {
                            for s in list {
                                if let Some(sid) = s.as_u64() {
                                    set_ids.push(sid as u32);
                                }
                            }
                        }
                        for sid in set_ids {
                            relic_avatar_recommend
                                .entry(sid.to_string())
                                .or_default()
                                .push(avatar_id);
                        }
                    }
                }
            }
        }

        // ---- 4. AvatarConfig ----
        let mut avatar_configs: HashMap<String, AvatarConfig> = HashMap::new();
        if let Some(content) = Self::read_json_string(&excel_dir.join("AvatarConfig.json")) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = val.as_object() {
                    for (k, v) in obj {
                        let w_buff = v
                            .get("WeaknessBuffID")
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0) as u32;
                        let mut t_buffs = Vec::new();
                        if let Some(arr) = v
                            .get("TechniqueBuffIDList")
                            .and_then(|x| x.as_array())
                        {
                            for b in arr {
                                if let Some(bid) = b.as_u64() {
                                    t_buffs.push(bid as u32);
                                }
                            }
                        }
                        avatar_configs.insert(
                            k.clone(),
                            AvatarConfig {
                                weakness_buff_id: w_buff,
                                technique_buff_ids: t_buffs,
                            },
                        );
                    }
                } else if let Some(arr) = val.as_array() {
                    for v in arr {
                        let id = v
                            .get("AvatarID")
                            .or_else(|| v.get("avatarId"))
                            .or_else(|| v.get("ID"))
                            .and_then(|x| x.as_u64())
                            .unwrap_or(0);
                        if id > 0 {
                            let w_buff = v
                                .get("WeaknessBuffID")
                                .and_then(|x| x.as_u64())
                                .unwrap_or(0) as u32;
                            let mut t_buffs = Vec::new();
                            if let Some(arr) = v
                                .get("TechniqueBuffIDList")
                                .and_then(|x| x.as_array())
                            {
                                for b in arr {
                                    if let Some(bid) = b.as_u64() {
                                        t_buffs.push(bid as u32);
                                    }
                                }
                            }
                            avatar_configs.insert(
                                id.to_string(),
                                AvatarConfig {
                                    weakness_buff_id: w_buff,
                                    technique_buff_ids: t_buffs,
                                },
                            );
                        }
                    }
                }
            }
        }

        // ---- 5. Group entrances by floor key ----
        let mut entrances_by_floor: HashMap<String, Vec<usize>> = HashMap::new();
        for (idx, row) in map_entrances.iter().enumerate() {
            let fk = format!("P{}_F{}", row.plane_id, row.floor_id);
            entrances_by_floor.entry(fk).or_default().push(idx);
        }

        // ---- 6. Per-floor: load RuntimeFloor, parse groups, build output ----
        let mut level_output_configs: HashMap<String, HashMap<String, LevelOutputConfig>> = HashMap::new();
        let mut map_default_entrance_map: HashMap<String, u32> = HashMap::new();
        let mut group_cache: HashMap<String, SceneData> = HashMap::new();
        let mut total_groups: usize = 0;

        for (floor_key, entrance_indices) in &entrances_by_floor {
            let rf_path = rf_dir.join(format!("{floor_key}.json"));

            let mut group_refs: HashMap<u32, (GroupInstanceRef, Option<serde_json::Value>)> = HashMap::new();

            if let Some(content) = Self::read_json_string(&rf_path) {
                if let Ok(rf) = serde_json::from_str::<RuntimeFloor>(&content) {
                    for ginst in &rf.group_instance_list {
                        if ginst.is_delete {
                            continue;
                        }
                        let meta_val = rf
                            .group_instance_common_map
                            .get(&ginst.id.to_string())
                            .cloned();
                        group_refs.insert(ginst.id, (ginst.clone(), meta_val));
                    }
                }
            }

            // Pre-parse all Server-side non-Mission groups (shared across entrances)
            let mut floor_groups: HashMap<u32, (SceneData, GroupCommonMeta)> = HashMap::new();
            for (&gid, (ginst, maybe_meta_val)) in &group_refs {
                let full_path = dir.join(&ginst.group_path);
                let group_content = Self::read_json_string(&full_path);

                let meta: GroupCommonMeta = if let Some(v) = maybe_meta_val {
                    serde_json::from_value::<GroupCommonMeta>(v.clone()).unwrap_or_default()
                } else if let Some(ref gc) = group_content {
                    serde_json::from_str::<GroupCommonMeta>(gc).unwrap_or_default()
                } else {
                    continue;
                };

                if meta.load_side != "Server" || meta.category == "Mission" {
                    continue;
                }

                let scene_data = if let Some(cached) = group_cache.get(&ginst.group_path) {
                    cached.clone()
                } else {
                    match group_content {
                        Some(content) => {
                            let parsed = Self::parse_level_group(&content, gid);
                            group_cache.insert(ginst.group_path.clone(), parsed.clone());
                            parsed
                        }
                        None => continue,
                    }
                };

                floor_groups.insert(gid, (scene_data, meta));
            }

            // Build teleports per group for this floor
            let mut group_teleports: HashMap<u32, HashMap<String, TeleportInfo>> = HashMap::new();

            // 1. From TeleportConfig.json (Floor level teleport props / waypoints)
            let floor_id = entrances_by_floor[floor_key].first().map(|&idx| map_entrances[idx].floor_id).unwrap_or(0);
            if let Some(tcs) = teleport_configs_by_floor.get(&floor_id) {
                for &(tp_id, group_id, config_id) in tcs {
                    if let Some((ginst, _)) = group_refs.get(&group_id) {
                        let full_path = dir.join(&ginst.group_path);
                        if let Some(content) = Self::read_json_string(&full_path) {
                            if let Some((anchor_id, pos, rot)) = Self::find_anchor_for_prop(&content, config_id) {
                                group_teleports.entry(group_id).or_default().insert(
                                    tp_id.to_string(),
                                    TeleportInfo {
                                        pos,
                                        rot,
                                        anchor_id: Some(anchor_id),
                                        group_id: Some(group_id),
                                        inst_id: Some(config_id),
                                    },
                                );
                            }
                        }
                    }
                }
            }

            // 2. From MapEntrance.json (Entrance spawn points)
            for &idx in entrance_indices {
                let row = &map_entrances[idx];
                if row.start_group_id == 0 && row.start_anchor_id == 0 { continue; }
                let Some((ginst, _)) = group_refs.get(&row.start_group_id) else { continue; };
                let full_path = dir.join(&ginst.group_path);
                let Some(content) = Self::read_json_string(&full_path) else { continue; };
                if let Some((anchor_id, pos, rot)) = Self::find_anchor_info(&content, row.start_anchor_id) {
                    group_teleports.entry(row.start_group_id).or_default().insert(
                        row.id.to_string(),
                        TeleportInfo {
                            pos,
                            rot,
                            anchor_id: Some(anchor_id),
                            group_id: Some(row.start_group_id),
                            inst_id: Some(300_000 + anchor_id),
                        },
                    );
                }
            }

            // Build per-entrance scene configs (filter by UnloadCondition)
            for &idx in entrance_indices {
                let row = &map_entrances[idx];
                let entrance_key = row.id.to_string();

                let mut scenes: HashMap<String, SceneData> = HashMap::new();
                for (&gid, (scene_data, meta)) in &floor_groups {
                    if Self::is_unload_triggered(&meta.unload_condition, row) { continue; }
                    if scene_data.is_empty() && scene_data.chests.is_empty() && !group_teleports.contains_key(&gid) { continue; }

                    let mut cloned_scene = scene_data.clone();

                    // Extract Missions from Load/Unload conditions
                    let mut main_missions = Vec::new();
                    let mut sub_missions = Vec::new();
                    let mut check_cond = |block: &Option<ConditionBlock>| {
                        if let Some(b) = block {
                            for c in &b.conditions {
                                if c.cond_type == "MainMission" { main_missions.push(c.id); }
                                if c.cond_type == "SubMission" { sub_missions.push(c.id); }
                            }
                        }
                    };
                    check_cond(&meta.load_condition);
                    check_cond(&meta.unload_condition);
                    
                    main_missions.sort(); main_missions.dedup();
                    sub_missions.sort(); sub_missions.dedup();
                    
                    cloned_scene.finished_main_missions = main_missions;
                    cloned_scene.finished_sub_missions = sub_missions;

                    if let Some(tps) = group_teleports.get(&gid) {
                        cloned_scene.teleports = tps.clone();
                    }

                    scenes.insert(gid.to_string(), cloned_scene);
                }

                total_groups += scenes.len();

                let (world_id, plane_type) =
                    maze_planes.get(&row.plane_id).copied().unwrap_or((0, 0));

                let start_anchor_id = if row.start_anchor_id > 0 { Some(row.start_anchor_id) } else { None };
                let start_group_id = if row.start_group_id > 0 { Some(row.start_group_id) } else { None };
                let is_entered_scene_info = false;

                let mut floor_map = HashMap::new();
                floor_map.insert(
                    floor_key.clone(),
                    LevelOutputConfig {
                        is_entered_scene_info,
                        scenes,
                        plane_type,
                        world_id,
                        start_anchor_id,
                        start_group_id,
                        sections: vec![0],
                        saved_values: HashMap::new(),
                    },
                );
                level_output_configs.insert(entrance_key, floor_map);

                // mapDefaultEntranceMap: only register default main floor entrances
                if row.id % 100 == 1 || (row.id >= 1000001 && row.id <= 1000003) {
                    map_default_entrance_map
                        .entry(row.floor_id.to_string())
                        .or_insert(row.id);
                }
            }
        }

        // If a base res.json exists (e.g. RobinSR full base or existing res.json),
        // preserve complete floor scenes for any floors not present in the partial dump folder
        let mut base_candidates = vec![
            PathBuf::from("bin/res.json"),
            PathBuf::from("crates/robinsr_engine/res.json"),
            out.to_path_buf(),
        ];
        if let Ok(home) = std::env::var("USERPROFILE") {
            base_candidates.push(PathBuf::from(&home).join("Downloads").join("robinsr").join("res.json"));
            base_candidates.push(PathBuf::from(&home).join("Downloads").join("res.json"));
        }
        for base_path in &base_candidates {
            if base_path.exists() && base_path != out {
                if let Some(content) = Self::read_json_string(base_path) {
                    if let Ok(base_res) = serde_json::from_str::<ResJson>(&content) {
                        for (ent_id, floors) in base_res.level_output_configs {
                            let entry = level_output_configs.entry(ent_id).or_default();
                            for (fk, floor) in floors {
                                let should_insert = match entry.get(&fk) {
                                    Some(existing_floor) => existing_floor.scenes.is_empty() && !floor.scenes.is_empty(),
                                    None => true,
                                };
                                if should_insert {
                                    total_groups += floor.scenes.len();
                                    entry.insert(fk, floor);
                                }
                            }
                        }
                        for (fid, eid) in base_res.map_default_entrance_map {
                            map_default_entrance_map.entry(fid).or_insert(eid);
                        }
                        break;
                    }
                }
            }
        }

        let total_entrances = level_output_configs.len();
        let total_avatars = avatar_configs.len();

        let result = ResJson {
            level_output_configs,
            avatar_configs,
            map_default_entrance_map,
            relic_avatar_recommend,
        };

        if let Some(parent) = out.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let json_str = serde_json::to_string(&result)?;
        fs::write(out, json_str)?;

        let metadata = fs::metadata(out)?;
        let file_size_mb = metadata.len() as f64 / (1024.0 * 1024.0);
        let elapsed = start.elapsed().as_secs_f64();

        // Auto-sync to bin/res.json if out is res.json
        let _ = fs::copy(out, "bin/res.json");
        let _ = fs::copy(out, "crates/robinsr_engine/res.json");

        Ok(ResCompileResult {
            success: true,
            file_size_mb,
            total_entrances,
            total_avatars,
            total_groups,
            scene_groups_count: total_groups,
            avatars_count: total_avatars,
            map_entrances_count: total_entrances,
            time_seconds: (elapsed * 100.0).round() / 100.0,
            output_file: out.to_string_lossy().to_string(),
            message: format!(
                "Compiled res.json ({file_size_mb:.2} MB) with {total_entrances} entrances, {total_avatars} avatars, {total_groups} scene groups in {elapsed:.2}s"
            ),
        })
    }
}