use std::io::SeekFrom;

use crate::bytes::{ByteHash16, FromBytes};
use byteorder::{LE, ReadBytesExt};

#[derive(Debug)]
pub struct MiniAsset {
    pub revision_id: u32,
    pub design_index_hash: ByteHash16,
}

impl FromBytes for MiniAsset {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        r.seek(SeekFrom::Current(6 * 4))?;
        Ok(Self {
            revision_id: r.read_u32::<LE>()?,
            design_index_hash: ByteHash16::from_bytes(r)?,
        })
    }
}
