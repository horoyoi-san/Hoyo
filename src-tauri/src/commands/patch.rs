use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use serde::Serialize;
use windows::Win32::UI::Shell::ShellExecuteW;
use crate::embedded::{resolve_bin_dir, resolve_project_root, EMBEDDED_HKRPG_DLL, EMBEDDED_LAUNCHER_EXE, EMBEDDED_VERSION_DLL};
use crate::state::{chrono_now, push_log};

pub const PATCH_REPO_URL: &str = "https://git.neonteam.dev/amizing/hkrpg-patch";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PatchStatus {
    dll_present: bool,
    launcher_present: bool,
    dll_modified_secs: u64,
    launcher_modified_secs: u64,
    game_exe_present: bool,
}

pub fn modified_secs(path: &Path) -> u64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .map(|t| {
            t.duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0)
        })
        .unwrap_or(0)
}

pub fn check_patch_impl(game_path: &str) -> PatchStatus {
    let dir = PathBuf::from(game_path);
    if dir.is_dir() {
        ensure_version_dll_deployed(&dir);
    }
    let dll = dir.join("hkrpg.dll");
    let launcher = dir.join("launcher.exe");
    PatchStatus {
        dll_present: dll.is_file(),
        launcher_present: launcher.is_file(),
        dll_modified_secs: modified_secs(&dll),
        launcher_modified_secs: modified_secs(&launcher),
        game_exe_present: dir.join("StarRail.exe").is_file(),
    }
}

pub fn ensure_version_dll_deployed(game_dir: &Path) {
    if !game_dir.is_dir() {
        return;
    }

    let bin_dir = resolve_bin_dir();
    let root_dir = resolve_project_root();
    let candidate_sources = [
        bin_dir.join("version.dll"),
        root_dir.join("bin").join("version.dll"),
        root_dir.join("target").join("release").join("version.dll"),
        root_dir.join("target").join("debug").join("version.dll"),
        root_dir.join("crates").join("target").join("release").join("version.dll"),
    ];

    let source_dll = candidate_sources.into_iter().find(|p| p.is_file());
    let target_dll = game_dir.join("version.dll");

    // 1. Clean up or restore any anti-cheat renamed files (version.dll.XXXXXXXX, version.dll.bak, etc.)
    if let Ok(entries) = std::fs::read_dir(game_dir) {
        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();
            if name_str.starts_with("version.dll.") || name_str.starts_with("version_old") {
                let old_path = entry.path();
                // If target_dll doesn't exist, try restoring it silently
                if !target_dll.is_file() {
                    let _ = fs::rename(&old_path, &target_dll);
                } else {
                    // Otherwise remove stale leftovers silently
                    let _ = fs::remove_file(&old_path);
                }
            }
        }
    }

    // 2. Deploy version.dll silently in the background
    if let Some(src) = source_dll {
        // Unlock existing file if read-only
        if let Ok(mut perms) = fs::metadata(&target_dll).map(|m| m.permissions()) {
            perms.set_readonly(false);
            let _ = fs::set_permissions(&target_dll, perms);
        }

        // Copy fresh binary
        if let Ok(_) = fs::copy(&src, &target_dll) {
            // Set Read-Only to protect against launcher renaming
            if let Ok(mut perms) = fs::metadata(&target_dll).map(|m| m.permissions()) {
                perms.set_readonly(true);
                let _ = fs::set_permissions(&target_dll, perms);
            }
            let _ = Command::new("attrib").args(["+R", target_dll.to_str().unwrap_or("")]).output();
        }
    } else {
        // Fallback: Deploy from embedded bytes directly!
        if let Ok(mut perms) = fs::metadata(&target_dll).map(|m| m.permissions()) {
            perms.set_readonly(false);
            let _ = fs::set_permissions(&target_dll, perms);
        }
        if let Ok(_) = fs::write(&target_dll, EMBEDDED_VERSION_DLL) {
            if let Ok(mut perms) = fs::metadata(&target_dll).map(|m| m.permissions()) {
                perms.set_readonly(true);
                let _ = fs::set_permissions(&target_dll, perms);
            }
            let _ = Command::new("attrib").args(["+R", target_dll.to_str().unwrap_or("")]).output();
        }
    }
}

pub fn install_patch_impl(game_path: &str) -> Result<PatchStatus, String> {
    let dir = PathBuf::from(game_path);
    if !dir.is_dir() {
        return Err(format!("Game folder not found: {game_path}"));
    }

    let hkrpg_target = dir.join("hkrpg.dll");
    let launcher_target = dir.join("launcher.exe");

    // 1. Direct Native Deployment from Embedded Binaries (100% Offline & Instant)
    if let Err(e) = fs::write(&hkrpg_target, EMBEDDED_HKRPG_DLL) {
        return Err(format!("Failed to write hkrpg.dll: {e}"));
    }

    if let Err(e) = fs::write(&launcher_target, EMBEDDED_LAUNCHER_EXE) {
        return Err(format!("Failed to write launcher.exe: {e}"));
    }

    // 2. Auto-deploy and protect version.dll (Dumper/IPC hook)
    ensure_version_dll_deployed(&dir);

    push_log(format!("[{}] [OK] Installed native hkrpg.dll & launcher.exe (Built-in 2026 Standalone)", chrono_now()));

    Ok(check_patch_impl(game_path))
}

pub fn launch_game_impl(game_path: &str) -> Result<(), String> {
    let dir = PathBuf::from(game_path);
    if !dir.is_dir() {
        return Err(format!("Game directory not found: {game_path}"));
    }
    
    // 1. Auto Deploy & Protect Hook DLL (+R)
    ensure_version_dll_deployed(&dir);

    let game_exe = dir.join("StarRail.exe");
    let launcher = dir.join("launcher.exe");

    // 2. Prioritize launcher.exe (Patch Launcher with hkrpg.dll injector) over StarRail.exe
    let target_exe = if launcher.is_file() {
        push_log(format!("[{}] [*] Launching patch loader: launcher.exe (with hkrpg.dll)", chrono_now()));
        launcher
    } else if game_exe.is_file() {
        push_log(format!("[{}] [*] Launching game executable: StarRail.exe", chrono_now()));
        game_exe
    } else {
        return Err(format!("Neither launcher.exe nor StarRail.exe found at {}", dir.display()));
    };

    // The patch launcher / game requires admin; "runas" triggers the UAC prompt.
    let file = windows::core::HSTRING::from(target_exe.as_os_str());
    let dir_w = windows::core::HSTRING::from(dir.as_os_str());

    // SAFETY: plain Win32 ShellExecuteW call with owned HSTRINGs; the
    // launcher's own manifest performs the elevation handshake.
    let result = unsafe {
        ShellExecuteW(
            None,
            windows::core::w!("runas"),
            windows::core::PCWSTR(file.as_ptr()),
            windows::core::PCWSTR::null(),
            windows::core::PCWSTR(dir_w.as_ptr()),
            windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
        )
    };
    // ShellExecuteW returns HINSTANCE > 32 on success. 1223 = the user
    // pressed "No" on the UAC elevation prompt.
    let code = result.0 as isize;
    if code == 1223 {
        return Err("UAC_CANCELED".into());
    }
    if code <= 32 {
        return Err(format!("launch failed (code {code})"));
    }
    Ok(())
}

#[tauri::command]
pub fn check_patch(game_path: String) -> PatchStatus {
    check_patch_impl(&game_path)
}

#[tauri::command]
pub fn install_patch(game_path: String) -> Result<PatchStatus, String> {
    push_log(format!("[{}] 🧩 Starting patch installation into: {}", chrono_now(), game_path));
    let res = install_patch_impl(&game_path);
    match &res {
        Ok(_) => push_log(format!("[{}] ✅ Patch (hkrpg.dll & launcher.exe) successfully installed.", chrono_now())),
        Err(e) => push_log(format!("[{}] ❌ Patch error: {}", chrono_now(), e)),
    }
    res
}

#[tauri::command]
pub fn launch_game(game_path: String) -> Result<(), String> {
    push_log(format!("[{}] 🚀 Spawning Star Rail game client in: {}", chrono_now(), game_path));
    let res = launch_game_impl(&game_path);
    match &res {
        Ok(_) => push_log(format!("[{}] 🎮 Game process launched (UAC Elevation granted).", chrono_now())),
        Err(e) => push_log(format!("[{}] ❌ Game launch cancelled/failed: {}", chrono_now(), e)),
    }
    res
}

#[tauri::command]
pub fn execute_apply_patch(
    game_dir: String,
    patch_archive: String,
) -> Result<utils::HDiffResult, String> {
    let g_dir = PathBuf::from(&game_dir);
    let p_path = PathBuf::from(&patch_archive);
    let res = utils::HDiffPatcher::apply_patch(&g_dir, &p_path)
        .map_err(|e| format!("Patching Error: {e}"))?;
    push_log(format!("[{}] ⚡ {}", chrono_now(), res.message));
    Ok(res)
}


#[tauri::command]
pub fn rollback_hdiff_patch(game_dir: String) -> Result<utils::HDiffResult, String> {
    let g_dir = PathBuf::from(&game_dir);
    push_log(format!("[{}] [*] Performing 1-Click Rollback for HDiff game binaries...", chrono_now()));
    let res = utils::HDiffPatcher::rollback_snapshot(&g_dir)
        .map_err(|e| format!("Rollback Error: {e}"))?;
    push_log(format!("[{}] [OK] {}", chrono_now(), res.message));
    Ok(res)
}


#[tauri::command]
pub fn auto_protect_hook_dll(game_path: String) -> Result<bool, String> {
    let p = PathBuf::from(&game_path);
    ensure_version_dll_deployed(&p);
    push_log(format!("[{}] [OK] Hook DLL deployed and protected (Read-Only) in {}", chrono_now(), game_path));
    Ok(true)
}

#[tauri::command]
pub fn patch_repo_url() -> String {
    PATCH_REPO_URL.to_string()
}
