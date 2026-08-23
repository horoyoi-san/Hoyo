use std::path::Path;

use anyhow::Result;

use crate::{
    archive::Archive,
    binary_reader::BinaryReader,
    unity::{
        classes::{ClassIDType, FromObject, SaveableObject, UnityObject},
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};

pub struct TextAsset {
    pub name: String,
    pub script: Vec<u8>,
    pub path_id: i64,
}

impl UnityObject for TextAsset {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::TextAsset
    }

    fn as_saveable(&self) -> Option<&dyn SaveableObject> {
        Some(self)
    }
}

impl FromObject for TextAsset {
    fn from_object(
        object: &ObjectInfo,
        header: &SerializedFileHeader,
        bytes: &[u8],
    ) -> anyhow::Result<Self> {
        let mut r = BinaryReader::new(
            &bytes[object.byte_start as usize
                ..(object.byte_start + object.byte_size as i64) as usize],
            header.endian,
        );

        let name = r.read_aligned_string()?;
        let length = r.read_i32()?;
        let script = r.read_u8_list(length as usize)?;

        Ok(Self {
            name,
            script,
            path_id: object.path_id,
        })
    }
}

impl SaveableObject for TextAsset {
    fn name(&self) -> &'_ str {
        &self.name
    }

    fn save_to_file(
        &self,
        _archive: &dyn Archive,
        container_path: Option<&str>,
        out_dir: &Path,
    ) -> Result<()> {
        std::fs::write(self.save_path(container_path, out_dir), &self.script)?;
        Ok(())
    }
}
