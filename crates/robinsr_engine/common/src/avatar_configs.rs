use std::collections::HashMap;
use std::sync::LazyLock;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct AvatarConfig {
    #[serde(rename = "weaknessBuffId")]
    pub weakness_buff_id: u32,
    #[serde(rename = "techniqueBuffIds", default)]
    pub technique_buff_ids: Vec<u32>,
}

#[derive(Debug, Deserialize)]
struct AvatarConfigsContainer {
    #[serde(rename = "avatarConfigs")]
    pub avatar_configs: HashMap<String, AvatarConfig>,
}

pub static AVATAR_CONFIGS: LazyLock<HashMap<u32, AvatarConfig>> = LazyLock::new(|| {
    const RAW_JSON: &str = include_str!("avatarConfigs.json");
    if let Ok(container) = serde_json::from_str::<AvatarConfigsContainer>(RAW_JSON) {
        container
            .avatar_configs
            .into_iter()
            .filter_map(|(k, v)| k.parse::<u32>().ok().map(|id| (id, v)))
            .collect()
    } else {
        HashMap::new()
    }
});

pub fn get_avatar_config(avatar_id: u32) -> Option<&'static AvatarConfig> {
    AVATAR_CONFIGS.get(&avatar_id)
}
