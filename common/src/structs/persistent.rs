use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::{
    avatar::MultiPathAvatar,
    battle::BattleConfig,
    scene::{Position, Scene},
};

// #[derive(Serialize, Deserialize, Clone, Debug, Copy, PartialEq, Eq, Default)]
// #[repr(u32)]
// pub enum AllowedLanguages {
//     #[default]
//     En,
//     Jp,
//     Kr,
//     Cn,
// }

// impl FromStr for AllowedLanguages {
//     type Err = ();

//     fn from_str(input: &str) -> Result<AllowedLanguages, Self::Err> {
//         match input {
//             "en" => Ok(AllowedLanguages::En),
//             "kr" => Ok(AllowedLanguages::Kr),
//             "jp" => Ok(AllowedLanguages::Jp),
//             "cn" => Ok(AllowedLanguages::Cn),
//             _ => Ok(AllowedLanguages::En),
//         }
//     }
// }

#[derive(Debug, Serialize, Deserialize)]
pub struct Persistent {
    #[serde(default)]
    pub lineups: BTreeMap<u32, u32>,
    #[serde(default)]
    pub challenge_progress: BTreeMap<u32, BTreeMap<u32, ChallengeProgress>>,
    #[serde(default)]
    pub challenge_origin_scene: Option<Scene>,
    #[serde(default)]
    pub challenge_origin_position: Option<Position>,
    #[serde(default)]
    pub challenge_origin_lineups: Option<BTreeMap<u32, u32>>,
    #[serde(default)]
    pub challenge_origin_battle_config: Option<BattleConfig>,
    #[serde(default)]
    pub challenge_active_battle_config: Option<BattleConfig>,
    #[serde(default)]
    pub position: Position,
    #[serde(default)]
    pub scene: Scene,
    pub main_character: MultiPathAvatar,
    pub march_type: MultiPathAvatar,
    // pub game_language: AllowedLanguages,
    // pub voice_language: AllowedLanguages,
    #[serde(default = "default_true")]
    pub enable_sw_global: Option<bool>,
    #[serde(default = "default_true")]
    pub enable_castorice_global: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChallengeProgress {
    pub stage_id: u32,
    pub star: u32,
    #[serde(default)]
    pub group_id: u32,
}

fn default_true() -> Option<bool> {
    Some(true)
}

impl Default for Persistent {
    fn default() -> Self {
        Self {
            lineups: BTreeMap::from([(0, 1313), (1, 1006), (2, 8001), (3, 1405)]),
            challenge_progress: BTreeMap::new(),
            challenge_origin_scene: None,
            challenge_origin_position: None,
            challenge_origin_lineups: None,
            challenge_origin_battle_config: None,
            challenge_active_battle_config: None,
            position: Default::default(),
            main_character: MultiPathAvatar::FemaleRemembrance,
            scene: Default::default(),
            march_type: MultiPathAvatar::MarchHunt,
            // game_language: AllowedLanguages::En,
            // voice_language: AllowedLanguages::Jp,
            enable_sw_global: Some(true),
            enable_castorice_global: Some(true),
        }
    }
}
