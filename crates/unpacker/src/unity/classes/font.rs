use anyhow::Result;
use std::path::Path;

use crate::{
    archive::Archive,
    binary_reader::BinaryReader,
    unity::{
        classes::{ClassIDType, FromObject, SaveableObject, UnityObject, pptr::PPtr},
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};

#[derive(Debug, Default)]
pub struct Font {
    pub name: String,
    pub line_spacing: f32,
    pub default_material: Option<PPtr<()>>,
    pub font_size: f32,
    pub texture: Option<PPtr<()>>,
    pub ascii_start_offset: i32,
    pub tracking: f32,
    pub character_spacing: i32,
    pub character_padding: i32,
    pub convert_case: i32,
    pub pixel_scale: f32,
    pub font_data: Vec<u8>,
}

impl UnityObject for Font {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::Font
    }

    fn as_saveable(&self) -> Option<&dyn SaveableObject> {
        Some(self)
    }
}

impl FromObject for Font {
    fn from_object(
        object: &ObjectInfo,
        header: &SerializedFileHeader,
        bytes: &[u8],
    ) -> anyhow::Result<Self> {
        let mut reader = BinaryReader::new(
            &bytes[object.byte_start as usize
                ..(object.byte_start + object.byte_size as i64) as usize],
            header.endian,
        );

        let mut font = Font {
            name: reader.read_aligned_string()?,
            ..Default::default()
        };

        if (object.version[0] == 5 && object.version[1] >= 5) || object.version[0] > 5 {
            font.line_spacing = reader.read_f32()?;
            font.default_material = Some(PPtr::<()>::from_reader(&mut reader, header)?);
            font.font_size = reader.read_f32()?;
            font.texture = Some(PPtr::<()>::from_reader(&mut reader, header)?);
            font.ascii_start_offset = reader.read_i32()?;
            font.tracking = reader.read_f32()?;
            font.character_spacing = reader.read_i32()?;
            font.character_padding = reader.read_i32()?;
            font.convert_case = reader.read_i32()?;

            let character_rects_size = reader.read_i32()?;
            for _ in 0..character_rects_size {
                reader.set_offset(reader.get_offset() + 44)?;
            }

            let kerning_values_size = reader.read_i32()?;
            for _ in 0..kerning_values_size {
                reader.set_offset(reader.get_offset() + 8)?;
            }

            font.pixel_scale = reader.read_f32()?;

            let font_data_size = reader.read_i32()?;
            if font_data_size > 0 {
                font.font_data = reader.read_u8_list(font_data_size as usize)?;
            }
        } else {
            font.ascii_start_offset = reader.read_i32()?;

            if object.version[0] <= 3 {
                let _font_count_x = reader.read_i32()?;
                let _font_count_y = reader.read_i32()?;
            }

            let _kerning = reader.read_f32()?;
            font.line_spacing = reader.read_f32()?;

            if object.version[0] <= 3 {
                let per_character_kerning_size = reader.read_i32()?;
                for _ in 0..per_character_kerning_size {
                    let _first = reader.read_i32()?;
                    let _second = reader.read_f32()?;
                }
            } else {
                font.character_spacing = reader.read_i32()?;
                font.character_padding = reader.read_i32()?;
            }

            font.convert_case = reader.read_i32()?;
            font.default_material = Some(PPtr::<()>::from_reader(&mut reader, header)?);

            let character_rects_size = reader.read_i32()?;
            for _ in 0..character_rects_size {
                let _index = reader.read_i32()?;
                let _uv_x = reader.read_f32()?;
                let _uv_y = reader.read_f32()?;
                let _uv_width = reader.read_f32()?;
                let _uv_height = reader.read_f32()?;
                let _vert_x = reader.read_f32()?;
                let _vert_y = reader.read_f32()?;
                let _vert_width = reader.read_f32()?;
                let _vert_height = reader.read_f32()?;
                let _width = reader.read_f32()?;

                if object.version[0] >= 4 {
                    let _flipped = reader.read_bool()?;
                    reader.align(4)?;
                }
            }

            font.texture = Some(PPtr::<()>::from_reader(&mut reader, header)?);

            let kerning_values_size = reader.read_i32()?;
            for _ in 0..kerning_values_size {
                let _pair_first = reader.read_i16()?;
                let _pair_second = reader.read_i16()?;
                let _value = reader.read_f32()?;
            }

            if object.version[0] <= 3 {
                let _grid_font = reader.read_bool()?;
                reader.align(4)?;
            } else {
                font.pixel_scale = reader.read_f32()?;
            }

            let font_data_size = reader.read_i32()?;
            if font_data_size > 0 {
                font.font_data = reader.read_u8_list(font_data_size as usize)?;
            }
        }

        Ok(font)
    }
}

impl SaveableObject for Font {
    fn name(&self) -> &'_ str {
        &self.name
    }

    fn save_to_file(
        &self,
        _archive: &dyn Archive,
        container_path: Option<&str>,
        out_dir: &Path,
    ) -> Result<()> {
        std::fs::write(self.save_path(container_path, out_dir), &self.font_data)?;
        Ok(())
    }
}
