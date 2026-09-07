use std::path::PathBuf;
use crate::state::{chrono_now, push_log};

#[tauri::command]
pub fn get_game_languages(game_dir: String) -> utils::GameLanguageState {
    utils::StarRailLangPatcher::detect_state(&PathBuf::from(&game_dir))
}

#[tauri::command]
pub fn set_game_language(
    game_dir: String,
    text_lang: String,
    audio_lang: String,
) -> Result<utils::LanguagePatchResult, String> {
    let res = utils::StarRailLangPatcher::set_language(&PathBuf::from(&game_dir), &text_lang, &audio_lang)
        .map_err(|e| format!("Language Patch Error: {e}"))?;
    push_log(format!("[{}] 🌐 {}", chrono_now(), res.message));
    Ok(res)
}

#[tauri::command]
pub fn rollback_game_language(game_path: String) -> Result<bool, String> {
    let p = PathBuf::from(&game_path);
    push_log(format!("[{}] [*] Performing 1-Click Rollback for game language...", chrono_now()));
    let res = utils::StarRailLangPatcher::rollback_language(&p)
        .map_err(|e| e.to_string())?;
    if res {
        push_log(format!("[{}] [OK] Language restored successfully from automated snapshot backup!", chrono_now()));
    } else {
        push_log(format!("[{}] [*] No previous snapshot backup found to restore.", chrono_now()));
    }
    Ok(res)
}

