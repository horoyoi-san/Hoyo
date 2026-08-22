use std::io::Cursor;

use byteorder::{LittleEndian, ReadBytesExt};
use image::RgbaImage;

use crate::error::DecodeImageError;

pub struct DXT1;

impl DXT1 {
    pub fn decode(data: &[u8], width: u32, height: u32) -> Result<RgbaImage, DecodeImageError> {
        let mut buffer = vec![0u8; (width * height * 4) as usize];
        let blocks_x = width.div_ceil(4);
        let block_size = 8;
        let total_blocks = width.div_ceil(4) * height.div_ceil(4);

        if total_blocks >= 4096 {
            use rayon::prelude::*;
            let buffer_ptr = buffer.as_mut_ptr() as usize;

            data.par_chunks(block_size)
                .enumerate()
                .for_each(|(i, chunk)| {
                    if chunk.len() < block_size {
                        return;
                    }

                    let block_x = (i as u32 % blocks_x) * 4;
                    let block_y = (i as u32 / blocks_x) * 4;

                    unsafe {
                        let buf_ptr = buffer_ptr as *mut u8;
                        let _ = Self::decode_block_to_buffer(
                            chunk, buf_ptr, width, height, block_x, block_y,
                        );
                    }
                });
        } else {
            unsafe {
                let buffer_ptr = buffer.as_mut_ptr();

                for (i, chunk) in data.chunks(block_size).enumerate() {
                    if chunk.len() < block_size {
                        break;
                    }

                    let block_x = (i as u32 % blocks_x) * 4;
                    let block_y = (i as u32 / blocks_x) * 4;

                    Self::decode_block_to_buffer(
                        chunk, buffer_ptr, width, height, block_x, block_y,
                    )
                    .map_err(|_| DecodeImageError::InvalidData)?;
                }
            }
        }

        RgbaImage::from_raw(width, height, buffer).ok_or(DecodeImageError::ImageDecode)
    }

    unsafe fn decode_block_to_buffer(
        data: &[u8],
        buffer: *mut u8,
        width: u32,
        height: u32,
        block_x: u32,
        block_y: u32,
    ) -> std::io::Result<()> {
        let mut reader = Cursor::new(data);
        let c0 = reader.read_u16::<LittleEndian>()?;
        let c1 = reader.read_u16::<LittleEndian>()?;
        let color_idx = reader.read_u32::<LittleEndian>()?;

        let (r0, g0, b0) = Self::rgb565_to_rgb888(c0);
        let (r1, g1, b1) = Self::rgb565_to_rgb888(c1);

        let mut colors = [[0u8; 4]; 4];
        colors[0] = [r0, g0, b0, 255];
        colors[1] = [r1, g1, b1, 255];

        if c0 > c1 {
            colors[2] = [
                ((2 * r0 as u16 + r1 as u16) / 3) as u8,
                ((2 * g0 as u16 + g1 as u16) / 3) as u8,
                ((2 * b0 as u16 + b1 as u16) / 3) as u8,
                255,
            ];
            colors[3] = [
                ((r0 as u16 + 2 * r1 as u16) / 3) as u8,
                ((g0 as u16 + 2 * g1 as u16) / 3) as u8,
                ((b0 as u16 + 2 * b1 as u16) / 3) as u8,
                255,
            ];
        } else {
            colors[2] = [
                ((r0 as u16 + r1 as u16) / 2) as u8,
                ((g0 as u16 + g1 as u16) / 2) as u8,
                ((b0 as u16 + b1 as u16) / 2) as u8,
                255,
            ];
            colors[3] = [0, 0, 0, 0];
        }

        let full_block = block_x + 4 <= width && block_y + 4 <= height;

        if full_block {
            let mut pixels = [0u32; 16];

            #[cfg(target_arch = "x86_64")]
            {
                use core::arch::x86_64::*;
                let colors_u32 = [
                    u32::from_le_bytes(colors[0]),
                    u32::from_le_bytes(colors[1]),
                    u32::from_le_bytes(colors[2]),
                    u32::from_le_bytes(colors[3]),
                ];
                let colors_ptr = colors_u32.as_ptr() as *const i32;

                let lo = (color_idx & 0xFFFF) as usize;
                let hi = (color_idx >> 16) as usize;
                let idx_table = &crate::simd_tables::BC1_INDICES;

                let idx_vec_lo =
                    _mm256_cvtepu8_epi32(_mm_loadl_epi64(idx_table[lo].as_ptr() as *const __m128i));
                let idx_vec_hi =
                    _mm256_cvtepu8_epi32(_mm_loadl_epi64(idx_table[hi].as_ptr() as *const __m128i));

                let pix_lo = _mm256_i32gather_epi32::<4>(colors_ptr, idx_vec_lo);
                let pix_hi = _mm256_i32gather_epi32::<4>(colors_ptr, idx_vec_hi);

                _mm256_storeu_si256(pixels.as_mut_ptr() as *mut __m256i, pix_lo);
                _mm256_storeu_si256(pixels.as_mut_ptr().add(8) as *mut __m256i, pix_hi);

                for row in 0u32..4 {
                    let flipped_y = height - 1 - (block_y + row);
                    let dst =
                        buffer.add(((flipped_y * width + block_x) * 4) as usize) as *mut __m128i;
                    let src = pixels.as_ptr().add((row * 4) as usize) as *const __m128i;
                    _mm_storeu_si128(dst, _mm_loadu_si128(src));
                }
            }

            #[cfg(not(target_arch = "x86_64"))]
            {
                for i in 0..16u32 {
                    let idx = ((color_idx >> (2 * i)) & 0x3) as usize;
                    let p = colors[idx];
                    pixels[i as usize] = u32::from_le_bytes(p);
                }
                for row in 0u32..4 {
                    let flipped_y = height - 1 - (block_y + row);
                    let dst = buffer.add(((flipped_y * width + block_x) * 4) as usize) as *mut u32;
                    std::ptr::copy_nonoverlapping(pixels.as_ptr().add((row * 4) as usize), dst, 4);
                }
            }
        } else {
            for row in 0u32..4 {
                for col in 0u32..4 {
                    let x = block_x + col;
                    let y = block_y + row;

                    if x < width && y < height {
                        let flipped_y = height - 1 - y;
                        let global_idx = ((flipped_y * width + x) * 4) as usize;
                        let ci = ((color_idx >> (2 * (row * 4 + col))) & 0x3) as usize;
                        let pixel = colors[ci];

                        let dst = buffer.add(global_idx);
                        std::ptr::copy_nonoverlapping(pixel.as_ptr(), dst, 4);
                    }
                }
            }
        }

        Ok(())
    }

    #[inline]
    fn rgb565_to_rgb888(c: u16) -> (u8, u8, u8) {
        let r = ((c >> 11) & 0x1f) as u8;
        let g = ((c >> 5) & 0x3f) as u8;
        let b = (c & 0x1f) as u8;
        (
            (r << 3) | (r >> 2),
            (g << 2) | (g >> 4),
            (b << 3) | (b >> 2),
        )
    }
}
