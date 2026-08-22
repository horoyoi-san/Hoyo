use std::path::PathBuf;

use serde::{Deserialize, Serialize};

pub const CONFIG_VERSION: u32 = 1;
pub const CONFIG_DIR_NAME: &str = "Config";
const LAST_LOADED_FILE: &str = ".last_loaded";

fn now_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub version: u32,
    #[serde(default)]
    pub created_at: u64,
    pub filtered_message_names: Vec<String>,
    pub hooked_message_names: Vec<String>,
    pub enabled_cheats: Vec<String>,
    pub keybinds: Vec<KeybindEntry>,
    #[serde(default)]
    pub cheat_values: Vec<CheatValueEntry>,
    #[serde(default)]
    pub dumper_enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeybindEntry {
    pub module_id: String,
    pub key: String,
    pub key_code: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheatValueEntry {
    pub module_id: String,
    pub key: String,
    pub value: serde_json::Value,
}

impl AppConfig {
    pub fn new(
        filtered_message_names: impl IntoIterator<Item = String>,
        hooked_message_names: impl IntoIterator<Item = String>,
        enabled_cheats: impl IntoIterator<Item = String>,
        keybinds: impl IntoIterator<Item = (String, String, i32)>,
        cheat_values: impl IntoIterator<Item = CheatValueEntry>,
        dumper_enabled: bool,
    ) -> Self {
        let mut filtered_message_names: Vec<String> = filtered_message_names.into_iter().collect();
        filtered_message_names.sort();
        filtered_message_names.dedup();

        let mut hooked_message_names: Vec<String> = hooked_message_names.into_iter().collect();
        hooked_message_names.sort();
        hooked_message_names.dedup();

        let mut enabled_cheats: Vec<String> = enabled_cheats.into_iter().collect();
        enabled_cheats.sort();
        enabled_cheats.dedup();

        let mut keybinds: Vec<KeybindEntry> = keybinds
            .into_iter()
            .map(|(module_id, key, key_code)| KeybindEntry {
                module_id,
                key,
                key_code,
            })
            .collect();
        keybinds.sort_by(|a, b| (&a.module_id, &a.key).cmp(&(&b.module_id, &b.key)));

        let mut cheat_values: Vec<CheatValueEntry> = cheat_values.into_iter().collect();
        cheat_values.sort_by(|a, b| (&a.module_id, &a.key).cmp(&(&b.module_id, &b.key)));

        Self {
            version: CONFIG_VERSION,
            created_at: now_seconds(),
            filtered_message_names,
            hooked_message_names,
            enabled_cheats,
            keybinds,
            cheat_values,
            dumper_enabled,
        }
    }

    pub fn normalized(mut self) -> Self {
        self.filtered_message_names.sort();
        self.filtered_message_names.dedup();
        self.hooked_message_names.sort();
        self.hooked_message_names.dedup();
        self.enabled_cheats.sort();
        self.enabled_cheats.dedup();
        self.keybinds
            .sort_by(|a, b| (&a.module_id, &a.key).cmp(&(&b.module_id, &b.key)));
        self.cheat_values
            .sort_by(|a, b| (&a.module_id, &a.key).cmp(&(&b.module_id, &b.key)));
        self
    }

    pub fn equivalent(&self, other: &Self) -> bool {
        self.filtered_message_names == other.filtered_message_names
            && self.hooked_message_names == other.hooked_message_names
            && self.enabled_cheats == other.enabled_cheats
            && self.keybinds == other.keybinds
            && self.cheat_values == other.cheat_values
            && self.dumper_enabled == other.dumper_enabled
    }
}

#[derive(Debug)]
pub enum ConfigStoreError {
    Io(std::io::Error),
    Json(serde_json::Error),
    InvalidName,
    AlreadyExists,
    NotFound,
}

impl std::fmt::Display for ConfigStoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(err) => write!(f, "io error: {err}"),
            Self::Json(err) => write!(f, "json error: {err}"),
            Self::InvalidName => write!(f, "invalid config name"),
            Self::AlreadyExists => write!(f, "config already exists"),
            Self::NotFound => write!(f, "config not found"),
        }
    }
}

impl std::error::Error for ConfigStoreError {}

impl From<std::io::Error> for ConfigStoreError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}

impl From<serde_json::Error> for ConfigStoreError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}

pub type Result<T> = std::result::Result<T, ConfigStoreError>;

fn validate_name(name: &str) -> Result<()> {
    let name = name.trim();
    if name.is_empty()
        || name.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|'])
        || name == "."
        || name == ".."
    {
        return Err(ConfigStoreError::InvalidName);
    }
    Ok(())
}

pub fn config_dir() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(CONFIG_DIR_NAME)
}

fn ensure_dir() -> Result<PathBuf> {
    let dir = config_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

fn config_path(name: &str) -> Result<PathBuf> {
    validate_name(name)?;
    Ok(ensure_dir()?.join(format!("{name}.json")))
}

pub fn list() -> Result<Vec<String>> {
    let dir = ensure_dir()?;
    let mut entries: Vec<(String, u64)> = Vec::new();

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json")
            && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
        {
            let created_at = std::fs::read_to_string(&path)
                .ok()
                .and_then(|json| serde_json::from_str::<AppConfig>(&json).ok())
                .map_or(0, |cfg| cfg.created_at);
            entries.push((stem.to_string(), created_at));
        }
    }

    entries.sort_by_key(|a| a.1);
    Ok(entries.into_iter().map(|(name, _)| name).collect())
}

pub fn save(name: &str, config: &AppConfig) -> Result<()> {
    let path = config_path(name)?;
    let json = serde_json::to_string_pretty(config)?;
    std::fs::write(path, json)?;
    Ok(())
}

pub fn load(name: &str) -> Result<AppConfig> {
    let path = config_path(name)?;
    if !path.exists() {
        return Err(ConfigStoreError::NotFound);
    }
    let json = std::fs::read_to_string(path)?;
    let config: AppConfig = serde_json::from_str(&json)?;
    Ok(config.normalized())
}

pub fn delete(name: &str) -> Result<()> {
    let path = config_path(name)?;
    if !path.exists() {
        return Err(ConfigStoreError::NotFound);
    }
    std::fs::remove_file(path)?;
    Ok(())
}

pub fn rename(old: &str, new: &str) -> Result<()> {
    validate_name(new)?;
    let old_path = config_path(old)?;
    if !old_path.exists() {
        return Err(ConfigStoreError::NotFound);
    }
    let new_path = config_path(new)?;
    if new_path.exists() {
        return Err(ConfigStoreError::AlreadyExists);
    }
    std::fs::rename(old_path, new_path)?;

    if last_loaded_name().as_deref() == Some(old) {
        let _ = set_last_loaded_name(Some(new));
    }

    Ok(())
}

pub fn last_loaded_name() -> Option<String> {
    let path = config_dir().join(LAST_LOADED_FILE);
    std::fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

pub fn set_last_loaded_name(name: Option<&str>) -> Result<()> {
    let dir = ensure_dir()?;
    let path = dir.join(LAST_LOADED_FILE);
    match name {
        Some(name) => std::fs::write(path, name),
        None => std::fs::remove_file(path),
    }?;
    Ok(())
}
