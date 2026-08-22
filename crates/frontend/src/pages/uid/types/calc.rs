use std::collections::HashMap;

pub type StatMap = HashMap<String, f64>;

#[derive(Debug, Clone, serde::Serialize)]
pub struct StatLine {
    pub property: String,
    pub name: String,
    pub icon: String,
    pub base: f64,
    pub added: f64,
    pub total: f64,
    pub breakdown: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SkillLine {
    pub label: String,
    pub level: u32,
    pub plus: u32,
    pub max: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LightconePanel {
    pub item_id: u32,
    pub name: String,
    pub icon: String,
    pub level: u32,
    pub rank: u32,
    pub rarity: u32,
    pub path_match: bool,
    pub hp: f64,
    pub atk: f64,
    pub def: f64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SubLine {
    pub property: String,
    pub name: String,
    pub icon: String,
    pub value: f64,
    pub count: u32,
    pub step: u32,
    pub quality: f64,
    pub weight: f64,
    pub effective: bool,
    pub eff_count: f64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RelicPanel {
    pub slot: u32,
    pub slot_type: String,
    pub slot_icon: String,
    pub tid: u32,
    pub icon: String,
    pub set_id: u32,
    pub set_name: String,
    pub level: u32,
    pub rarity: u32,
    pub main_property: String,
    pub main_name: String,
    pub main_icon: String,
    pub main_value: f64,
    pub subs: Vec<SubLine>,
    pub score: f64,
    pub grade: &'static str,
    pub effective_count: f64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SetBonusLine {
    pub set_id: u32,
    pub count: u32,
    pub name: String,
    pub icon: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AvatarPanel {
    pub avatar_id: u32,
    pub name: String,
    pub icon: String,
    pub level: u32,
    pub max_level: u32,
    pub promotion: u32,
    pub eidolon: u32,
    pub rarity: u32,
    pub path_id: String,
    pub path_name: String,
    pub path_icon: String,
    pub element_id: String,
    pub element_name: String,
    pub element_icon: String,
    pub stats: Vec<StatLine>,
    pub skills: Vec<SkillLine>,
    pub lightcone: Option<LightconePanel>,
    pub relics: Vec<RelicPanel>,
    pub set_bonuses: Vec<SetBonusLine>,
    pub sub_totals: Vec<SubLine>,
    pub total_score: f64,
    pub total_effective: f64,
    pub scored: bool,
}
