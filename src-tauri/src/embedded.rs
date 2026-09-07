use std::fs;
use std::path::PathBuf;

// Embedded Runtime Binaries and Resources for 100% Standalone .exe Distribution
pub static EMBEDDED_VERSION_DLL: &[u8] = include_bytes!("../../bin/version.dll");
pub static EMBEDDED_SDK_SERVER: &[u8] = include_bytes!("../../bin/sdkserver.exe");
pub static EMBEDDED_GAME_SERVER: &[u8] = include_bytes!("../../bin/gameserver.exe");
pub static EMBEDDED_RES_JSON: &[u8] = include_bytes!("../../bin/res.json");
pub static EMBEDDED_FREESR_DATA: &[u8] = include_bytes!("../../bin/freesr-data.json");
pub static EMBEDDED_VERSIONS_JSON: &[u8] = include_bytes!("../../bin/versions.json");
pub static EMBEDDED_HKRPG_DLL: &[u8] = include_bytes!("../../bin/hkrpg.dll");
pub static EMBEDDED_LAUNCHER_EXE: &[u8] = include_bytes!("../../bin/launcher.exe");

pub fn cwd() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

pub fn resolve_project_root() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().find(|path| {
            path.join("crates").is_dir() || path.join("src-tauri").is_dir() || path.join("web").is_dir()
        }) {
            return root.to_path_buf();
        }
        if exe.parent().map(|p| p.file_name().and_then(|n| n.to_str()) == Some("bin")).unwrap_or(false) {
            if let Some(parent) = exe.parent().and_then(|p| p.parent()) {
                return parent.to_path_buf();
            }
        }
    }
    let current = cwd();
    if current.file_name().and_then(|n| n.to_str()) == Some("bin") {
        if let Some(parent) = current.parent() {
            return parent.to_path_buf();
        }
    }
    current
}

pub fn resolve_bin_dir() -> PathBuf {
    let current = cwd();
    if current.file_name().and_then(|n| n.to_str()) == Some("bin") {
        return current;
    }
    let root = resolve_project_root();
    if root.join("bin").is_dir() {
        root.join("bin")
    } else {
        root
    }
}

pub fn resolve_project_dump_dir() -> PathBuf {
    resolve_project_root().join("DUMP")
}

pub fn resolve_dump_dir() -> PathBuf {
    let current = cwd();
    let candidates = vec![
        current.join("DUMP"),
        current.join("../DUMP"),
        current.join("../../DUMP"),
    ];
    for c in candidates {
        if c.is_dir() {
            return c;
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        for ancestor in exe.ancestors() {
            let d = ancestor.join("DUMP");
            if d.is_dir() {
                return d;
            }
        }
    }
    current.join("DUMP")
}

pub fn ensure_embedded_assets_extracted() {
    let bin_dir = resolve_bin_dir();
    let _ = fs::create_dir_all(&bin_dir);

    let version_dll = bin_dir.join("version.dll");
    if !version_dll.is_file() || fs::metadata(&version_dll).map(|m| m.len()).unwrap_or(0) == 0 {
        let _ = fs::write(&version_dll, EMBEDDED_VERSION_DLL);
    }

    let sdk_exe = bin_dir.join("sdkserver.exe");
    if !sdk_exe.is_file() || fs::metadata(&sdk_exe).map(|m| m.len()).unwrap_or(0) == 0 {
        let _ = fs::write(&sdk_exe, EMBEDDED_SDK_SERVER);
    }

    let game_exe = bin_dir.join("gameserver.exe");
    if !game_exe.is_file() || fs::metadata(&game_exe).map(|m| m.len()).unwrap_or(0) == 0 {
        let _ = fs::write(&game_exe, EMBEDDED_GAME_SERVER);
    }

    let res_json = bin_dir.join("res.json");
    if !res_json.is_file() || fs::metadata(&res_json).map(|m| m.len()).unwrap_or(0) == 0 {
        let _ = fs::write(&res_json, EMBEDDED_RES_JSON);
    }

    let freesr_json = bin_dir.join("freesr-data.json");
    if !freesr_json.is_file() || fs::metadata(&freesr_json).map(|m| m.len()).unwrap_or(0) == 0 {
        let _ = fs::write(&freesr_json, EMBEDDED_FREESR_DATA);
    }

    let versions_json = bin_dir.join("versions.json");
    if !versions_json.is_file() || fs::metadata(&versions_json).map(|m| m.len()).unwrap_or(0) == 0 {
        let _ = fs::write(&versions_json, EMBEDDED_VERSIONS_JSON);
    }

    // Ensure DUMP directories are pre-created
    let dump_dir = resolve_project_dump_dir();
    let _ = fs::create_dir_all(dump_dir.join("Morax_Static"));
    let _ = fs::create_dir_all(dump_dir.join("IL2CPP_Dumper"));
}
