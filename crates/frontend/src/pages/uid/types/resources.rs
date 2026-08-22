use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct PropVal {
    #[serde(rename = "type")]
    pub property: String,
    pub value: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BaseStep {
    pub base: f64,
    #[serde(default)]
    pub step: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PromotionStats {
    pub hp: BaseStep,
    pub atk: BaseStep,
    pub def: BaseStep,
    pub spd: BaseStep,
    pub crit_rate: BaseStep,
    pub crit_dmg: BaseStep,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AvatarRank {
    pub id: u32,
    #[serde(default)]
    pub rank: u32,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub skill_add_level_map: HashMap<String, u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AvatarSkill {
    pub id: u32,
    #[serde(default)]
    pub max_level: u32,
    #[serde(default, rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub type_text: i64,
    #[serde(default)]
    pub name: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SkillTree {
    pub id: u32,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub max_level: u32,
    #[serde(default)]
    pub anchor: String,
    #[serde(default)]
    pub level_up_skills: Vec<u32>,
    #[serde(default)]
    pub status_add_list: Vec<PropVal>,
    #[serde(default)]
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Avatar {
    pub id: u32,
    #[serde(default)]
    pub rarity: u32,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub element: String,
    #[serde(default)]
    pub max_sp: Option<f64>,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub preview: String,
    #[serde(default)]
    pub portrait: String,
    #[serde(default)]
    pub ranks: HashMap<String, AvatarRank>,
    #[serde(default)]
    pub ranks_enhanced: HashMap<String, AvatarRank>,
    #[serde(default)]
    pub skills: HashMap<String, AvatarSkill>,
    #[serde(default)]
    pub skills_enhanced: HashMap<String, AvatarSkill>,
    #[serde(default)]
    pub skill_trees: HashMap<String, SkillTree>,
    #[serde(default)]
    pub skill_trees_enhanced: HashMap<String, SkillTree>,
    pub promotions: HashMap<String, PromotionStats>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RelicRes {
    pub id: u32,
    pub set_id: u32,
    pub rarity: u32,
    #[serde(default, rename = "type")]
    pub slot: String,
    #[serde(default)]
    pub max_level: u32,
    pub main_affix_id: u32,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MainAffix {
    pub affix_id: u32,
    pub property: String,
    pub base: f64,
    pub step: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MainAffixGroup {
    pub id: u32,
    #[serde(default)]
    pub affixes: HashMap<String, MainAffix>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SubAffixRes {
    pub affix_id: u32,
    pub property: String,
    pub base: f64,
    pub step: f64,
    #[serde(default)]
    pub step_num: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SubAffixGroup {
    pub id: u32,
    #[serde(default)]
    pub affixes: HashMap<String, SubAffixRes>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetBonus {
    #[serde(default)]
    pub desc: i64,
    #[serde(default)]
    pub properties: Vec<PropVal>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RelicSet {
    pub id: u32,
    #[serde(default)]
    pub set_bonus: HashMap<String, SetBonus>,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LcPromotionStats {
    pub hp: BaseStep,
    pub atk: BaseStep,
    pub def: BaseStep,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LcPromotion {
    #[serde(default)]
    pub values: Vec<LcPromotionStats>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LcRank {
    #[serde(default)]
    pub properties: Vec<Vec<PropVal>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Lightcone {
    pub id: u32,
    #[serde(default)]
    pub rarity: u32,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub preview: String,
    pub promotion: LcPromotion,
    pub rank: LcRank,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StatProperty {
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub name_skill_tree: Option<i64>,
    #[serde(default)]
    pub icon_name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PathRes {
    pub id: String,
    #[serde(default)]
    pub text: Option<i64>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ElementRes {
    pub id: String,
    #[serde(default)]
    pub name: i64,
    #[serde(default)]
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Metadata {
    #[serde(rename = "CurrentVersion")]
    pub current_version: String,
}

pub struct ResourceDb {
    pub version: String,
    pub avatars: HashMap<String, Avatar>,
    pub relics: HashMap<String, RelicRes>,
    pub relic_sets: HashMap<String, RelicSet>,
    pub relic_main_affixes: HashMap<String, MainAffixGroup>,
    pub relic_sub_affixes: HashMap<String, SubAffixGroup>,
    pub lightcones: HashMap<String, Lightcone>,
    pub stat_properties: HashMap<String, StatProperty>,
    pub paths: HashMap<String, PathRes>,
    pub elements: HashMap<String, ElementRes>,
    pub textmaps: HashMap<String, HashMap<String, String>>,
}
