use anyhow::Result;

use crate::{
    binary_reader::BinaryReader,
    unity::{
        classes::{ClassIDType, FromObject, UnityObject, pptr::PPtr},
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};

#[derive(Debug)]
pub struct AssetBundle {
    pub name: String,
    pub preload_table: Vec<PPtr<ObjectInfo>>,
    pub containers: Vec<(String, AssetInfo)>,
}

impl UnityObject for AssetBundle {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::AssetBundle
    }
}

impl FromObject for AssetBundle {
    fn from_object(obj: &ObjectInfo, header: &SerializedFileHeader, bytes: &[u8]) -> Result<Self> {
        let mut br = BinaryReader::new(
            &bytes[obj.byte_start as usize..(obj.byte_start + obj.byte_size as i64) as usize],
            header.endian,
        );
        let name = br.read_aligned_string()?;

        let preload_table_size = br.read_i32()?;
        let mut preload_table = Vec::with_capacity(preload_table_size as usize);
        for _ in 0..preload_table_size {
            preload_table.push(PPtr::from_reader(&mut br, header)?);
        }

        let container_size = br.read_i32()?;
        let mut containers = Vec::with_capacity(container_size as usize);
        for _ in 0..container_size {
            containers.push((
                br.read_aligned_string()?,
                AssetInfo::from_reader(&mut br, header)?,
            ));
        }

        Ok(Self {
            name,
            preload_table,
            containers,
        })
    }
}

#[derive(Debug, Default)]
pub struct AssetInfo {
    pub preload_index: i32,
    pub preload_size: i32,
    pub asset: PPtr<ObjectInfo>,
}

impl AssetInfo {
    fn from_reader(br: &mut BinaryReader, header: &SerializedFileHeader) -> Result<Self> {
        Ok(Self {
            preload_index: br.read_i32()?,
            preload_size: br.read_i32()?,
            asset: PPtr::from_reader(br, header)?,
        })
    }
}
