use anyhow::Result;
use std::borrow::Cow;

use crate::{GameType, archive::encr::EncrArchive};

pub mod encr;

pub trait Archive<'a> {
    fn extract_file(&self, path: &str) -> anyhow::Result<Cow<'a, [u8]>>;

    fn extract_file_range(
        &self,
        path: &str,
        offset: usize,
        size: usize,
    ) -> anyhow::Result<Cow<'a, [u8]>>;

    fn size(&self) -> usize;

    fn file_names(&self) -> Vec<&str>;

    fn game_type(&self) -> GameType;
}

pub fn extract_archives<'a>(
    data: &'a [u8],
    game: GameType,
) -> Result<Vec<Box<dyn Archive<'a> + 'a>>> {
    let mut result: Vec<Box<dyn Archive<'_>>> = Vec::new();

    let mut cur_offset = 0;
    while cur_offset < data.len() {
        match game {
            GameType::Hkrpg => {
                let archive = EncrArchive::new(&data[cur_offset..], game)?;
                cur_offset += archive.size();
                result.push(Box::new(archive));
            }
            other => {
                return Err(anyhow::anyhow!(
                    "unsupported game type for unpacking: {other:?} (only Hkrpg/HSR is implemented)"
                ));
            }
        }
    }

    Ok(result)
}
