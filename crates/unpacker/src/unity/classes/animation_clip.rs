use anyhow::Result;

use crate::{
    binary_reader::BinaryReader,
    unity::{
        classes::{ClassIDType, FromObject, UnityObject},
        math::Vector3,
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};

#[derive(Default, Debug)]
pub struct AABB {
    pub center: Vector3,
    pub extent: Vector3,
}

impl AABB {
    pub fn from_reader(br: &mut BinaryReader) -> Result<Self> {
        let center = br.read_vector3()?;
        let extent = br.read_vector3()?;
        Ok(Self { center, extent })
    }
}

impl UnityObject for AABB {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::AnimationClip
    }
}

impl FromObject for AABB {
    fn from_object(
        object: &ObjectInfo,
        header: &SerializedFileHeader,
        bytes: &[u8],
    ) -> Result<Self> {
        let mut br = BinaryReader::new(
            &bytes[object.byte_start as usize
                ..(object.byte_start + object.byte_size as i64) as usize],
            header.endian,
        );

        Self::from_reader(&mut br)
    }
}
