use anyhow::Result;

use crate::{
    binary_reader::{BinaryReader, ByteOrder},
    unity::{
        classes::{
            ClassIDType, FromObject, UnityObject,
            mesh::{BoneWeights4, SubMesh, VertexData},
            pptr::PPtr,
            sprite_atlas::SpriteAtlas,
            texture2d::Texture2D,
        },
        math::{Matrix4x4, RectF32, Vector2, Vector3, Vector4},
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};

#[derive(Debug)]
pub struct Sprite {
    pub name: String,
    pub rect: RectF32,
    pub offset: Vector2,
    pub border: Option<Vector4>,
    pub pixels_to_units: f32,
    pub pivot: Vector2,
    pub extrude: u8,
    pub is_polygon: bool,
    pub render_data_key: ([u8; 16], i64),
    pub atlas_tags: Vec<String>,
    pub sprite_atlas: Option<PPtr<SpriteAtlas>>,
    pub rd: SpriteRenderData,
}

impl UnityObject for Sprite {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::Sprite
    }
}

impl FromObject for Sprite {
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

        let mut border: Option<Vector4> = None;

        let mut pivot: Vector2 = Vector2 { x: 0.5, y: 0.5 };

        let mut is_polygon: bool = false;
        let mut render_data_key: ([u8; 16], i64) = ([0u8; 16], 0);
        let mut atlas_tags: Vec<String> = Vec::new();
        let mut sprite_atlas: Option<PPtr<SpriteAtlas>> = None;

        let name = br.read_aligned_string()?;
        let rect = br.read_rect_f32()?;
        let offset = br.read_vector2()?;
        if object.version[0] > 4 || (object.version[0] == 4 && object.version[1] >= 5) {
            border = Some(br.read_vector4()?);
        }

        let pixels_to_units: f32 = br.read_f32()?;

        if object.version[0] > 5
            || (object.version[0] == 5 && object.version[1] > 4)
            || (object.version[0] == 5 && object.version[1] == 4 && object.version[2] >= 2)
            || (object.version[0] == 5
                && object.version[1] == 4
                && object.version[2] == 1
                && object.build_type.is_patch()
                && object.version[3] >= 3)
        {
            pivot = br.read_vector2()?;
        }

        let extrude: u8 = br.read_u32()? as u8;
        if object.version[0] > 5 || (object.version[0] == 5 && object.version[1] >= 3) {
            is_polygon = br.read_bool()?;
            br.align(4)?;
        }

        if object.version[0] >= 2017 {
            let first = br.read_u8_array()?;
            let second = br.read_i64()?;
            render_data_key = (first, second);
            atlas_tags = br.read_string_list()?;
            sprite_atlas = Some(PPtr::from_reader(&mut br, header)?);
        }

        let rd: SpriteRenderData = SpriteRenderData::from_object_reader(&mut br, object, header)?;

        Ok(Self {
            name,
            rect,
            offset,
            border,
            pixels_to_units,
            pivot,
            extrude,
            is_polygon,
            render_data_key,
            atlas_tags,
            sprite_atlas,
            rd,
        })
    }
}

#[derive(Clone, Debug, Default)]
pub enum SpritePackingMode {
    #[default]
    Tight = 0,
    Rectangle = 1,
}

#[derive(Clone, Debug, Default)]
pub enum SpritePackingRotation {
    #[default]
    None = 0,
    FlipHorizontal = 1,
    FlipVertical = 2,
    Rotate180 = 3,
    Rotate90 = 4,
}

#[derive(Clone, Debug, Default)]
pub enum SpriteMeshType {
    #[default]
    FullRect = 0,
    Tight = 1,
}

#[derive(Clone, Debug, Default)]
pub struct SpriteSettings {
    pub raw: u32,
    pub packed: bool,
    pub packing_mode: SpritePackingMode,
    pub packing_rotation: SpritePackingRotation,
    pub mesh_type: SpriteMeshType,
}

impl SpriteSettings {
    pub fn from_reader(br: &mut BinaryReader) -> Result<Self> {
        let raw = br.read_u32()?;
        let packed = raw & 1 == 1;
        let packing_mode = match (raw >> 1) & 1 {
            0 => SpritePackingMode::Tight,
            1 => SpritePackingMode::Rectangle,
            _ => unreachable!(),
        };
        let packing_rotation = match (raw >> 2) & 0xf {
            0 => SpritePackingRotation::None,
            1 => SpritePackingRotation::FlipHorizontal,
            2 => SpritePackingRotation::FlipVertical,
            3 => SpritePackingRotation::Rotate180,
            4 => SpritePackingRotation::Rotate90,
            _ => unreachable!(),
        };
        let mesh_type = match (raw >> 6) & 1 {
            0 => SpriteMeshType::FullRect,
            1 => SpriteMeshType::Tight,
            _ => unreachable!(),
        };
        Ok(Self {
            raw,
            packed,
            packing_mode,
            packing_rotation,
            mesh_type,
        })
    }
}

#[derive(Debug)]
pub struct SecondarySpriteTexture {
    pub texture: PPtr<Texture2D>,
    pub name: String,
}

impl SecondarySpriteTexture {
    pub fn from_reader(br: &mut BinaryReader, header: &SerializedFileHeader) -> Result<Self> {
        let texture = PPtr::from_reader(br, header)?;
        let name = br.read_string_util_null()?;
        Ok(Self { texture, name })
    }
}

#[derive(Debug)]
pub struct SpriteRenderData {
    pub texture: PPtr<Texture2D>,
    pub alpha_texture: Option<PPtr<Texture2D>>,
    pub secondary_textures: Vec<SecondarySpriteTexture>,
    pub sub_meshes: Vec<SubMesh>,
    pub index_buffer: Vec<u8>,
    pub vertex_data: VertexData,
    pub vertices: Vec<SpriteVertex>,
    pub indices: Vec<u16>,
    pub bindpose: Vec<Matrix4x4>,
    pub source_skin: Vec<BoneWeights4>,
    pub texture_rect: RectF32,
    pub texture_rect_offset: Vector2,
    pub atlas_rect_offset: Vector2,
    pub setting_raw: SpriteSettings,
    pub uv_transform: Vector4,
    pub downscale_multiplier: f32,
}

impl SpriteRenderData {
    pub fn from_object_reader(
        br: &mut BinaryReader,
        object: &ObjectInfo,
        header: &SerializedFileHeader,
    ) -> Result<Self> {
        let mut result = Self {
            texture: PPtr::from_reader(br, header)?,
            alpha_texture: None,
            secondary_textures: Vec::new(),
            sub_meshes: Vec::new(),
            index_buffer: Vec::new(),
            vertex_data: VertexData::default(),
            vertices: Vec::new(),
            indices: Vec::new(),
            bindpose: Vec::new(),
            source_skin: Vec::new(),
            texture_rect: RectF32::default(),
            texture_rect_offset: Vector2::default(),
            atlas_rect_offset: Vector2::default(),
            setting_raw: SpriteSettings::default(),
            uv_transform: Vector4::default(),
            downscale_multiplier: 1.0,
        };

        if object.version[0] > 5 || (object.version[0] == 5 && object.version[1] >= 2) {
            result.alpha_texture = Some(PPtr::from_reader(br, header)?);
        }

        if object.version[0] >= 2019 {
            let size = br.read_i32()?;
            for _ in 0..size {
                result
                    .secondary_textures
                    .push(SecondarySpriteTexture::from_reader(br, header)?);
            }
        }

        if object.version[0] > 5 || (object.version[0] == 5 && object.version[1] >= 6) {
            let size = br.read_i32()?;
            for _ in 0..size {
                result
                    .sub_meshes
                    .push(SubMesh::from_object_reader(br, object)?);
            }
            let size = br.read_i32()?;
            result.index_buffer = br.read_u8_list(size as usize)?;
            br.align(4)?;
            result.vertex_data = VertexData::from_object_reader(br, object)?;
        } else {
            let size = br.read_i32()?;
            for _ in 0..size {
                result
                    .vertices
                    .push(SpriteVertex::from_object_reader(br, object)?);
            }
            let size = br.read_i32()?;
            result.indices = br.read_u16_list(size as usize)?;
            br.align(4)?;
        }

        if object.version[0] > 2018 {
            let size = br.read_i32()?;
            result.bindpose = br.read_matrix4x4_list(size as usize)?;
            if object.version[0] == 2018 && object.version[1] < 2 {
                let size = br.read_i32()? as usize;
                result.source_skin = Vec::with_capacity(size);
                for _ in 0..size {
                    result.source_skin.push(BoneWeights4::from_reader(br)?);
                }
            }
        }

        result.texture_rect = br.read_rect_f32()?;
        result.texture_rect_offset = br.read_vector2()?;

        if object.version[0] > 5 || (object.version[0] == 5 && object.version[1] >= 6) {
            result.atlas_rect_offset = br.read_vector2()?;
        }

        result.setting_raw = SpriteSettings::from_reader(br)?;

        if object.version[0] > 4 || (object.version[0] == 4 && object.version[1] >= 5) {
            result.uv_transform = br.read_vector4()?;
        }

        if object.version[0] >= 2017 {
            result.downscale_multiplier = br.read_f32()?;
        }

        Ok(result)
    }

    pub fn get_triangles(&self) -> Result<Vec<[Vector2; 3]>> {
        let mut result = Vec::new();
        if !self.vertices.is_empty() {
            let vertices: Vec<_> = self
                .vertices
                .iter()
                .map(|i| Vector2 {
                    x: i.pos.x,
                    y: i.pos.y,
                })
                .collect();
            let triangle_count = self.indices.len() / 3;
            for i in 0..triangle_count {
                let first = self.indices[3 * i] as usize;
                let second = self.indices[3 * i + 1] as usize;
                let third = self.indices[3 * i + 2] as usize;
                result.push([vertices[first], vertices[second], vertices[third]]);
            }
        } else {
            let channel = &self.vertex_data.channels[0];
            let stream = &self.vertex_data.streams[channel.stream as usize];
            let mut vertex_r = BinaryReader::new(&self.vertex_data.data_size, ByteOrder::Little);
            let mut index_r = BinaryReader::new(&self.index_buffer, ByteOrder::Little);
            for sub_mesh in &self.sub_meshes {
                let mut offset = stream.offset as usize;
                offset += sub_mesh.first_vertex as usize * stream.stride as usize;
                offset += channel.offset as usize;
                vertex_r.set_offset(offset)?;
                let mut vertices = Vec::with_capacity(sub_mesh.vertex_count as usize);
                for _ in 0..sub_mesh.vertex_count {
                    let v3 = vertex_r.read_vector3()?;
                    vertices.push(Vector2 { x: v3.x, y: v3.y });
                    let offset = vertex_r.get_offset();
                    vertex_r.set_offset(offset + stream.stride as usize - 12)?;
                }
                index_r.set_offset(sub_mesh.first_bytes as usize)?;
                let triangle_count = sub_mesh.index_count as usize / 3;
                for _ in 0..triangle_count {
                    let first = index_r.read_u16()? - sub_mesh.first_bytes as u16;
                    let second = index_r.read_u16()? - sub_mesh.first_bytes as u16;
                    let third = index_r.read_u16()? - sub_mesh.first_bytes as u16;
                    result.push([
                        vertices[first as usize],
                        vertices[second as usize],
                        vertices[third as usize],
                    ]);
                }
            }
        }
        Ok(result)
    }
}

#[derive(Default, Debug)]
pub struct SpriteVertex {
    pub pos: Vector3,
    pub uv: Vector2,
}

impl SpriteVertex {
    pub fn from_object_reader(br: &mut BinaryReader, object: &ObjectInfo) -> Result<Self> {
        let mut result = Self::default();
        let version = object.version;
        result.pos = br.read_vector3()?;
        if version[0] < 4 || (version[0] == 4 && version[1] <= 3) {
            result.uv = br.read_vector2()?;
        }
        Ok(result)
    }
}
