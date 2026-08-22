use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

mod overrides;

#[derive(Debug, Clone, Deserialize)]
pub struct MainRec {
    pub p: String,
    pub pct: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct CharRecommend {
    #[serde(default)]
    pub body: Vec<MainRec>,
    #[serde(default)]
    pub sphere: Vec<MainRec>,
    #[serde(default)]
    pub rope: Vec<MainRec>,
    #[serde(default)]
    pub foot: Vec<MainRec>,
}

const BUNDLED: &str = include_str!("relic_recommend.json");
const MAIN_THRESHOLD: u32 = 200;

static STORE: LazyLock<HashMap<String, CharRecommend>> =
    LazyLock::new(|| serde_json::from_str(BUNDLED).unwrap_or_default());

fn recommend_key(avatar_id: u32) -> u32 {
    match avatar_id {
        8002 | 8004 | 8006 | 8008 | 8010 => avatar_id - 1,
        _ => avatar_id,
    }
}

pub fn weights(avatar_id: u32) -> HashMap<&'static str, f32> {
    let mut w: HashMap<&'static str, f32> = HashMap::new();

    if let Some(rec) = STORE.get(&recommend_key(avatar_id).to_string()) {
        let mains: HashSet<&str> = [&rec.body, &rec.sphere, &rec.rope, &rec.foot]
            .into_iter()
            .flatten()
            .filter(|m| m.pct >= MAIN_THRESHOLD)
            .map(|m| m.p.as_str())
            .collect();

        if mains.contains("CriticalChanceBase") || mains.contains("CriticalDamageBase") {
            w.insert("CriticalChanceBase", 1.0);
            w.insert("CriticalDamageBase", 1.0);
        }
        for m in &mains {
            match *m {
                "SpeedDelta" => {
                    w.insert("SpeedDelta", 1.0);
                }
                "AttackAddedRatio" => {
                    w.insert("AttackAddedRatio", 1.0);
                    w.entry("AttackDelta").or_insert(0.5);
                }
                "HPAddedRatio" | "HealRatioBase" => {
                    w.insert("HPAddedRatio", 1.0);
                    w.entry("HPDelta").or_insert(0.5);
                }
                "DefenceAddedRatio" => {
                    w.insert("DefenceAddedRatio", 1.0);
                    w.entry("DefenceDelta").or_insert(0.5);
                }
                "BreakDamageAddedRatioBase" => {
                    w.insert("BreakDamageAddedRatioBase", 1.0);
                }
                "StatusProbabilityBase" => {
                    w.insert("StatusProbabilityBase", 1.0);
                }
                _ => {}
            }
        }
    }

    overrides::apply(avatar_id, &mut w);
    w
}
