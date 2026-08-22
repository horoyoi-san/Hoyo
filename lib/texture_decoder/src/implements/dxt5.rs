use byteorder::{LittleEndian, ReadBytesExt};
use image::RgbaImage;
use std::io::{self, Cursor, Read};

pub struct DXT5;

impl DXT5 {
    pub fn decode(data: &[u8], width: u32, height: u32) -> io::Result<RgbaImage> {
        let mut buffer = vec![0u8; (width * height * 4) as usize];

        if crate::gpu::decode_dxt5_gpu(data, width as usize, height as usize, &mut buffer).is_ok() {
            return Ok(RgbaImage::from_raw(width, height, buffer).unwrap());
        }

        let blocks_x = width.div_ceil(4);
        let block_size = 16;

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
                    )?;
                }
            }
        }

        Ok(RgbaImage::from_raw(width, height, buffer).unwrap())
    }

    unsafe fn decode_block_to_buffer(
        data: &[u8],
        buffer: *mut u8,
        width: u32,
        height: u32,
        block_x: u32,
        block_y: u32,
    ) -> io::Result<()> {
        let mut reader = Cursor::new(data);

        let alpha0 = reader.read_u8()?;
        let alpha1 = reader.read_u8()?;

        let mut alpha_indices_buf = [0u8; 6];
        reader.read_exact(&mut alpha_indices_buf)?;
        let alpha_idx_u64 = u64::from_le_bytes([
            alpha_indices_buf[0],
            alpha_indices_buf[1],
            alpha_indices_buf[2],
            alpha_indices_buf[3],
            alpha_indices_buf[4],
            alpha_indices_buf[5],
            0,
            0,
        ]);
        let mut alphas = [0u8; 8];
        alphas[0] = alpha0;
        alphas[1] = alpha1;
        if alpha0 > alpha1 {
            for (i, alpha) in alphas.iter_mut().enumerate().skip(2) {
                *alpha =
                    (((8 - i) as u16 * alpha0 as u16 + (i - 1) as u16 * alpha1 as u16) / 7) as u8;
            }
        } else {
            for (i, alpha) in alphas.iter_mut().enumerate().skip(2).take(4) {
                *alpha =
                    (((6 - i) as u16 * alpha0 as u16 + (i - 1) as u16 * alpha1 as u16) / 5) as u8;
            }
            alphas[6] = 0;
            alphas[7] = 255;
        }

        let c0 = reader.read_u16::<LittleEndian>()?;
        let c1 = reader.read_u16::<LittleEndian>()?;
        let color_idx = reader.read_u32::<LittleEndian>()?;

        let (r0, g0, b0) = Self::rgb565_to_rgb888(c0);
        let (r1, g1, b1) = Self::rgb565_to_rgb888(c1);

        let mut colors = [[0u8; 3]; 4];
        colors[0] = [r0, g0, b0];
        colors[1] = [r1, g1, b1];
        colors[2] = [
            ((2 * r0 as u16 + r1 as u16) / 3) as u8,
            ((2 * g0 as u16 + g1 as u16) / 3) as u8,
            ((2 * b0 as u16 + b1 as u16) / 3) as u8,
        ];
        colors[3] = [
            ((r0 as u16 + 2 * r1 as u16) / 3) as u8,
            ((g0 as u16 + 2 * g1 as u16) / 3) as u8,
            ((b0 as u16 + 2 * b1 as u16) / 3) as u8,
        ];

        let full_block = block_x + 4 <= width && block_y + 4 <= height;

        if full_block {
            let mut pixels = [0u32; 16];
            for (i, pixel) in pixels.iter_mut().enumerate() {
                let ai = ((alpha_idx_u64 >> (3 * i)) & 0x7) as usize;
                let ci = ((color_idx >> (2 * i)) & 0x3) as usize;
                let rgb = colors[ci];
                let a = alphas[ai];
                *pixel = u32::from_le_bytes([rgb[0], rgb[1], rgb[2], a]);
            }

            #[cfg(target_arch = "x86_64")]
            {
                use core::arch::x86_64::*;
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
                for row in 0u32..4 {
                    let flipped_y = height - 1 - (block_y + row);
                    let dst = buffer.add(((flipped_y * width + block_x) * 4) as usize) as *mut u32;
                    std::ptr::copy_nonoverlapping(pixels.as_ptr().add((row * 4) as usize), dst, 4);
                }
            }
        } else {
            let mut alpha_idx = [0u8; 16];
            let idx0 = (alpha_idx_u64 & 0xFFF) as usize;
            let idx1 = ((alpha_idx_u64 >> 12) & 0xFFF) as usize;
            let idx2 = ((alpha_idx_u64 >> 24) & 0xFFF) as usize;
            let idx3 = ((alpha_idx_u64 >> 36) & 0xFFF) as usize;
            alpha_idx[0..4].copy_from_slice(&crate::simd_tables::ALPHA_IDX_12[idx0]);
            alpha_idx[4..8].copy_from_slice(&crate::simd_tables::ALPHA_IDX_12[idx1]);
            alpha_idx[8..12].copy_from_slice(&crate::simd_tables::ALPHA_IDX_12[idx2]);
            alpha_idx[12..16].copy_from_slice(&crate::simd_tables::ALPHA_IDX_12[idx3]);

            for row in 0u32..4 {
                for col in 0u32..4 {
                    let x = block_x + col;
                    let y = block_y + row;

                    if x < width && y < height {
                        let flipped_y = height - 1 - y;
                        let global_idx = ((flipped_y * width + x) * 4) as usize;
                        let local_idx = (row * 4 + col) as usize;
                        let ai = alpha_idx[local_idx] as usize;
                        let ci = ((color_idx >> (2 * local_idx)) & 0x3) as usize;

                        let rgb = colors[ci];
                        let a = alphas[ai];
                        let pixel = [rgb[0], rgb[1], rgb[2], a];

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
