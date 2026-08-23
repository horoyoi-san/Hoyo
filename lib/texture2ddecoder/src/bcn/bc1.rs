use crate::color::{color, rgb565_le};
#[cfg(not(target_arch = "x86_64"))]
use crate::color::{color, rgb565_le};

#[inline]
pub fn decode_bc1_block(data: &[u8], outbuf: &mut [u32]) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        decode_bc1_block_avx2(data, outbuf)
    }

    #[cfg(not(target_arch = "x86_64"))]
    {
        let q0 = u16::from_le_bytes([data[0], data[1]]);
        let q1 = u16::from_le_bytes([data[2], data[3]]);
        let (r0, g0, b0) = rgb565_le(q0);
        let (r1, g1, b1) = rgb565_le(q1);

        let mut c: [u32; 4] = [color(r0, g0, b0, 255), color(r1, g1, b1, 255), 0, 0];

        let r0 = r0 as u16;
        let g0 = g0 as u16;
        let b0 = b0 as u16;
        let r1 = r1 as u16;
        let g1 = g1 as u16;
        let b1 = b1 as u16;

        if q0 > q1 {
            c[2] = color(
                ((r0 * 2 + r1) / 3) as u8,
                ((g0 * 2 + g1) / 3) as u8,
                ((b0 * 2 + b1) / 3) as u8,
                255,
            );
            c[3] = color(
                ((r0 + r1 * 2) / 3) as u8,
                ((g0 + g1 * 2) / 3) as u8,
                ((b0 + b1 * 2) / 3) as u8,
                255,
            );
        } else {
            c[2] = color(
                ((r0 + r1) / 2) as u8,
                ((g0 + g1) / 2) as u8,
                ((b0 + b1) / 2) as u8,
                255,
            );
            c[3] = color(0, 0, 0, 255);
        }
        let mut d: usize = u32::from_le_bytes(data[4..8].try_into().unwrap()) as usize;
        (0..16).for_each(|i| {
            outbuf[i] = c[d & 3];
            d >>= 2;
        });
    }
}

#[cfg(target_arch = "x86_64")]
#[inline(always)]
unsafe fn decode_bc1_block_avx2(data: &[u8], outbuf: &mut [u32]) {
    use core::arch::x86_64::*;

    let q0 = u16::from_le_bytes([data[0], data[1]]);
    let q1 = u16::from_le_bytes([data[2], data[3]]);

    let r0 = ((q0 >> 8) & 0xf8) as u8 | (q0 >> 13) as u8;
    let g0 = (q0 >> 3 & 0xfc) as u8 | (q0 >> 9 & 3) as u8;
    let b0 = (q0 << 3) as u8 | (q0 >> 2 & 7) as u8;

    let r1 = ((q1 >> 8) & 0xf8) as u8 | (q1 >> 13) as u8;
    let g1 = (q1 >> 3 & 0xfc) as u8 | (q1 >> 9 & 3) as u8;
    let b1 = (q1 << 3) as u8 | (q1 >> 2 & 7) as u8;

    let c0 = u32::from_le_bytes([r0, g0, b0, 255]);
    let c1 = u32::from_le_bytes([r1, g1, b1, 255]);

    let (c2, c3) = if q0 > q1 {
        (
            u32::from_le_bytes([
                ((r0 as u16 * 2 + r1 as u16) / 3) as u8,
                ((g0 as u16 * 2 + g1 as u16) / 3) as u8,
                ((b0 as u16 * 2 + b1 as u16) / 3) as u8,
                255,
            ]),
            u32::from_le_bytes([
                ((r0 as u16 + r1 as u16 * 2) / 3) as u8,
                ((g0 as u16 + g1 as u16 * 2) / 3) as u8,
                ((b0 as u16 + b1 as u16 * 2) / 3) as u8,
                255,
            ]),
        )
    } else {
        (
            u32::from_le_bytes([
                ((r0 as u16 + r1 as u16) / 2) as u8,
                ((g0 as u16 + g1 as u16) / 2) as u8,
                ((b0 as u16 + b1 as u16) / 2) as u8,
                255,
            ]),
            u32::from_le_bytes([0, 0, 0, 255]),
        )
    };

    let indices = u32::from_le_bytes([data[4], data[5], data[6], data[7]]);
    let lo = (indices & 0xFFFF) as usize;
    let hi = (indices >> 16) as usize;

    let idx_table = &crate::simd::tables::SIMD_TABLES.bc1_indices;
    let idx_lo = idx_table[lo].as_ptr();
    let idx_hi = idx_table[hi].as_ptr();

    let idx_vec_lo = _mm256_cvtepu8_epi32(_mm_loadl_epi64(idx_lo as *const __m128i));
    let idx_vec_hi = _mm256_cvtepu8_epi32(_mm_loadl_epi64(idx_hi as *const __m128i));

    let colors = [c0 as i32, c1 as i32, c2 as i32, c3 as i32];
    let colors_ptr = colors.as_ptr();

    let pix_lo = _mm256_i32gather_epi32::<4>(colors_ptr, idx_vec_lo);
    let pix_hi = _mm256_i32gather_epi32::<4>(colors_ptr, idx_vec_hi);

    _mm256_storeu_si256(outbuf.as_mut_ptr() as *mut __m256i, pix_lo);
    _mm256_storeu_si256(outbuf.as_mut_ptr().add(8) as *mut __m256i, pix_hi);
}


#[inline]
fn _decode_bc1_block(data: &[u8], outbuf: &mut [u32], use_alpha: bool) {
    let q0 = u16::from_le_bytes([data[0], data[1]]);
    let q1 = u16::from_le_bytes([data[2], data[3]]);
    let (r0, g0, b0) = rgb565_le(q0);
    let (r1, g1, b1) = rgb565_le(q1);

    let mut c: [u32; 4] = [color(r0, g0, b0, 255), color(r1, g1, b1, 255), 0, 0];

    // C insanity.....
    let r0 = r0 as u16;
    let g0 = g0 as u16;
    let b0 = b0 as u16;
    let r1 = r1 as u16;
    let g1 = g1 as u16;
    let b1 = b1 as u16;

    if q0 > q1 {
        c[2] = color(
            ((r0 * 2 + r1) / 3) as u8,
            ((g0 * 2 + g1) / 3) as u8,
            ((b0 * 2 + b1) / 3) as u8,
            255,
        );
        c[3] = color(
            ((r0 + r1 * 2) / 3) as u8,
            ((g0 + g1 * 2) / 3) as u8,
            ((b0 + b1 * 2) / 3) as u8,
            255,
        );
    } else {
        c[2] = color(
            ((r0 + r1) / 2) as u8,
            ((g0 + g1) / 2) as u8,
            ((b0 + b1) / 2) as u8,
            255,
        );
        c[3] = color(0, 0, 0, if use_alpha { 0 } else { 255 });
    }
    let mut d: usize = u32::from_le_bytes(data[4..8].try_into().unwrap()) as usize;
    (0..16).for_each(|i| {
        outbuf[i] = c[d & 3];
        d >>= 2;
    });
}


#[inline]
pub fn decode_bc1a_block(data: &[u8], outbuf: &mut [u32]) {
    _decode_bc1_block(data, outbuf, true);
}
