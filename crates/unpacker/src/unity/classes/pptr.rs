use std::marker::PhantomData;

use anyhow::Result;

use crate::{binary_reader::BinaryReader, unity::serialized_file::SerializedFileHeader};

#[derive(Debug, Default)]
pub struct PPtr<T> {
    pub file_id: i32,
    pub path_id: i64,
    underlying: PhantomData<T>,
}

impl<T> PPtr<T> {
    pub fn from_reader(br: &mut BinaryReader, header: &SerializedFileHeader) -> Result<Self> {
        Ok(Self {
            file_id: br.read_i32()?,
            path_id: {
                if header.version < 14 {
                    br.read_i32()? as i64
                } else {
                    br.read_i64()?
                }
            },
            underlying: PhantomData::<T>,
        })
    }
}
