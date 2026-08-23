use std::path::{Path, PathBuf};
use std::sync::RwLock;

static CURRENT_GAME_DIR: RwLock<Option<PathBuf>> = RwLock::new(None);
const SETTINGS_FILE: &str = ".game_dir";

#[derive(Debug, Clone, Default)]
pub struct GameDirValidation {
    pub is_valid: bool,
    pub path: PathBuf,
    pub has_game_assembly: bool,
    pub has_starrail_exe: bool,
    pub has_metadata: bool,
    pub has_startup_metadata: bool,
    pub has_streaming_assets: bool,
    pub has_web_caches: bool,
    pub asset_blocks_count: usize,
    pub game_assembly_size_mb: f64,
    pub metadata_size_mb: f64,
}

impl GameDirValidation {
    pub fn summary(&self) -> String {
        if !self.is_valid {
            return "Invalid Game Directory".to_string();
        }
        let mut parts = Vec::new();
        if self.has_game_assembly {
            parts.push(format!("GameAssembly ({:.1} MB)", self.game_assembly_size_mb));
        }
        if self.has_metadata {
            parts.push("IL2CPP Metadata".to_string());
        }
        if self.has_streaming_assets {
            parts.push(format!("{} Asset Blocks", self.asset_blocks_count));
        }
        if self.has_web_caches {
            parts.push("Warp WebCache".to_string());
        }
        parts.join(" · ")
    }
}

pub fn init_game_dir() -> Option<PathBuf> {
    if let Some(saved) = load_saved_game_dir() {
        if validate_game_dir(&saved).is_valid {
            *CURRENT_GAME_DIR.write().unwrap() = Some(saved.clone());
            return Some(saved);
        }
    }

    if let Some(detected) = auto_detect_game_dir() {
        save_game_dir(&detected);
        *CURRENT_GAME_DIR.write().unwrap() = Some(detected.clone());
        return Some(detected);
    }

    None
}

pub fn get_game_dir() -> Option<PathBuf> {
    CURRENT_GAME_DIR.read().unwrap().clone()
}

pub fn set_game_dir(path: PathBuf) -> GameDirValidation {
    let validation = validate_game_dir(&path);
    if validation.is_valid {
        save_game_dir(&path);
        *CURRENT_GAME_DIR.write().unwrap() = Some(path);
    }
    validation
}

pub fn validate_game_dir(path: &Path) -> GameDirValidation {
    let mut v = GameDirValidation {
        path: path.to_path_buf(),
        ..Default::default()
    };

    let game_assembly = path.join("GameAssembly.dll");
    let starrail_exe = path.join("StarRail.exe");
    let meta_dir = path.join("StarRail_Data").join("il2cpp_data").join("Metadata");
    let global_meta = meta_dir.join("global-metadata.dat");
    let startup_meta = meta_dir.join("startup-metadata.dat");
    let asb_dir = path
        .join("StarRail_Data")
        .join("StreamingAssets")
        .join("Asb")
        .join("Windows");
    let web_caches = path.join("StarRail_Data").join("webCaches");

    if game_assembly.is_file() {
        v.has_game_assembly = true;
        if let Ok(meta) = game_assembly.metadata() {
            v.game_assembly_size_mb = meta.len() as f64 / (1024.0 * 1024.0);
        }
    }

    if starrail_exe.is_file() {
        v.has_starrail_exe = true;
    }

    if global_meta.is_file() {
        v.has_metadata = true;
        if let Ok(meta) = global_meta.metadata() {
            v.metadata_size_mb = meta.len() as f64 / (1024.0 * 1024.0);
        }
    }

    if startup_meta.is_file() {
        v.has_startup_metadata = true;
    }

    if asb_dir.is_dir() {
        v.has_streaming_assets = true;
    }

    if web_caches.is_dir() {
        v.has_web_caches = true;
    }

    // Considered valid if GameAssembly.dll or Metadata or Asb is present
    v.is_valid = v.has_game_assembly || v.has_metadata || v.has_streaming_assets;

    v
}

pub fn load_saved_game_dir() -> Option<PathBuf> {
    let settings_path = get_settings_file_path();
    if let Ok(content) = std::fs::read_to_string(&settings_path) {
        let trimmed = content.trim();
        if !trimmed.is_empty() {
            let path = PathBuf::from(trimmed);
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

pub fn save_game_dir(path: &Path) {
    let settings_path = get_settings_file_path();
    if let Some(parent) = settings_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(settings_path, path.to_string_lossy().as_bytes());
}

fn get_settings_file_path() -> PathBuf {
    crate::config_store::config_dir().join(SETTINGS_FILE)
}

pub fn auto_detect_game_dir() -> Option<PathBuf> {
    let drives = ["C:", "D:", "E:", "F:", "G:"];
    let subpaths = [
        r"Program Files\Star Rail\Games",
        r"Games\Star Rail\Games",
        r"Star Rail\Games",
        r"Program Files\HoYoPlay\games\StarRail\Games",
        r"HoYoPlay\games\StarRail\Games",
        r"Epic Games\HonkaiStarRail\Games",
        r"Program Files\Honkai Star Rail\Games",
        r"Games\Honkai Star Rail\Games",
    ];

    for drive in drives {
        for sub in subpaths {
            let candidate = PathBuf::from(format!(r"{drive}\{sub}"));
            if validate_game_dir(&candidate).is_valid {
                return Some(candidate);
            }
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        if validate_game_dir(&cwd).is_valid {
            return Some(cwd);
        }
    }

    None
}

pub fn pick_game_directory_dialog() -> Option<PathBuf> {
    let mut dialog = rfd::FileDialog::new().set_title("Select Honkai: Star Rail Game Directory");
    if let Some(current) = get_game_dir() {
        dialog = dialog.set_directory(current);
    }

    dialog.pick_folder()
}

pub fn default_dump_output_dir() -> PathBuf {
    if let Some(game_dir) = get_game_dir() {
        game_dir.join("Dump_Output")
    } else {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("Dump_Output")
    }
}
