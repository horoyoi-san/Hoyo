use std::fs;
use std::path::PathBuf;
use std::process::Command;
use crate::embedded::{resolve_project_root, resolve_project_dump_dir};
use crate::state::{chrono_now, push_log};

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    let clean_path = path.trim().replace('/', "\\");
    let p = PathBuf::from(&clean_path);
    let abs_p = if p.is_relative() {
        resolve_project_root().join(&p)
    } else {
        p
    };
    let _ = fs::create_dir_all(&abs_p);

    let win_path = abs_p.to_string_lossy().replace('/', "\\");
    push_log(format!("[{}] 📂 Opening folder in Explorer: {}", chrono_now(), win_path));

    Command::new("explorer.exe")
        .arg(&win_path)
        .spawn()
        .map_err(|e| format!("failed to open explorer: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn pick_directory_dialog() -> Result<Option<String>, String> {
    if let Some(path) = rfd::FileDialog::new()
        .set_title("Select Directory")
        .pick_folder()
    {
        Ok(Some(path.to_string_lossy().replace('/', "\\")))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn pick_file_dialog(filter_ext: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new().set_title("Select File");

    if let Some(ext) = filter_ext {
        let clean = ext.trim().to_lowercase();
        if clean.contains("hdiff") || clean.contains("patch") || clean.contains("zip") {
            dialog = dialog.add_filter(
                "Patch Archives (*.hdiff, *.patch, *.zip, *.7z, *.rar, *.json)",
                &["hdiff", "patch", "zip", "7z", "rar", "json"],
            );
        } else if clean == "dll" {
            dialog = dialog.add_filter("Dynamic Link Library (*.dll)", &["dll"]);
        } else if clean == "json" {
            dialog = dialog.add_filter("JSON Configuration (*.json)", &["json"]);
        } else if clean == "dat" {
            dialog = dialog.add_filter("Binary Data (*.dat)", &["dat"]);
        } else if clean == "exe" {
            dialog = dialog.add_filter("Executable (*.exe)", &["exe"]);
        } else {
            let parts: Vec<&str> = clean
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();
            if !parts.is_empty() {
                dialog = dialog.add_filter("Supported Files", &parts);
            }
        }
    }

    // Always add All Files filter so users are never blocked
    dialog = dialog.add_filter("All Files (*.*)", &["*"]);

    if let Some(path) = dialog.pick_file() {
        Ok(Some(path.to_string_lossy().replace('\\', "/")))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn open_dump_folder() -> Result<(), String> {
    let dump_dir = resolve_project_dump_dir();
    let _ = fs::create_dir_all(&dump_dir);
    open_in_explorer(dump_dir.display().to_string())
}
