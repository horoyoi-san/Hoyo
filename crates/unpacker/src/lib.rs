use std::fmt::{Display, Formatter, Result as FmtResult};

pub mod archive;
pub mod binary_reader;
pub mod oodle;
pub mod unity;

mod extract;

pub use extract::{
    AssetEntry, ExtractOptions, ExtractStats, collect_block_files, decode_texture, extract_block,
    extract_dir, scan_block, scan_dir,
};

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum GameType {
    #[default]
    Unknown,
    Bh3,
    Hk4e,
    Hkrpg,
    Nap,
    Abc,
    Hyg,
}

impl Display for GameType {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            GameType::Unknown => f.write_str("Unknown"),
            GameType::Bh3 => f.write_str("Honkai Impact 3rd"),
            GameType::Hk4e => f.write_str("Genshin Impact"),
            GameType::Hkrpg => f.write_str("Honkai: Star Rail"),
            GameType::Nap => f.write_str("Zenless Zone Zero"),
            GameType::Abc => f.write_str("Honkai: Nexus Anima"),
            GameType::Hyg => f.write_str("Petit Planet"),
        }
    }
}
