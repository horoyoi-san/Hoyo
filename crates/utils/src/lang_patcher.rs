use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageInfo {
    pub code: String,
    pub name: String,
    pub native_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLanguageState {
    pub current_text_lang: String,
    pub current_audio_lang: String,
    pub supported_text_languages: Vec<LanguageInfo>,
    pub supported_audio_languages: Vec<LanguageInfo>,
    pub game_dir_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguagePatchResult {
    pub success: bool,
    pub previous_text: String,
    pub new_text: String,
    pub previous_audio: String,
    pub new_audio: String,
    pub message: String,
}

pub struct StarRailLangPatcher;

impl StarRailLangPatcher {
    pub fn get_supported_text_languages() -> Vec<LanguageInfo> {
        vec![
            LanguageInfo { code: "th".to_string(), name: "Thai".to_string(), native_name: "ภาษาไทย".to_string() },
            LanguageInfo { code: "en".to_string(), name: "English".to_string(), native_name: "English".to_string() },
            LanguageInfo { code: "ja".to_string(), name: "Japanese".to_string(), native_name: "日本語".to_string() },
            LanguageInfo { code: "zh-cn".to_string(), name: "Chinese (Simplified)".to_string(), native_name: "简体中文".to_string() },
            LanguageInfo { code: "zh-tw".to_string(), name: "Chinese (Traditional)".to_string(), native_name: "繁體中文".to_string() },
            LanguageInfo { code: "ko".to_string(), name: "Korean".to_string(), native_name: "한국어".to_string() },
            LanguageInfo { code: "es".to_string(), name: "Spanish".to_string(), native_name: "Español".to_string() },
            LanguageInfo { code: "fr".to_string(), name: "French".to_string(), native_name: "Français".to_string() },
            LanguageInfo { code: "de".to_string(), name: "German".to_string(), native_name: "Deutsch".to_string() },
            LanguageInfo { code: "ru".to_string(), name: "Russian".to_string(), native_name: "Русский".to_string() },
            LanguageInfo { code: "pt".to_string(), name: "Portuguese".to_string(), native_name: "Português".to_string() },
            LanguageInfo { code: "id".to_string(), name: "Indonesian".to_string(), native_name: "Bahasa Indonesia".to_string() },
            LanguageInfo { code: "vi".to_string(), name: "Vietnamese".to_string(), native_name: "Tiếng Việt".to_string() },
        ]
    }

    pub fn get_supported_audio_languages() -> Vec<LanguageInfo> {
        vec![
            LanguageInfo { code: "ja".to_string(), name: "Japanese Voice".to_string(), native_name: "日本語音声".to_string() },
            LanguageInfo { code: "en".to_string(), name: "English Voice".to_string(), native_name: "English Voice".to_string() },
            LanguageInfo { code: "zh".to_string(), name: "Chinese Voice".to_string(), native_name: "中文配音".to_string() },
            LanguageInfo { code: "ko".to_string(), name: "Korean Voice".to_string(), native_name: "한국어 음성".to_string() },
        ]
    }

    /// Detects current language configuration for a given game folder
    pub fn detect_state(game_dir: &Path) -> GameLanguageState {
        let is_valid = game_dir.join("StarRail.exe").is_file() || game_dir.join("GameAssembly.dll").is_file();

        let mut current_text = "en".to_string();
        let mut current_audio = "ja".to_string();

        let cfg_path = game_dir.join("GeneralConfig.json");
        if cfg_path.is_file() {
            if let Ok(content) = fs::read_to_string(&cfg_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(t) = val.get("TextLanguage").and_then(|x| x.as_str()) {
                        current_text = t.to_string();
                    }
                    if let Some(a) = val.get("VoiceLanguage").and_then(|x| x.as_str()) {
                        current_audio = a.to_string();
                    }
                }
            }
        }

        GameLanguageState {
            current_text_lang: current_text,
            current_audio_lang: current_audio,
            supported_text_languages: Self::get_supported_text_languages(),
            supported_audio_languages: Self::get_supported_audio_languages(),
            game_dir_valid: is_valid,
        }
    }

    /// Applies new text and audio language to game directory
    pub fn set_language(
        game_dir: &Path,
        text_lang: &str,
        audio_lang: &str,
    ) -> Result<LanguagePatchResult> {
        let prev_state = Self::detect_state(game_dir);

        let cfg_path = game_dir.join("GeneralConfig.json");
        let mut cfg_obj = if cfg_path.is_file() {
            let content = fs::read_to_string(&cfg_path).unwrap_or_default();
            serde_json::from_str::<serde_json::Value>(&content).unwrap_or_else(|_| serde_json::json!({}))
        } else {
            serde_json::json!({})
        };

        if let Some(obj) = cfg_obj.as_object_mut() {
            obj.insert("TextLanguage".to_string(), serde_json::Value::String(text_lang.to_string()));
            obj.insert("VoiceLanguage".to_string(), serde_json::Value::String(audio_lang.to_string()));
        }

        let formatted = serde_json::to_string_pretty(&cfg_obj)
            .context("Failed to format language configuration")?;

        fs::write(&cfg_path, &formatted)
            .with_context(|| format!("Failed to write {}", cfg_path.display()))?;

        // Also check StarRail_Data/Persistent/
        let persistent_dir = game_dir.join("StarRail_Data").join("Persistent");
        if persistent_dir.is_dir() {
            let _ = fs::write(persistent_dir.join("GeneralConfig.json"), &formatted);
        }

        Ok(LanguagePatchResult {
            success: true,
            previous_text: prev_state.current_text_lang,
            new_text: text_lang.to_string(),
            previous_audio: prev_state.current_audio_lang,
            new_audio: audio_lang.to_string(),
            message: format!(
                "Successfully set Game Language to: Text=[{}] | Voice=[{}]",
                text_lang.to_uppercase(),
                audio_lang.to_uppercase()
            ),
        })
    }
}
