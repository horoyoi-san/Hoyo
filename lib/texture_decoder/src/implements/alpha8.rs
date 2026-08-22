use crate::error::DecodeImageError;
use crate::pixel_info::{Pixel, SinglePixel};
use crate::ImageDecoder;
use crate::ImageSize;
use byteorder::ReadBytesExt;
use std::io;

pub struct Alpha8;

impl ImageDecoder<1> for Alpha8 {
    const DECODE_PIXEL_BYTE: usize = 1;

    fn decode_pixel(data: &mut &[u8]) -> io::Result<SinglePixel> {
        Ok([Pixel::new_rgba(255, 255, 255, data.read_u8()?)])
    }

    fn decode_currently(size: &ImageSize, img_data: &[u8]) -> Result<Box<[u8]>, DecodeImageError> {
        Self::check_decodiblity(size, img_data.len())?;

        let pixel_count = size.size();
        let mut out = vec![0u8; size.output_size()].into_boxed_slice();

        #[cfg(target_arch = "x86_64")]
        unsafe {
            use core::arch::x86_64::*;
            let dst = out.as_mut_ptr() as *mut u32;
            let mut i = 0usize;
            let base = _mm256_set1_epi32(0x00FFFFFFu32 as i32);

            while i + 8 <= pixel_count {
                let bytes = _mm_loadl_epi64(img_data.as_ptr().add(i) as *const __m128i);
                let vals = _mm256_cvtepu8_epi32(bytes);
                let alpha = _mm256_slli_epi32(vals, 24);
                let rgba = _mm256_or_si256(alpha, base);
                _mm256_storeu_si256(dst.add(i) as *mut __m256i, rgba);
                i += 8;
            }

            while i < pixel_count {
                let a = img_data[i] as u32;
                *dst.add(i) = (a << 24) | 0x00FFFFFFu32;
                i += 1;
            }
        }

        #[cfg(not(target_arch = "x86_64"))]
        {
            for i in 0..pixel_count {
                let a = img_data[i];
                out[i * 4] = 255;
                out[i * 4 + 1] = 255;
                out[i * 4 + 2] = 255;
                out[i * 4 + 3] = a;
            }
        }

        Ok(out)
    }
}
