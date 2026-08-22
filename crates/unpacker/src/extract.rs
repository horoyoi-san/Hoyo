mod export;
mod preview;
mod scan;

use std::path::{Path, PathBuf};

use anyhow::Result;

use crate::{GameType, unity::classes::ClassIDType};

pub use export::{extract_block, extract_dir};
pub use preview::decode_texture;
pub use scan::{scan_block, scan_dir};

pub const GAME: GameType = GameType::Hkrpg;

fn map_file(path: &Path) -> Result<memmap2::Mmap> {
    let file = std::fs::File::open(path)?;
    Ok(unsafe { memmap2::Mmap::map(&file)? })
}

#[derive(Clone, Debug)]
pub struct AssetEntry {
    pub block: PathBuf,
    pub container: String,
    pub class_id: i32,
    pub class_name: String,
    pub name: String,
    pub path_id: i64,
}

impl AssetEntry {
    pub fn is_texture(&self) -> bool {
        ClassIDType::try_from(self.class_id) == Ok(ClassIDType::Texture2D)
    }

    pub fn is_text(&self) -> bool {
        ClassIDType::try_from(self.class_id) == Ok(ClassIDType::TextAsset)
    }
}

#[derive(Clone, Debug)]
pub struct ExtractOptions {
    pub textures: bool,
    pub text: bool,
    pub fonts: bool,
    pub filter: Option<String>,
}

impl Default for ExtractOptions {
    fn default() -> Self {
        Self {
            textures: true,
            text: true,
            fonts: true,
            filter: None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct ExtractStats {
    pub blocks: usize,
    pub extracted: usize,
    pub skipped: usize,
    pub errors: usize,
}

impl ExtractStats {
    fn merge(&mut self, other: ExtractStats) {
        self.blocks += other.blocks;
        self.extracted += other.extracted;
        self.skipped += other.skipped;
        self.errors += other.errors;
    }
}

pub fn collect_block_files(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    collect_block_files_into(dir, &mut out);
    out.sort();
    out
}

fn collect_block_files_into(path: &Path, out: &mut Vec<PathBuf>) {
    if path.is_file() {
        if is_block(path) {
            out.push(path.to_path_buf());
        }
        return;
    }
    let Ok(entries) = std::fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            collect_block_files_into(&p, out);
        } else if is_block(&p) {
            out.push(p);
        }
    }
}

fn is_block(path: &Path) -> bool {
    path.extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("block"))
}
