use serde::Deserialize;
use std::{collections::HashMap, fs, sync::LazyLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vector {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Deserialize, Copy, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
#[repr(u32)]
pub enum PropState {
    Closed = 0,
    Open = 1,
    Locked = 2,
    BridgeState1 = 3,
    BridgeState2 = 4,
    BridgeState3 = 5,
    BridgeState4 = 6,
    CheckPointDisable = 7,
    CheckPointEnable = 8,
    TriggerDisable = 9,
    TriggerEnable = 10,
    ChestLocked = 11,
    ChestClosed = 12,
    ChestUsed = 13,
    Elevator1 = 14,
    Elevator2 = 15,
    Elevator3 = 16,
    WaitActive = 17,
    EventClose = 18,
    EventOpen = 19,
    Hidden = 20,
    TeleportGate0 = 21,
    TeleportGate1 = 22,
    TeleportGate2 = 23,
    TeleportGate3 = 24,
    Destructed = 25,
    CustomState01 = 101,
    CustomState02 = 102,
    CustomState03 = 103,
    CustomState04 = 104,
    CustomState05 = 105,
    CustomState06 = 106,
    CustomState07 = 107,
    CustomState08 = 108,
    CustomState09 = 109,
}

#[derive(Deserialize, Copy, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
#[repr(u32)]
pub enum PlaneType {
    Unknown = 0,
    Maze = 2,
    Train = 3,
    Challenge = 4,
    Rogue = 5,
    Raid = 6,
    AetherDivide = 7,
    TrialActivity = 8,
    Town = 1,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneMonsterInfo {
    pub pos: Vector,
    pub rot: Vector,
    pub group_id: u32,
    pub inst_id: u32,
    pub monster_id: u32,
    pub event_id: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneNpcInfo {
    pub pos: Vector,
    pub rot: Vector,
    pub group_id: u32,
    pub inst_id: u32,
    pub npc_id: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenePropInfo {
    pub pos: Vector,
    pub rot: Vector,
    pub group_id: u32,
    pub inst_id: u32,
    pub prop_state: u32,
    pub prop_id: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeleportInfo {
    pub pos: Vector,
    pub rot: Vector,
    // pub group_id: u32,
    // pub inst_id: u32,
    // pub anchor_id: u32,
}

#[derive(Deserialize)]
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LevelOutputConfig {
    pub is_entered_scene_info: bool,
    pub scenes: HashMap<u32, SceneData>,
    pub plane_type: u32,
    pub world_id: u32,
    pub sections: Vec<u32>,
    #[serde(default, deserialize_with = "deserialize_saved_values")]
    pub saved_values: HashMap<String, i32>,
}

fn deserialize_saved_values<'de, D>(deserializer: D) -> Result<HashMap<String, i32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let values = HashMap::<String, Option<i32>>::deserialize(deserializer)?;
    Ok(values
        .into_iter()
        .filter_map(|(key, value)| value.map(|value| (key, value)))
        .collect())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvatarConfig {
    pub weakness_buff_id: u32,
    // pub technique_buff_ids: Vec<u32>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct JsonConfig {
    /// `entryid` -> `P[planeId]_F[floorId]` -> `groupId`
    pub level_output_configs: HashMap<u32, HashMap<String, LevelOutputConfig>>,
    pub avatar_configs: HashMap<u32, AvatarConfig>,
    pub map_default_entrance_map: HashMap<u32, u32>,
    pub relic_avatar_recommend: HashMap<u32, Vec<u32>>,
}

#[derive(Deserialize)]
struct MapEntranceDocument {
    #[serde(rename = "map_entrance_config")]
    entries: Vec<MapEntranceInfo>,
}

#[derive(Deserialize)]
pub struct MapEntranceInfo {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "EntranceType")]
    pub entrance_type: String,
    #[serde(rename = "PlaneID")]
    pub plane_id: u32,
    #[serde(rename = "FloorID")]
    pub floor_id: u32,
}

#[derive(Deserialize)]
struct MazePlaneDocument {
    #[serde(rename = "maze_plane_config")]
    planes: Vec<MazePlaneInfo>,
}

#[derive(Deserialize)]
pub struct MazePlaneInfo {
    #[serde(rename = "PlaneID")]
    pub plane_id: u32,
    #[serde(rename = "PlaneType")]
    pub plane_type: String,
    #[serde(rename = "WorldID")]
    pub world_id: u32,
    #[serde(rename = "StartFloorID")]
    pub start_floor_id: u32,
    #[serde(rename = "FloorIDList")]
    pub floor_id_list: Vec<u32>,
}

pub static MAP_ENTRANCE_CONFIG: LazyLock<HashMap<u32, MapEntranceInfo>> = LazyLock::new(|| {
    fs::read_to_string("resources/MapEntrance.json")
        .ok()
        .and_then(|text| serde_json::from_str::<MapEntranceDocument>(&text).ok())
        .map(|document| {
            document
                .entries
                .into_iter()
                .map(|entry| (entry.id, entry))
                .collect()
        })
        .unwrap_or_default()
});

pub static MAZE_PLANE_CONFIG: LazyLock<HashMap<u32, MazePlaneInfo>> = LazyLock::new(|| {
    fs::read_to_string("resources/MazePlane.json")
        .ok()
        .and_then(|text| serde_json::from_str::<MazePlaneDocument>(&text).ok())
        .map(|document| {
            document
                .planes
                .into_iter()
                .map(|plane| (plane.plane_id, plane))
                .collect()
        })
        .unwrap_or_default()
});

#[derive(Deserialize)]
pub struct EndgameChallengeConfig {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "GroupID")]
    pub group_id: u32,
    #[serde(rename = "MapEntranceID")]
    pub map_entrance_id: u32,
    #[serde(rename = "MapEntranceID2")]
    pub map_entrance_id2: u32,
    #[serde(rename = "MazeGroupID1")]
    pub maze_group_id1: u32,
    #[serde(rename = "MazeGroupID2", default)]
    pub maze_group_id2: Option<u32>,
    #[serde(rename = "NpcMonsterIDList1")]
    pub npc_monster_id_list1: Vec<u32>,
    #[serde(rename = "NpcMonsterIDList2", default)]
    pub npc_monster_id_list2: Vec<u32>,
    #[serde(rename = "EventIDList1")]
    pub event_id_list1: Vec<u32>,
    #[serde(rename = "EventIDList2", default)]
    pub event_id_list2: Vec<u32>,
    #[serde(rename = "MazeBuffID")]
    pub maze_buff_id: u32,
}

#[derive(Deserialize)]
pub struct EndgameTierceChallengeConfig {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "PreChallengeMazeID")]
    pub pre_challenge_maze_id: u32,
    #[serde(rename = "MapEntranceID")]
    pub map_entrance_id: u32,
    #[serde(rename = "MazeGroupID")]
    pub maze_group_id: u32,
    #[serde(rename = "NpcMonsterIDList")]
    pub npc_monster_id_list: Vec<u32>,
    #[serde(rename = "EventIDList")]
    pub event_id_list: Vec<u32>,
}

#[derive(Deserialize)]
struct EndgameTierceChallengeDocument {
    challenge_tierce_config: Vec<EndgameTierceChallengeConfig>,
}

#[derive(Deserialize)]
struct EndgameChallengeDocument {
    challenge_config: Vec<EndgameChallengeConfig>,
}

#[derive(Deserialize)]
pub struct EndgameStageConfig {
    #[serde(rename = "Level")]
    pub level: u32,
    #[serde(rename = "StageID")]
    pub stage_id: u32,
    #[serde(rename = "MonsterList")]
    pub monster_list: Vec<Vec<u32>>,
}

#[derive(Deserialize)]
struct EndgameStageDocument {
    stage_config: Vec<EndgameStageConfig>,
}

pub struct EndgameNode<'a> {
    pub challenge: &'a EndgameChallengeConfig,
    pub stage: &'a EndgameStageConfig,
    pub entry_id: u32,
    pub group_id: u32,
    pub event_id: u32,
    pub monster_id: u32,
    pub node: u32,
}

pub struct EndgameTierceNode<'a> {
    pub challenge: &'a EndgameTierceChallengeConfig,
    pub stage: &'a EndgameStageConfig,
    pub entry_id: u32,
    pub group_id: u32,
    pub event_id: u32,
    pub monster_id: u32,
}

pub static ENDGAME_CHALLENGE_CONFIG: LazyLock<HashMap<u32, EndgameChallengeConfig>> =
    LazyLock::new(|| {
        fs::read_to_string("resources/ChallengeMazeConfig.json")
            .ok()
            .and_then(|text| serde_json::from_str::<EndgameChallengeDocument>(&text).ok())
            .map(|document| {
                document
                    .challenge_config
                    .into_iter()
                    .map(|challenge| (challenge.id, challenge))
                    .collect()
            })
            .unwrap_or_default()
    });

pub static ENDGAME_TIERCE_CHALLENGE_CONFIG: LazyLock<HashMap<u32, EndgameTierceChallengeConfig>> =
    LazyLock::new(|| {
        fs::read_to_string("resources/ChallengeMazeTierceConfig.json")
            .ok()
            .and_then(|text| serde_json::from_str::<EndgameTierceChallengeDocument>(&text).ok())
            .map(|document| {
                document
                    .challenge_tierce_config
                    .into_iter()
                    .map(|challenge| (challenge.id, challenge))
                    .collect()
            })
            .unwrap_or_default()
    });

pub static ENDGAME_STAGE_CONFIG: LazyLock<HashMap<u32, EndgameStageConfig>> = LazyLock::new(|| {
    fs::read_to_string("resources/StageConfig.json")
        .ok()
        .and_then(|text| serde_json::from_str::<EndgameStageDocument>(&text).ok())
        .map(|document| {
            document
                .stage_config
                .into_iter()
                .map(|stage| (stage.stage_id, stage))
                .collect()
        })
        .unwrap_or_default()
});

#[derive(Deserialize)]
struct EndgameSceneDocument {
    #[serde(rename = "levelOutputConfigs")]
    level_output_configs: HashMap<u32, HashMap<String, LevelOutputConfig>>,
}

pub static ENDGAME_SCENE_CONFIG: LazyLock<HashMap<u32, HashMap<String, LevelOutputConfig>>> =
    LazyLock::new(|| {
        fs::read_to_string("resources/EndgameSceneFallback.json")
            .ok()
            .and_then(|text| serde_json::from_str::<EndgameSceneDocument>(&text).ok())
            .map(|document| document.level_output_configs)
            .unwrap_or_default()
    });

pub fn resolve_endgame_node(challenge_id: u32, node: u32) -> Option<EndgameNode<'static>> {
    let challenge = ENDGAME_CHALLENGE_CONFIG.get(&challenge_id)?;
    let (entry_id, group_id, monster_ids, event_ids) = match node {
        1 => (
            challenge.map_entrance_id,
            challenge.maze_group_id1,
            &challenge.npc_monster_id_list1,
            &challenge.event_id_list1,
        ),
        2 => (
            challenge.map_entrance_id2,
            challenge.maze_group_id2?,
            &challenge.npc_monster_id_list2,
            &challenge.event_id_list2,
        ),
        _ => return None,
    };
    let event_id = *event_ids.last()?;
    let monster_id = *monster_ids.last()?;
    let stage = ENDGAME_STAGE_CONFIG.get(&event_id)?;

    Some(EndgameNode {
        challenge,
        stage,
        entry_id,
        group_id,
        event_id,
        monster_id,
        node,
    })
}

pub fn resolve_endgame_tierce_node(challenge_id: u32) -> Option<EndgameTierceNode<'static>> {
    let challenge = ENDGAME_TIERCE_CHALLENGE_CONFIG.get(&challenge_id)?;
    let event_id = *challenge.event_id_list.last()?;
    let monster_id = *challenge.npc_monster_id_list.last()?;
    let stage = ENDGAME_STAGE_CONFIG.get(&event_id)?;

    Some(EndgameTierceNode {
        challenge,
        stage,
        entry_id: challenge.map_entrance_id,
        group_id: challenge.maze_group_id,
        event_id,
        monster_id,
    })
}

pub static GAME_RES: LazyLock<JsonConfig> = LazyLock::new(|| {
    serde_json::from_str::<JsonConfig>(&fs::read_to_string("res.json").unwrap()).unwrap()
});
