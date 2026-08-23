use crate::bcn::bc1::decode_bc1_block;

#[inline]
pub fn decode_bc3_alpha(data: &[u8], outbuf: &mut [u32], channel: usize) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        decode_bc3_alpha_avx2(data, outbuf, channel)
    }

    #[cfg(not(target_arch = "x86_64"))]
    decode_bc3_alpha_scalar(data, outbuf, channel)
}

#[cfg(target_arch = "x86_64")]
#[inline(always)]
unsafe fn decode_bc3_alpha_avx2(data: &[u8], outbuf: &mut [u32], channel: usize) {
    use core::arch::x86_64::*;

    let a0 = data[0];
    let a1 = data[1];
    let idx = (a0 as usize) | ((a1 as usize) << 8);

    let alpha_table = crate::simd::tables::SIMD_TABLES.bc3_alpha.as_ptr();
    let alphas = _mm256_loadu_si256(alpha_table.add(idx) as *const __m256i);
    let alpha_vals: [u8; 32] = std::mem::transmute(alphas);

    let mut d: usize = (u64::from_le_bytes(data[..8].try_into().unwrap()) >> 16) as usize;

    let channel_shift = channel * 8;
    let channel_mask = 0xFFFFFFFF ^ (0xFF << channel_shift);
    outbuf.iter_mut().for_each(|p| {
        *p = (*p & channel_mask) | (alpha_vals[d & 7] as u32) << channel_shift;
        d >>= 3;
    });
}

#[inline]
pub fn decode_bc3_block(data: &[u8], outbuf: &mut [u32]) {
    decode_bc1_block(&data[8..], outbuf);
    decode_bc3_alpha(data, outbuf, 3);
}
