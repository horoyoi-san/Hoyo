use std::{cell::RefCell, rc::Rc};

use anyhow::Result;

use crate::{
    binary_reader::BinaryReader,
    unity::{
        classes::{
            ClassIDType, FromObject, UnityObject, asset_bundle::AssetBundle, font::Font,
            text_asset::TextAsset, texture2d::Texture2D,
        },
        serialized_file::{SerializedFile, SerializedFileHeader},
        serialized_type::SerializedType,
    },
};

#[derive(Debug, Default)]
pub struct ObjectInfo {
    pub byte_start: i64,
    pub byte_size: u32,
    pub type_id: i32,
    pub class_id: i32,
    pub is_destroyed: u16,
    pub stripped: u8,
    pub path_id: i64,
    pub serialized_type: Option<Rc<RefCell<SerializedType>>>,
    pub version: [i32; 4],
    pub build_type: BuildType,
}

impl ObjectInfo {
    pub fn from_reader(r: &mut BinaryReader, sf: &SerializedFile) -> Result<ObjectInfo> {
        let mut obj = ObjectInfo::default();

        if sf.big_id != 0 {
            obj.path_id = r.read_i64()?;
        } else if sf.header.version < 14 {
            obj.path_id = r.read_i32()? as i64;
        } else {
            r.align(4)?;
            obj.path_id = r.read_i64()?;
        }

        if sf.header.version >= 22 {
            obj.byte_start = r.read_i64()?;
        } else {
            obj.byte_start = r.read_u32()? as i64;
        }

        obj.byte_start += sf.header.data_offset as i64;
        obj.byte_size = r.read_u32()?;
        obj.type_id = r.read_i32()?;

        if sf.header.version < 16 {
            obj.class_id = r.read_u16()? as i32;
            obj.serialized_type = sf
                .types
                .iter()
                .find(|v| v.borrow().class_id == obj.type_id)
                .cloned();
        } else if let Some(serialized_type) = sf.types.get(obj.type_id as usize).cloned() {
            obj.serialized_type = Some(serialized_type);
            obj.class_id = obj.serialized_type.as_ref().unwrap().borrow().class_id;
        } else {
            unreachable!("malformed object {obj:?}");
        }

        if sf.header.version < 11 {
            obj.is_destroyed = r.read_u16()?;
        }

        if sf.header.version >= 11 && sf.header.version < 17 {
            let script_type_index = r.read_i16()?;
            if let Some(serialized_type) = obj.serialized_type.as_ref() {
                serialized_type.borrow_mut().script_type_index = Some(script_type_index);
            }
        }

        if sf.header.version == 15 || sf.header.version == 16 {
            obj.stripped = r.read_u8()?;
        }

        let version_info = parse_unity_version(&sf.version);

        obj.version = version_info.0;
        obj.build_type = version_info.1;

        Ok(obj)
    }

    pub fn parse_object(
        &self,
        header: &SerializedFileHeader,
        bytes: &[u8],
    ) -> Result<Box<dyn UnityObject>> {
        let class_type = ClassIDType::try_from(self.class_id)?;

        match class_type {
            ClassIDType::Font => Ok(Box::new(Font::from_object(self, header, bytes)?)),
            ClassIDType::AssetBundle => {
                Ok(Box::new(AssetBundle::from_object(self, header, bytes)?))
            }
            ClassIDType::Texture2D => Ok(Box::new(Texture2D::from_object(self, header, bytes)?)),
            ClassIDType::TextAsset => Ok(Box::new(TextAsset::from_object(self, header, bytes)?)),
            _ => Err(anyhow::anyhow!("not impl")),
        }
    }

    pub fn parse<T: FromObject>(&self, header: &SerializedFileHeader, bytes: &[u8]) -> Result<T> {
        T::from_object(self, header, bytes)
    }
}

#[derive(Clone, PartialEq, Eq, Debug, Default)]
pub enum BuildType {
    #[default]
    Unknown,
    Alpha,
    Patch,
    Other(String),
}

impl BuildType {
    pub fn new(type_: String) -> Self {
        match type_.as_str() {
            "a" => Self::Alpha,
            "p" => Self::Patch,
            _ => Self::Other(type_),
        }
    }

    pub fn is_patch(&self) -> bool {
        &Self::Patch == self
    }
}

fn parse_unity_version(version_str: &str) -> ([i32; 4], BuildType) {
    let mut build_type = BuildType::Unknown;
    if let Some(c) = version_str.chars().find(char::is_ascii_alphabetic) {
        build_type = BuildType::new(c.to_string());
    }

    let nums: Vec<i32> = version_str
        .chars()
        .map(|c| if c.is_ascii_digit() { c } else { '.' })
        .collect::<String>()
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    (nums[..nums.len().min(4)].try_into().unwrap(), build_type)
}
