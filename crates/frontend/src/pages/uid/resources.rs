use anyhow::{Context as _, Result};
use std::collections::HashMap;

pub use super::types::resources::*;

pub const ASSET_BASE_URL: &str = "https://cdn.neonteam.dev/neonteam";
pub const SITE_ICON_BASE_URL: &str = "https://srtools.neonteam.dev/icons";

const MAX_BODY: u64 = 64 * 1024 * 1024;
const RESOURCE_FILES: [&str; 10] = [
    "avatars.json",
    "relics.json",
    "relic-sets.json",
    "relic-main-affixes.json",
    "relic-sub-affixes.json",
    "lightcones.json",
    "stat-properties.json",
    "paths.json",
    "elements.json",
    "textmaps.json",
];

impl Avatar {
    pub fn skill_trees_for(&self, enhanced: bool) -> &HashMap<String, SkillTree> {
        if enhanced && !self.skill_trees_enhanced.is_empty() {
            &self.skill_trees_enhanced
        } else {
            &self.skill_trees
        }
    }

    pub fn ranks_for(&self, enhanced: bool) -> &HashMap<String, AvatarRank> {
        if enhanced && !self.ranks_enhanced.is_empty() {
            &self.ranks_enhanced
        } else {
            &self.ranks
        }
    }

    pub fn skills_for(&self, enhanced: bool) -> &HashMap<String, AvatarSkill> {
        if enhanced && !self.skills_enhanced.is_empty() {
            &self.skills_enhanced
        } else {
            &self.skills
        }
    }
}

fn agent() -> &'static ureq::Agent {
    static AGENT: std::sync::LazyLock<ureq::Agent> = std::sync::LazyLock::new(|| {
        let cfg = ureq::Agent::config_builder()
            .user_agent("hsr-owner-uid/0.1")
            .timeout_global(Some(std::time::Duration::from_secs(60)))
            .timeout_connect(Some(std::time::Duration::from_secs(10)))
            .build();
        ureq::Agent::new_with_config(cfg)
    });
    &AGENT
}

fn http_get_string(url: &str) -> Result<String> {
    agent()
        .get(url)
        .call()
        .with_context(|| format!("GET {url}"))?
        .into_body()
        .into_with_config()
        .limit(MAX_BODY)
        .read_to_string()
        .with_context(|| format!("read body of {url}"))
}

pub fn http_get_bytes(url: &str) -> Result<Vec<u8>> {
    agent()
        .get(url)
        .call()
        .with_context(|| format!("GET {url}"))?
        .into_body()
        .into_with_config()
        .limit(MAX_BODY)
        .read_to_vec()
        .with_context(|| format!("read body of {url}"))
}

impl ResourceDb {
    pub fn fetch_online(progress: &dyn Fn(String)) -> Result<Self> {
        progress("Metadata.json".into());
        let version = serde_json::from_str::<Metadata>(&http_get_string(&format!(
            "{ASSET_BASE_URL}/Metadata.json"
        ))?)
        .context("parse Metadata.json")?
        .current_version;

        let mut texts: HashMap<&str, String> = HashMap::new();
        for file in RESOURCE_FILES {
            progress(format!("{version}/{file}"));
            texts.insert(
                file,
                http_get_string(&format!("{ASSET_BASE_URL}/{version}/{file}"))?,
            );
        }

        progress("parsing".into());
        Self::from_texts(version, &texts)
    }

    fn from_texts(version: String, texts: &HashMap<&str, String>) -> Result<Self> {
        fn parse<T: serde::de::DeserializeOwned>(
            texts: &HashMap<&str, String>,
            file: &str,
        ) -> Result<T> {
            serde_json::from_str(texts.get(file).map(String::as_str).unwrap_or_default())
                .with_context(|| format!("parse {file}"))
        }

        let mut avatars: HashMap<String, Avatar> = parse(texts, "avatars.json")?;
        for avatar in avatars.values_mut() {
            avatar.icon = avatar.icon.replace("avatarshopicon", "avataricon");
        }

        Ok(Self {
            version,
            avatars,
            relics: parse(texts, "relics.json")?,
            relic_sets: parse(texts, "relic-sets.json")?,
            relic_main_affixes: parse(texts, "relic-main-affixes.json")?,
            relic_sub_affixes: parse(texts, "relic-sub-affixes.json")?,
            lightcones: parse(texts, "lightcones.json")?,
            stat_properties: parse(texts, "stat-properties.json")?,
            paths: parse(texts, "paths.json")?,
            elements: parse(texts, "elements.json")?,
            textmaps: parse(texts, "textmaps.json")?,
        })
    }

    pub fn text(&self, language: &str, hash: i64) -> String {
        let key = hash.to_string();
        [language, "CN", "EN"]
            .into_iter()
            .find_map(|lang| {
                self.textmaps
                    .get(lang)
                    .and_then(|map| map.get(&key))
                    .filter(|text| !text.is_empty())
                    .map(|text| strip_rich_text(text))
            })
            .unwrap_or_else(|| format!("#{hash}"))
    }

    pub fn stat_name(&self, language: &str, property: &str) -> String {
        match self.stat_properties.get(property) {
            Some(p) => self.text(language, p.name),
            None => property.to_string(),
        }
    }

    pub fn stat_icon_url(&self, property: &str) -> String {
        match self.stat_properties.get(property) {
            Some(p) if !p.icon_name.is_empty() => format!(
                "{ASSET_BASE_URL}/assets/spriteoutput/ui/avatar/icon/{}",
                p.icon_name.replace(".png", ".webp")
            ),
            _ => String::new(),
        }
    }
}

fn strip_rich_text(s: &str) -> String {
    if !s.contains('<') {
        return s.to_string();
    }
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for c in s.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    out
}
