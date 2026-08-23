use crate::error::DecodeImageError;
use crate::pixel_info::{Pixel, SinglePixel};
use crate::ImageDecoder;
use crate::ImageSize;
use byteorder::ReadBytesExt;

pub struct R8;

impl ImageDecoder<1> for R8 {
    const DECODE_PIXEL_BYTE: usize = 1;

    fn decode_pixel(data: &mut &[u8]) -> std::io::Result<SinglePixel> {
        Ok([Pixel::builder().rad(data.read_u8()?).build()])
    }

    fn decode_currently(size: &ImageSize, img_data: &[u8]) -> Result<Box<[u8]>, DecodeImageError> {
        Self::check_decodiblity(size, img_data.len())?;

        let pixel_count = size.size();
        let mut out = vec![0u8; size.output_size()].into_boxed_slice();

        if crate::gpu::decode_r8_gpu(img_data, size.width(), size.height(), &mut out).is_ok() {
            return Ok(out);
        }

        #[cfg(target_arch = "x86_64")]
        unsafe {
            use core::arch::x86_64::*;

            let dst_u32 = std::slice::from_raw_parts_mut(out.as_mut_ptr() as *mut u32, pixel_count);

            if pixel_count >= 262144 {
                use rayon::prelude::*;
                let chunk = 16384usize;
                dst_u32
                    .par_chunks_mut(chunk)
                    .zip(img_data.par_chunks(chunk))
                    .for_each(|(dst_chunk, src_chunk)| {
                        let mut i = 0usize;
                        let alpha = _mm256_set1_epi32(0xFF000000u32 as i32);
                        let dst_ptr = dst_chunk.as_mut_ptr();
                        let src_ptr = src_chunk.as_ptr();

                        while i + 8 <= src_chunk.len() {
                            let bytes = _mm_loadl_epi64(src_ptr.add(i) as *const __m128i);
                            let vals = _mm256_cvtepu8_epi32(bytes);
                            let rgba = _mm256_or_si256(vals, alpha);
                            _mm256_storeu_si256(dst_ptr.add(i) as *mut __m256i, rgba);
                            i += 8;
                        }

                        while i < src_chunk.len() {
                            let r = src_chunk[i];
                            *dst_ptr.add(i) = (r as u32) | 0xFF000000u32;
                            i += 1;
                        }
                    });
            } else {
                let dst = out.as_mut_ptr() as *mut u32;
                let mut i = 0usize;
                let alpha = _mm256_set1_epi32(0xFF000000u32 as i32);

                while i + 8 <= pixel_count {
                    let bytes = _mm_loadl_epi64(img_data.as_ptr().add(i) as *const __m128i);
                    let vals = _mm256_cvtepu8_epi32(bytes);
                    let rgba = _mm256_or_si256(vals, alpha);
                    _mm256_storeu_si256(dst.add(i) as *mut __m256i, rgba);
                    i += 8;
                }

                while i < pixel_count {
                    let r = img_data[i];
                    *dst.add(i) = (r as u32) | 0xFF000000u32;
                    i += 1;
                }
            }
        }

        #[cfg(not(target_arch = "x86_64"))]
        {
            for i in 0..pixel_count {
                let r = img_data[i];
                out[i * 4] = r;
                out[i * 4 + 1] = 0;
                out[i * 4 + 2] = 0;
                out[i * 4 + 3] = 255;
            }
        }

        Ok(out)
    }
}
