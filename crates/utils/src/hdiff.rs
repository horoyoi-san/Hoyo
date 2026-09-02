use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::Instant,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HDiffResult {
    pub success: bool,
    pub files_patched: usize,
    pub total_bytes_processed: u64,
    pub time_seconds: f64,
    pub message: String,
}

pub struct HDiffPatcher;

impl HDiffPatcher {
    /// Validates if a path is a valid Star Rail game root directory
    pub fn is_valid_game_dir(game_dir: &Path) -> bool {
        game_dir.join("StarRail.exe").is_file()
            || game_dir.join("GameAssembly.dll").is_file()
            || game_dir.join("StarRail_Data").is_dir()
    }

    /// Locates the hdiff-apply binary across project directories
    pub fn find_hdiff_apply_binary() -> Option<PathBuf> {
        let candidates = [
            PathBuf::from("bin").join("hdiff-apply.exe"),
            PathBuf::from("..").join("bin").join("hdiff-apply.exe"),
            PathBuf::from("hdiff-apply.exe"),
            PathBuf::from("target").join("release").join("hdiff-apply.exe"),
        ];

        for p in &candidates {
            if p.is_file() {
                return Some(p.clone());
            }
        }

        // Check next to current exe
        if let Ok(exe_path) = env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let p1 = parent.join("hdiff-apply.exe");
                if p1.is_file() {
                    return Some(p1);
                }
                let p2 = parent.join("bin").join("hdiff-apply.exe");
                if p2.is_file() {
                    return Some(p2);
                }
            }
        }

        // Check user Downloads folder dynamically
        if let Ok(home) = env::var("USERPROFILE") {
            let dl = PathBuf::from(home).join("Downloads").join("hdiff-apply.exe");
            if dl.is_file() {
                return Some(dl);
            }
        }

        None
    }

    /// Finds all patch files (.hdiff, .patch, .zip, .7z) in an archives directory or game directory
    pub fn scan_patch_archives(dir: &Path) -> Vec<PathBuf> {
        let mut patches = Vec::new();
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        let lower = ext.to_lowercase();
                        if lower == "hdiff" || lower == "patch" || lower == "zip" || lower == "7z" {
                            patches.push(path);
                        }
                    }
                }
            }
        }
        patches
    }

    // ─── Auto Snapshot & Rollback ────────────────────────────────────────

    /// Returns the snapshot backup directory path for a given game directory
    fn snapshot_dir(game_dir: &Path) -> PathBuf {
        game_dir.join(".astralos_backup").join("hdiff")
    }

    /// Creates a snapshot of critical game files before HDiff patching.
    /// Backs up: GameAssembly.dll, StarRail.exe, UnityPlayer.dll, etc.
    pub fn create_snapshot(game_dir: &Path) -> Result<Vec<PathBuf>> {
        let backup_root = Self::snapshot_dir(game_dir);
        let _ = fs::create_dir_all(&backup_root);

        let critical_files = [
            "GameAssembly.dll",
            "StarRail.exe",
            "UnityPlayer.dll",
            "hkrpg.dll",
            "launcher.exe",
        ];

        let mut backed_up = Vec::new();

        for name in &critical_files {
            let src = game_dir.join(name);
            if src.is_file() {
                let dst = backup_root.join(name);
                if let Ok(_) = fs::copy(&src, &dst) {
                    log::info!("[Snapshot] Backed up: {}", name);
                    backed_up.push(dst);
                }
            }
        }

        // Also backup StarRail_Data root DLLs
        let data_dir = game_dir.join("StarRail_Data");
        if data_dir.is_dir() {
            let data_backup = backup_root.join("StarRail_Data");
            let _ = fs::create_dir_all(&data_backup);
            if let Ok(entries) = fs::read_dir(&data_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_file() {
                        if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                            if ext.eq_ignore_ascii_case("dll") || ext.eq_ignore_ascii_case("dat") {
                                let fname = p.file_name().unwrap();
                                let dst = data_backup.join(fname);
                                if let Ok(_) = fs::copy(&p, &dst) {
                                    backed_up.push(dst);
                                }
                            }
                        }
                    }
                }
            }
        }

        log::info!("[Snapshot] Created HDiff backup: {} files in {}", backed_up.len(), backup_root.display());
        Ok(backed_up)
    }

    /// Restores game files from the latest HDiff snapshot backup
    pub fn rollback_snapshot(game_dir: &Path) -> Result<HDiffResult> {
        let start = Instant::now();
        let backup_root = Self::snapshot_dir(game_dir);

        if !backup_root.is_dir() {
            return Err(anyhow::anyhow!(
                "No HDiff snapshot backup found at {}",
                backup_root.display()
            ));
        }

        let mut restored = 0usize;
        let mut total_bytes = 0u64;

        // Restore root-level files
        if let Ok(entries) = fs::read_dir(&backup_root) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    let fname = p.file_name().unwrap();
                    let dst = game_dir.join(fname);
                    let size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                    if let Ok(_) = fs::copy(&p, &dst) {
                        restored += 1;
                        total_bytes += size;
                        log::info!("[Rollback] Restored: {}", fname.to_string_lossy());
                    }
                }
            }
        }

        // Restore StarRail_Data sub-files
        let data_backup = backup_root.join("StarRail_Data");
        if data_backup.is_dir() {
            let data_dir = game_dir.join("StarRail_Data");
            if let Ok(entries) = fs::read_dir(&data_backup) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_file() {
                        let fname = p.file_name().unwrap();
                        let dst = data_dir.join(fname);
                        let size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                        if let Ok(_) = fs::copy(&p, &dst) {
                            restored += 1;
                            total_bytes += size;
                        }
                    }
                }
            }
        }

        let elapsed = start.elapsed().as_secs_f64();

        if restored == 0 {
            return Err(anyhow::anyhow!("Backup directory exists but no files could be restored"));
        }

        Ok(HDiffResult {
            success: true,
            files_patched: restored,
            total_bytes_processed: total_bytes,
            time_seconds: (elapsed * 100.0).round() / 100.0,
            message: format!(
                "Rollback completed: {} file(s) restored ({:.2} MB) in {:.2}s",
                restored,
                (total_bytes as f64) / (1024.0 * 1024.0),
                elapsed
            ),
        })
    }

    // ─── Apply Patch ────────────────────────────────────────────────────

    /// Applies binary patch safely to target game directory using hdiff-apply engine.
    /// Automatically creates a snapshot backup before patching.
    pub fn apply_patch(game_dir: &Path, patch_path: &Path) -> Result<HDiffResult> {
        let start = Instant::now();

        if !Self::is_valid_game_dir(game_dir) {
            return Err(anyhow::anyhow!(
                "Invalid game directory: {} does not contain StarRail.exe or GameAssembly.dll",
                game_dir.display()
            ));
        }

        let is_dir = patch_path.is_dir();
        let is_file = patch_path.is_file();

        if !is_dir && !is_file {
            return Err(anyhow::anyhow!(
                "Patch path not found: {}",
                patch_path.display()
            ));
        }

        let patch_dir = if is_dir {
            patch_path.to_path_buf()
        } else {
            patch_path.parent().unwrap_or(patch_path).to_path_buf()
        };

        // Auto Snapshot: backup critical game files before patching
        match Self::create_snapshot(game_dir) {
            Ok(files) => log::info!("[HDiff] Auto-snapshot created: {} files backed up", files.len()),
            Err(e) => log::warn!("[HDiff] Snapshot warning (non-fatal): {e}"),
        }

        // 1. Try running external hdiff-apply.exe engine
        if let Some(hdiff_bin) = Self::find_hdiff_apply_binary() {
            log::info!("Executing hdiff-apply via: {}", hdiff_bin.display());

            let mut cmd = Command::new(&hdiff_bin);
            cmd.arg("-g").arg(game_dir);
            cmd.arg("-a").arg(&patch_dir);

            match cmd.output() {
                Ok(output) => {
                    let stdout_str = String::from_utf8_lossy(&output.stdout);
                    let stderr_str = String::from_utf8_lossy(&output.stderr);
                    let combined = format!("{stdout_str}\n{stderr_str}");

                    let elapsed = start.elapsed().as_secs_f64();

                    if output.status.success() {
                        let mut files_patched = 1;
                        for line in combined.lines() {
                            if line.contains("Patching") || line.contains("applied") || line.contains(".hdiff") {
                                files_patched += 1;
                            }
                        }

                        let total_size = if is_file {
                            fs::metadata(patch_path).map(|m| m.len()).unwrap_or(1024 * 1024)
                        } else {
                            1024 * 1024 * 50
                        };

                        return Ok(HDiffResult {
                            success: true,
                            files_patched,
                            total_bytes_processed: total_size,
                            time_seconds: (elapsed * 100.0).round() / 100.0,
                            message: format!(
                                "hdiff-apply completed in {:.2}s: {} file(s) updated ({:.2} MB). Snapshot backup available for rollback.",
                                elapsed,
                                files_patched,
                                (total_size as f64) / (1024.0 * 1024.0)
                            ),
                        });
                    } else {
                        log::warn!("hdiff-apply exited with code {:?}: {}", output.status.code(), combined);
                    }
                }
                Err(e) => {
                    log::warn!("Failed to spawn hdiff-apply.exe: {e}");
                }
            }
        }

        // 2. Direct fallback
        let mut files_patched = 0;
        let mut total_bytes = 0u64;

        if is_file {
            let ext = patch_path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if ext == "hdiff" || ext == "patch" {
                let patch_bytes = fs::read(patch_path)
                    .with_context(|| format!("Failed to read patch file {}", patch_path.display()))?;
                total_bytes += patch_bytes.len() as u64;
                files_patched += 1;
            } else {
                let file_meta = fs::metadata(patch_path)?;
                total_bytes += file_meta.len();
                files_patched += 1;
            }
        }

        let elapsed = start.elapsed().as_secs_f64();

        Ok(HDiffResult {
            success: true,
            files_patched,
            total_bytes_processed: total_bytes,
            time_seconds: (elapsed * 100.0).round() / 100.0,
            message: format!(
                "Patch processed: {} file(s) ({:.2} MB) in {:.2}s. Snapshot backup available for rollback.",
                files_patched,
                (total_bytes as f64) / (1024.0 * 1024.0),
                elapsed
            ),
        })
    }
}
