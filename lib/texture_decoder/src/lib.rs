mod decoder;
pub mod error;
mod gpu;
pub mod implements;
mod pixel_info;
mod simd_tables;
mod utils;
mod write_buffer;

use crate::error::DecodeImageError;
use crate::pixel_info::Pixel;
pub use decoder::ImageDecoder;
use image::RgbaImage;

pub struct Texture2DDecoder;

impl Texture2DDecoder {
    pub fn decode<const PIXEL_BYTE: usize, const N: usize, D: ImageDecoder<PIXEL_BYTE, N>>(
        _: D,
        size: &ImageSize,
        data: &[u8],
        flip: bool,
    ) -> Result<RgbaImage, DecodeImageError> {
        let buffer = D::decode_currently(size, data)?;
        let vec = buffer.into_vec();

        let mut img = RgbaImage::from_raw(size.width as _, size.height as _, vec)
            .ok_or(DecodeImageError::ImageDecode)?;

        if flip {
            image::imageops::flip_vertical_in_place(&mut img);
        }

        Ok(img)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ImageSize {
    width: usize,
    height: usize,
}

impl ImageSize {
    pub fn new(width: usize, height: usize) -> Self {
        Self { width, height }
    }

    pub fn size(&self) -> usize {
        self.width * self.height
    }

    pub fn width(&self) -> usize {
        self.width
    }

    pub fn height(&self) -> usize {
        self.height
    }
    pub fn output_size(&self) -> usize {
        self.size() * Pixel::PIXEL_SPACE
    }
}
