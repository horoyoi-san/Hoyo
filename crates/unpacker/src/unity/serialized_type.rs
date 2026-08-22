use anyhow::Result;

use crate::{
    binary_reader::BinaryReader,
    unity::{serialized_file::SerializedFile, type_tree::TypeTree},
};

#[derive(Debug, Default)]
pub struct SerializedType {
    pub class_id: i32,
    pub is_stripped_type: bool,
    pub script_type_index: Option<i16>,
    pub type_tree: TypeTree,
    pub script_id: [u8; 16],
    pub old_type_hash: [u8; 16],
    pub type_dependencies: Vec<i32>,
    pub klass_name: String,
    pub name_space: String,
    pub asm_name: String,
}

impl SerializedType {
    pub fn from_reader(
        r: &mut BinaryReader,
        file: &SerializedFile,
        is_ref_type: bool,
    ) -> Result<Self> {
        let mut res = SerializedType {
            class_id: r.read_i32()?,
            ..Default::default()
        };

        // IsGIGroup()

        if file.header.version >= 16 {
            res.is_stripped_type = r.read_bool()?;
        }

        if file.header.version >= 17 {
            res.script_type_index = Some(r.read_i16()?);
        }

        if file.header.version >= 13 {
            if (is_ref_type && res.script_type_index.is_some())
                || (file.header.version < 16 && res.class_id < 0)
                || (file.header.version >= 16 && res.class_id == 114)
            {
                res.script_id = r.read_u8_array()?;
            }
            res.old_type_hash = r.read_u8_array()?;
        }

        if file.enable_type_tree {
            if file.header.version >= 12 || file.header.version == 10 {
                TypeTree::read_from_blob_reader(&mut res.type_tree, r, &file.header)?;
            } else {
                TypeTree::read_from_reader(&mut res.type_tree, r, &file.header, 0)?;
            }

            if file.header.version >= 21 {
                if is_ref_type {
                    res.klass_name = r.read_string_util_null()?;
                    res.name_space = r.read_string_util_null()?;
                    res.asm_name = r.read_string_util_null()?;
                } else {
                    let length = r.read_i32()? as usize;
                    res.type_dependencies = r.read_i32_list(length)?;
                }
            }
        }

        Ok(res)
    }
}
