use crate::{
    GameType,
    archive::Archive,
    binary_reader::BinaryReader,
    unity::{
        classes::{ClassIDType, FromObject, SaveableObject, UnityObject},
        object::ObjectInfo,
        serialized_file::SerializedFileHeader,
    },
};
use anyhow::Result;
use image::{ImageBuffer, Rgba, RgbaImage};
use num_enum::FromPrimitive;
use std::{fmt::Display, path::Path};
use texture_decoder::implements::{
    ARGB32, ARGB4444, Alpha8, BGRA32, DXT1, DXT5, R8, R16, RFloat, RG16, RGB9e5Float, RGB24,
    RGB565, RGBA32, RGBA4444, RGBAFloat, RGBAHalf, RGFloat, RGHalf, RHalf, YUY2,
};
use texture_decoder::{ImageSize, Texture2DDecoder};

#[derive(Default, Debug)]
pub struct Texture2D {
    pub path_id: i64,
    pub name: String,
    pub forced_fallback_format: i32,
    pub downscale_fallback: bool,
    pub width: i32,
    pub height: i32,
    pub complete_image_size: i32,
    pub format: TextureFormat,
    pub mip_map: bool,
    pub mip_count: i32,
    pub is_read_able: bool,
    pub image_count: i32,
    pub texture_dimension: i32,
    pub light_map_format: i32,
    pub color_space: i32,
    pub size: i32,
    pub stream_info: StreamingInfo,
    pub texture_setting: GLTextureSettings,
    pub embedded_data: Vec<u8>,
}

impl UnityObject for Texture2D {
    fn class_id(&self) -> ClassIDType {
        ClassIDType::Texture2D
    }

    fn as_saveable(&self) -> Option<&dyn SaveableObject> {
        Some(self)
    }
}

impl FromObject for Texture2D {
    fn from_object(
        object: &ObjectInfo,
        header: &SerializedFileHeader,
        bytes: &[u8],
    ) -> Result<Self> {
        let mut r = BinaryReader::new(
            &bytes[object.byte_start as usize
                ..(object.byte_start + object.byte_size as i64) as usize],
            header.endian,
        );

        let mut result = Self {
            path_id: object.path_id,
            name: r.read_aligned_string()?,
            ..Self::default()
        };

        if object.version[0] > 2017 || (object.version[0] == 2017 && object.version[1] >= 3) {
            result.forced_fallback_format = r.read_i32()?;
            result.downscale_fallback = r.read_bool()?;
            if object.version[0] > 2020 || (object.version[0] == 2020 && object.version[1] >= 2) {
                let _is_alpha_channel_optional = r.read_bool()?;
            }
            r.align(4)?;
        }

        result.width = r.read_i32()?;
        result.height = r.read_i32()?;
        result.complete_image_size = r.read_i32()?;

        if object.version[0] >= 2020 {
            let _mips_stripped = r.read_i32()?;
        }

        result.format = TextureFormat::from(r.read_i32()?);

        let mut _mip_map = false;
        if object.version[0] < 5 || (object.version[0] == 5 && object.version[1] < 2) {
            _mip_map = r.read_bool()?;
        } else {
            result.mip_count = r.read_i32()?;
        }

        if object.version[0] > 2 || (object.version[0] == 2 && object.version[1] >= 6) {
            result.is_read_able = r.read_bool()?;
            if header.game_type == GameType::Hk4e && has_gnf_tex_or_external_mip_offset(object) {
                let _is_gnf_texture = r.read_bool()?;
            }
        }

        if object.version[0] >= 2020 || header.game_type == GameType::Nap {
            let _is_pre_processed = r.read_bool()?;
        }

        if object.version[0] > 2019 || (object.version[0] == 2019 && object.version[1] >= 3) {
            let _is_ignore_master_texture_limit = r.read_bool()?;
        }

        if object.version[0] >= 2022 && object.version[1] >= 2 {
            r.align(4)?;
            let _mipmap_limit_group_name = r.read_aligned_string();
        }

        if object.version[0] >= 3
            && (object.version[0] < 5 || (object.version[0] == 5 && object.version[1] <= 4))
        {
            let _read_allowed = r.read_bool()?;
        }

        if object.version[0] > 2018 || (object.version[0] == 2018 && object.version[1] >= 2) {
            let _streaming_mip_maps = r.read_bool()?;
        }

        r.align(4)?;

        if header.game_type == GameType::Hk4e && has_gnf_tex_or_external_mip_offset(object) {
            let _texture_group = r.read_i32()?;
        }

        if object.version[0] > 2018 || (object.version[0] == 2018 && object.version[1] >= 2) {
            let _streaming_mip_maps_priority = r.read_i32()?;
        }

        if header.game_type == GameType::Nap {
            let _is_compressed = r.read_bool()?;
            r.align(4)?;
        }

        result.image_count = r.read_i32()?;
        result.texture_dimension = r.read_i32()?;
        result.texture_setting = GLTextureSettings::from_object_reader(&mut r, object)?;

        if object.version[0] >= 3 {
            result.light_map_format = r.read_i32()?;
        }

        if object.version[0] > 3 || (object.version[0] == 3 && object.version[1] >= 5) {
            result.color_space = r.read_i32()?;
        }

        if object.version[0] > 2020 || (object.version[0] == 2020 && object.version[1] >= 2) {
            let length = r.read_i32()?;
            let _platform_blob = r.read_u8_slice(length as usize)?;
            r.align(4)?;
        }

        result.size = r.read_i32()?;
        if result.size == 0
            && ((object.version[0] == 5 && object.version[1] >= 3) || object.version[0] > 5)
        {
            if header.game_type == GameType::Hk4e && has_gnf_tex_or_external_mip_offset(object) {
                let _external_mip_relative_index = r.read_u32()?;
            }

            if header.game_type == GameType::Nap {
                let _external_mip_relative_index = r.read_u32()?;
            }

            result.stream_info = StreamingInfo::from_object_reader(&mut r, object)?;
        }

        if result.stream_info.path.is_empty() {
            result.embedded_data = r.read_u8_list(result.size as usize)?;
        }

        Ok(result)
    }
}

impl SaveableObject for Texture2D {
    fn name(&self) -> &'_ str {
        &self.name
    }

    fn save_to_file(
        &self,
        archive: &dyn Archive,
        container_path: Option<&str>,
        out_dir: &Path,
    ) -> Result<()> {
        let data = if !self.stream_info.path.is_empty()
            && let Some(name) = self.stream_info.path.split('/').next_back()
        {
            &archive
                .extract_file_range(
                    name,
                    self.stream_info.offset as usize,
                    self.stream_info.size as usize,
                )?
                .into_owned()
        } else {
            &self.embedded_data
        };

        let rgba = self.decode_image(data)?;

        let mut save_path = self.save_path(container_path, out_dir);

        // TODO: should determine based on texture format. For now, just force as PNG
        if save_path.extension().is_none() {
            save_path.set_extension("png");
        }

        // `image.save()` defaults to Fast compression but an *adaptive* per-scanline
        // filter search, which is a real chunk of the encode cost on a bulk export.
        // Fast + NoFilter is markedly quicker for a tiny file-size cost.
        use image::ImageEncoder as _;
        let file = std::fs::File::create(&save_path)?;
        let writer = std::io::BufWriter::new(file);
        image::codecs::png::PngEncoder::new_with_quality(
            writer,
            image::codecs::png::CompressionType::Fast,
            image::codecs::png::FilterType::NoFilter,
        )
        .write_image(
            rgba.as_raw(),
            rgba.width(),
            rgba.height(),
            image::ExtendedColorType::Rgba8,
        )?;

        Ok(())
    }
}

impl Texture2D {
    pub fn decode_image(&self, data: &[u8]) -> Result<RgbaImage> {
        let width = self.width;
        let height = self.height;

        if width <= 0 || height <= 0 {
            return Ok(RgbaImage::default());
        }

        // Guard against malformed dimensions. The decoders compute the output buffer
        // size in `u32` (`width * height * 4`), which OVERFLOWS for very large dims →
        // an undersized buffer → out-of-bounds writes in the unsafe SIMD paths →
        // SEGFAULT (uncatchable). Huge dims also OOM the process. Real SpriteOutput
        // textures are small; reject anything implausible and let the caller skip it.
        if width > 8192 || height > 8192 {
            return Err(anyhow::anyhow!(
                "suspicious texture size {width}x{height} (path_id {}); skipping",
                self.path_id
            ));
        }

        let format = self.format;

        let size = ImageSize::new(width as usize, height as usize);

        let mut result: ImageBuffer<Rgba<u8>, Vec<u8>> =
            ImageBuffer::new(width as u32, height as u32);

        let image = result.as_mut_ptr();
        let image = image.cast::<u32>();

        let image = unsafe { std::slice::from_raw_parts_mut(image, (width * height) as usize) };

        match format {
            TextureFormat::ETC2_RGBA8 => unsafe {
                texture2ddecoder::decode_etc2_rgba8(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::ETC2_RGB => unsafe {
                texture2ddecoder::decode_etc2_rgb(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::ETC_RGB4 => unsafe {
                texture2ddecoder::decode_etc1(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::ATC_RGB4 => unsafe {
                texture2ddecoder::decode_atc_rgb4(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::ATC_RGBA8 => unsafe {
                texture2ddecoder::decode_atc_rgba8(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::ASTC_RGB_4x4 => {
                texture2ddecoder::decode_astc_4_4(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGB_5x5 => {
                texture2ddecoder::decode_astc_5_5(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGB_6x6 => {
                texture2ddecoder::decode_astc_6_6(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGB_8x8 => {
                texture2ddecoder::decode_astc_8_8(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGB_10x10 => {
                texture2ddecoder::decode_astc_10_10(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGB_12x12 => {
                texture2ddecoder::decode_astc_12_12(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGBA_4x4 => {
                texture2ddecoder::decode_astc_4_4(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGBA_5x5 => {
                texture2ddecoder::decode_astc_5_5(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGBA_6x6 => {
                texture2ddecoder::decode_astc_6_6(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGBA_8x8 => {
                texture2ddecoder::decode_astc_8_8(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGBA_10x10 => {
                texture2ddecoder::decode_astc_10_10(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::ASTC_RGBA_12x12 => {
                texture2ddecoder::decode_astc_12_12(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::Alpha8 => {
                Texture2DDecoder::decode(Alpha8, &size, data, true).map_err(Into::into)
            }
            TextureFormat::ARGB32 => {
                let img = Texture2DDecoder::decode(ARGB32, &size, data, true)?;
                Ok(img)
            }
            TextureFormat::ARGB4444 => {
                let img = Texture2DDecoder::decode(ARGB4444, &size, data, true)?;
                Ok(img)
            }
            TextureFormat::BGRA32 => {
                let img = Texture2DDecoder::decode(BGRA32, &size, data, true)?;
                Ok(img)
            }
            TextureFormat::R8 => {
                Texture2DDecoder::decode(R8, &size, data, true).map_err(Into::into)
            }
            TextureFormat::R16 => {
                Texture2DDecoder::decode(R16, &size, data, true).map_err(Into::into)
            }
            TextureFormat::RFloat => {
                Texture2DDecoder::decode(RFloat, &size, data, true).map_err(Into::into)
            }
            TextureFormat::RHalf => {
                Texture2DDecoder::decode(RHalf, &size, data, true).map_err(Into::into)
            }
            TextureFormat::RG16 => {
                Texture2DDecoder::decode(RG16, &size, data, true).map_err(Into::into)
            }
            // TextureFormat::RG32=>{
            //     Texture2DDecoder::texture_decode_image(RG32,&size,&self.data,true).map_err(Into::into)
            // }
            TextureFormat::RGFloat => {
                Texture2DDecoder::decode(RGFloat, &size, data, true).map_err(Into::into)
            }
            TextureFormat::RGHalf => {
                Texture2DDecoder::decode(RGHalf, &size, data, true).map_err(Into::into)
            }

            TextureFormat::RGB24 => {
                let img = Texture2DDecoder::decode(RGB24, &size, data, true)?;
                Ok(img)
            }
            TextureFormat::RGB565 => {
                let img = Texture2DDecoder::decode(RGB565, &size, data, true)?;
                Ok(img)
            }
            TextureFormat::RGB9e5Float => {
                Texture2DDecoder::decode(RGB9e5Float, &size, data, true).map_err(Into::into)
            }
            // TextureFormat::RGB48=>{
            //     Texture2DDecoder::texture_decode_image::<RGB48>(&size,&self.data,true).map_err(Into::into)
            // }
            TextureFormat::RGBA32 => {
                let img = Texture2DDecoder::decode(RGBA32, &size, data, true)?;
                Ok(img)
            }
            // TextureFormat::RGBA64=>{
            //     Texture2DDecoder::texture_decode_image::<RGBA64>(&size,&self.data,true).map_err(Into::into)
            // }
            TextureFormat::RGBA4444 => {
                let img = Texture2DDecoder::decode(RGBA4444, &size, data, true)?;
                Ok(img)
            }
            TextureFormat::RGBAFloat => {
                Texture2DDecoder::decode(RGBAFloat, &size, data, true).map_err(Into::into)
            }
            TextureFormat::RGBAHalf => {
                Texture2DDecoder::decode(RGBAHalf, &size, data, true).map_err(Into::into)
            }
            TextureFormat::YUY2 => {
                Texture2DDecoder::decode(YUY2, &size, data, true).map_err(Into::into)
            }
            TextureFormat::BC7 => unsafe {
                texture2ddecoder::decode_bc7(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::DXT5 => {
                DXT5::decode(data, width as u32, height as u32).map_err(|e| anyhow::anyhow!(e))
            }
            TextureFormat::DXT1 => {
                DXT1::decode(data, width as u32, height as u32).map_err(|e| anyhow::anyhow!(e))
            }
            TextureFormat::BC4 => unsafe {
                texture2ddecoder::decode_bc4(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            },
            TextureFormat::BC6H => {
                texture2ddecoder::decode_bc6(data, width as usize, height as usize, image, false)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            TextureFormat::DXT1Crunched | TextureFormat::DXT5Crunched => {
                texture2ddecoder::decode_unity_crunch(data, width as usize, height as usize, image)
                    .map_err(|e| anyhow::anyhow!(e))?;
                Ok(result)
            }
            format => Err(anyhow::anyhow!("unimplemented format {format:?}")),
        }
    }
}

#[allow(non_camel_case_types, non_upper_case_globals)]
#[derive(Debug, Eq, PartialEq, FromPrimitive, Clone, Copy, Default, Hash)]
#[repr(i32)]
#[non_exhaustive]
pub enum TextureFormat {
    #[default]
    UnknownType = -1,
    Alpha8 = 1,
    ARGB4444,
    RGB24,
    RGBA32,
    ARGB32,
    RGB565 = 7,
    R16 = 9,
    DXT1,
    DXT5 = 12,
    RGBA4444,
    BGRA32,
    RHalf,
    RGHalf,
    RGBAHalf,
    RFloat,
    RGFloat,
    RGBAFloat,
    YUY2,
    RGB9e5Float,
    BC4 = 26,
    BC5,
    BC6H = 24,
    BC7,
    DXT1Crunched = 28,
    DXT5Crunched,
    PVRTC_RGB2,
    PVRTC_RGBA2,
    PVRTC_RGB4,
    PVRTC_RGBA4,
    ETC_RGB4,
    ATC_RGB4,
    ATC_RGBA8,
    EAC_R = 41,
    EAC_R_SIGNED,
    EAC_RG,
    EAC_RG_SIGNED,
    ETC2_RGB,
    ETC2_RGBA1,
    ETC2_RGBA8,
    ASTC_RGB_4x4,
    ASTC_RGB_5x5,
    ASTC_RGB_6x6,
    ASTC_RGB_8x8,
    ASTC_RGB_10x10,
    ASTC_RGB_12x12,
    ASTC_RGBA_4x4,
    ASTC_RGBA_5x5,
    ASTC_RGBA_6x6,
    ASTC_RGBA_8x8,
    ASTC_RGBA_10x10,
    ASTC_RGBA_12x12,
    ETC_RGB4_3DS,
    ETC_RGBA8_3DS,
    RG16,
    R8,
    ETC_RGB4Crunched,
    ETC2_RGBA8Crunched,
    ASTC_HDR_4x4,
    ASTC_HDR_5x5,
    ASTC_HDR_6x6,
    ASTC_HDR_8x8,
    ASTC_HDR_10x10,
    ASTC_HDR_12x12,
}

impl Display for TextureFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}

#[derive(Default, Debug)]
pub struct StreamingInfo {
    pub offset: u64,
    pub size: u32,
    pub path: String,
}

impl StreamingInfo {
    pub fn from_object_reader(br: &mut BinaryReader, object: &ObjectInfo) -> Result<Self> {
        let mut result = Self::default();
        if object.version[0] >= 2020 {
            result.offset = br.read_u64()?;
        } else {
            result.offset = br.read_u32()? as u64;
        }
        result.size = br.read_u32()?;
        result.path = br.read_aligned_string()?;
        Ok(result)
    }
}

#[derive(Default, Debug)]
pub struct GLTextureSettings {
    pub filter_mode: i32,
    pub aniso: i32,
    pub mip_bias: f32,
    pub wrap_mode: i32,
}

impl GLTextureSettings {
    pub fn from_object_reader(br: &mut BinaryReader, object: &ObjectInfo) -> Result<Self> {
        let mut result = Self {
            filter_mode: br.read_i32()?,
            aniso: br.read_i32()?,
            mip_bias: br.read_f32()?,
            ..Self::default()
        };
        if object.version[0] >= 2017 {
            result.wrap_mode = br.read_i32()?;
            let _wrap_w = br.read_i32()?;
            let _wrap_h = br.read_i32()?;
        } else {
            result.wrap_mode = br.read_i32()?;
        }
        Ok(result)
    }
}

fn has_gnf_tex_or_external_mip_offset(object_info: &ObjectInfo) -> bool {
    if let Some(serialized_type) = object_info.serialized_type.as_ref() {
        serialized_type.borrow().old_type_hash.eq(&[
            0x1d, 0x52, 0xbb, 0x98, 0xaa, 0x5f, 0x54, 0xc6, 0x7c, 0x22, 0xc3, 0x9e, 0x8b, 0x2e,
            0x40, 0x0f,
        ])
    } else {
        false
    }
}
