use crate::{
    binary_reader::BinaryReader,
    unity::{
        classes::{
            ClassIDType, FromObject, UnityObject,
            pptr::PPtr,
            sprite::{SecondarySpriteTexture, Sprite, SpriteSettings},
            texture2d::Texture2D,
        },
        math::{RectF32, Vector2, Vector4},
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};

#[derive(Debug)]
pub struct SpriteAtlas {
    pub name: String,
    pub packed_sprites: Vec<PPtr<Sprite>>,
    pub packed_sprite_names_to_index: Vec<String>,
    pub render_data_map: Vec<(([u8; 16], i64), SpriteAtlasData)>,
    pub tag: String,
    pub is_variant: bool,
}

impl UnityObject for SpriteAtlas {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::SpriteAtlas
    }
}

impl FromObject for SpriteAtlas {
    fn from_object(
        obj: &ObjectInfo,
        header: &SerializedFileHeader,
        bytes: &[u8],
    ) -> anyhow::Result<Self> {
        let mut br = BinaryReader::new(
            &bytes[obj.byte_start as usize..(obj.byte_start + obj.byte_size as i64) as usize],
            header.endian,
        );

        let name = br.read_aligned_string()?;

        let packed_sprite_size = br.read_i32()?;
        let mut packed_sprites = Vec::with_capacity(packed_sprite_size as usize);
        for _ in 0..packed_sprite_size {
            packed_sprites.push(PPtr::<Sprite>::from_reader(&mut br, header)?);
        }

        let packed_sprite_names_to_index = br.read_string_list()?;

        let render_data_map_size = br.read_i32()?;
        let mut render_data_map = Vec::with_capacity(render_data_map_size as usize);
        for _ in 0..render_data_map_size {
            let first = br.read_u8_array::<16>()?;
            let second = br.read_i64()?;
            let value = SpriteAtlasData::from_object_reader(&mut br, obj, header)?;

            render_data_map.push(((first, second), value));
        }

        let tag = br.read_aligned_string()?;
        let is_variant = br.read_bool()?;

        Ok(Self {
            name,
            packed_sprites,
            packed_sprite_names_to_index,
            render_data_map,
            tag,
            is_variant,
        })
    }
}

#[derive(Debug)]
pub struct SpriteAtlasData {
    pub texture: PPtr<Texture2D>,
    pub alpha_texture: PPtr<Texture2D>,
    pub texture_rect: RectF32,
    pub texture_rect_offset: Vector2,
    pub atlas_rect_offset: Vector2,
    pub uv_transform: Vector4,
    pub downscale_multiplier: f32,
    pub settings_raw: SpriteSettings,
    pub secondary_textures: Vec<SecondarySpriteTexture>,
}

impl SpriteAtlasData {
    fn from_object_reader(
        br: &mut BinaryReader,
        object: &ObjectInfo,
        header: &SerializedFileHeader,
    ) -> anyhow::Result<Self> {
        let texture = PPtr::from_reader(br, header)?;
        let alpha_texture = PPtr::from_reader(br, header)?;
        let texture_rect = br.read_rect_f32()?;
        let texture_rect_offset = br.read_vector2()?;
        let atlas_rect_offset =
            if object.version[0] > 2017 || (object.version[0] == 2017 && object.version[1] >= 2) {
                br.read_vector2()?
            } else {
                Vector2::default()
            };
        let uv_transform = br.read_vector4()?;
        let downscale_multiplier = br.read_f32()?;
        let settings_raw = SpriteSettings::from_reader(br)?;
        let mut secondary_textures = Vec::new();
        if object.version[0] > 2020 || (object.version[0] == 2020 && object.version[1] >= 2) {
            for _ in 0..br.read_i32()? {
                secondary_textures.push(SecondarySpriteTexture::from_reader(br, header)?);
            }
            br.align(4)?;
        }

        Ok(Self {
            texture,
            alpha_texture,
            texture_rect,
            texture_rect_offset,
            atlas_rect_offset,
            uv_transform,
            downscale_multiplier,
            settings_raw,
            secondary_textures,
        })
    }
}
