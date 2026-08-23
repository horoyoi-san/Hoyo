#![allow(dead_code)]
use crate::bcn::consts::{S_BPTC_A2, S_BPTC_A3, S_BPTC_FACTORS, S_BPTC_P2, S_BPTC_P3};
use crate::macros::block_decoder;
use core::mem::swap;
use std::sync::LazyLock;

#[cfg(target_arch = "x86_64")]
#[inline(always)]
unsafe fn decode_bc7_block_avx2(data: &[u8], outbuf: &mut [u32]) {
    decode_bc7_block_simd(data, outbuf)
}

struct Bc7ModeInfo {
    num_subsets: usize,
    partition_bits: usize,
    rotation_bits: usize,
    index_selection_bits: usize,
    color_bits: usize,
    alpha_bits: usize,
    endpoint_pbits: usize,
    shared_pbits: usize,
    index_bits: [usize; 2],
}

static S_BP7_MODE_INFO: [Bc7ModeInfo; 8] = [
    //  +---------------------------- num subsets
    //  |  +------------------------- partition bits
    //  |  |  +---------------------- rotation bits
    //  |  |  |  +------------------- index selection bits
    //  |  |  |  |  +---------------- color bits
    //  |  |  |  |  |  +------------- alpha bits
    //  |  |  |  |  |  |  +---------- endpoint P-bits
    //  |  |  |  |  |  |  |  +------- shared P-bits
    //  |  |  |  |  |  |  |  |    +-- 2x index bits
    // { 3, 4, 0, 0, 4, 0, 1, 0, { 3, 0 } }, // 0
    // { 2, 6, 0, 0, 6, 0, 0, 1, { 3, 0 } }, // 1
    // { 3, 6, 0, 0, 5, 0, 0, 0, { 2, 0 } }, // 2
    // { 2, 6, 0, 0, 7, 0, 1, 0, { 2, 0 } }, // 3
    // { 1, 0, 2, 1, 5, 6, 0, 0, { 2, 3 } }, // 4
    // { 1, 0, 2, 0, 7, 8, 0, 0, { 2, 2 } }, // 5
    // { 1, 0, 0, 0, 7, 7, 1, 0, { 4, 0 } }, // 6
    // { 2, 6, 0, 0, 5, 5, 1, 0, { 2, 0 } }, // 7
    Bc7ModeInfo {
        num_subsets: 3,
        partition_bits: 4,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 4,
        alpha_bits: 0,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: [3, 0],
    },
    Bc7ModeInfo {
        num_subsets: 2,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 6,
        alpha_bits: 0,
        endpoint_pbits: 0,
        shared_pbits: 1,
        index_bits: [3, 0],
    },
    Bc7ModeInfo {
        num_subsets: 3,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 5,
        alpha_bits: 0,
        endpoint_pbits: 0,
        shared_pbits: 0,
        index_bits: [2, 0],
    },
    Bc7ModeInfo {
        num_subsets: 2,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 7,
        alpha_bits: 0,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: [2, 0],
    },
    Bc7ModeInfo {
        num_subsets: 1,
        partition_bits: 0,
        rotation_bits: 2,
        index_selection_bits: 1,
        color_bits: 5,
        alpha_bits: 6,
        endpoint_pbits: 0,
        shared_pbits: 0,
        index_bits: [2, 3],
    },
    Bc7ModeInfo {
        num_subsets: 1,
        partition_bits: 0,
        rotation_bits: 2,
        index_selection_bits: 0,
        color_bits: 7,
        alpha_bits: 8,
        endpoint_pbits: 0,
        shared_pbits: 0,
        index_bits: [2, 2],
    },
    Bc7ModeInfo {
        num_subsets: 1,
        partition_bits: 0,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 7,
        alpha_bits: 7,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: [4, 0],
    },
    Bc7ModeInfo {
        num_subsets: 2,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 5,
        alpha_bits: 5,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: [2, 0],
    },
];

#[inline]
fn expand_quantized(v: u8, bits: usize) -> u8 {
    let s = ((v as u16) << (8 - bits as u16)) as u8;
    s | s.overflowing_shr(bits as u32).0
}

pub fn decode_bc7_block(data: &[u8], outbuf: &mut [u32]) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        decode_bc7_block_avx2(data, outbuf)
    }

    #[cfg(not(target_arch = "x86_64"))]
    decode_bc7_block_scalar(data, outbuf)
}

block_decoder!("bc7_cpu", 4, 4, 16, decode_bc7_block);

/// # Safety
pub unsafe fn decode_bc7(
    data: &[u8],
    width: usize,
    height: usize,
    image: &mut [u32],
) -> Result<(), &'static str> {
    let num_blocks_x: usize = width.div_ceil(4);
    let num_blocks_y: usize = height.div_ceil(4);
    let total_blocks = num_blocks_x * num_blocks_y;

    if data.len() < total_blocks * 16 {
        return Err("Not enough data to decode image!");
    }

    if image.len() < width * height {
        return Err("Image buffer is too small!");
    }

    // GPU/OpenCL decode (fast path). Silent CPU fallback on any error.
    if crate::gpu::decode_bc7_gpu(data, width, height, image).is_ok() {
        return Ok(());
    }

    decode_bc7_cpu(data, width, height, image)
}

fn decode_bc7_block_simd(data: &[u8], outbuf: &mut [u32]) {
    let mut bit = BitReader128::new(data);
    let mode = {
        let mut mode = 0;
        while 0 == bit.read(1) && mode < 8 {
            mode += 1;
        }
        mode
    };

    if mode == 8 {
        outbuf[0..16].fill(0);
        return;
    }

    if mode == 6 {
        decode_bc7_mode6(&mut bit, outbuf);
        return;
    }

    let mi: &Bc7ModeInfo = &S_BP7_MODE_INFO[mode];
    let mode_pbits: usize = if 0 != mi.endpoint_pbits {
        mi.endpoint_pbits
    } else {
        mi.shared_pbits
    };

    let partition_set_idx: usize = bit.read(mi.partition_bits) as usize;
    let rotation_mode: u8 = bit.read(mi.rotation_bits) as u8;
    let index_selection_mode: usize = bit.read(mi.index_selection_bits) as usize;

    let mut ep_r: [u8; 6] = [0; 6];
    let mut ep_g: [u8; 6] = [0; 6];
    let mut ep_b: [u8; 6] = [0; 6];
    let mut ep_a: [u8; 6] = [0; 6];

    (0..mi.num_subsets).for_each(|ii| {
        ep_r[ii * 2] = (bit.read(mi.color_bits) << mode_pbits) as u8;
        ep_r[ii * 2 + 1] = (bit.read(mi.color_bits) << mode_pbits) as u8;
    });

    (0..mi.num_subsets).for_each(|ii| {
        ep_g[ii * 2] = (bit.read(mi.color_bits) << mode_pbits) as u8;
        ep_g[ii * 2 + 1] = (bit.read(mi.color_bits) << mode_pbits) as u8;
    });

    (0..mi.num_subsets).for_each(|ii| {
        ep_b[ii * 2] = (bit.read(mi.color_bits) << mode_pbits) as u8;
        ep_b[ii * 2 + 1] = (bit.read(mi.color_bits) << mode_pbits) as u8;
    });

    if mi.alpha_bits > 0 {
        (0..mi.num_subsets).for_each(|ii| {
            ep_a[ii * 2] = (bit.read(mi.alpha_bits) << mode_pbits) as u8;
            ep_a[ii * 2 + 1] = (bit.read(mi.alpha_bits) << mode_pbits) as u8;
        });
    } else {
        ep_a = [0xff; 6];
    }

    if 0 != mode_pbits {
        (0..mi.num_subsets).for_each(|ii| {
            let pda: u8 = bit.read(mode_pbits) as u8;
            let pdb: u8 = if 0 == mi.shared_pbits {
                bit.read(mode_pbits) as u8
            } else {
                pda
            };

            ep_r[ii * 2] |= pda;
            ep_r[ii * 2 + 1] |= pdb;
            ep_g[ii * 2] |= pda;
            ep_g[ii * 2 + 1] |= pdb;
            ep_b[ii * 2] |= pda;
            ep_b[ii * 2 + 1] |= pdb;
            ep_a[ii * 2] |= pda;
            ep_a[ii * 2 + 1] |= pdb;
        });
    }

    let color_bits: usize = mi.color_bits + mode_pbits;

    (0..mi.num_subsets).for_each(|ii| {
        ep_r[ii * 2] = expand_quantized(ep_r[ii * 2], color_bits);
        ep_r[ii * 2 + 1] = expand_quantized(ep_r[ii * 2 + 1], color_bits);
        ep_g[ii * 2] = expand_quantized(ep_g[ii * 2], color_bits);
        ep_g[ii * 2 + 1] = expand_quantized(ep_g[ii * 2 + 1], color_bits);
        ep_b[ii * 2] = expand_quantized(ep_b[ii * 2], color_bits);
        ep_b[ii * 2 + 1] = expand_quantized(ep_b[ii * 2 + 1], color_bits);
    });

    if mi.alpha_bits > 0 {
        let alpha_bits = mi.alpha_bits + mode_pbits;
        (0..mi.num_subsets).for_each(|ii| {
            ep_a[ii * 2] = expand_quantized(ep_a[ii * 2], alpha_bits);
            ep_a[ii * 2 + 1] = expand_quantized(ep_a[ii * 2 + 1], alpha_bits);
        });
    }

    let has_index_bits1: bool = 0 != mi.index_bits[1];

    let factors: [[u8; 16]; 2] = [
        S_BPTC_FACTORS[mi.index_bits[0] - 2],
        if has_index_bits1 {
            S_BPTC_FACTORS[mi.index_bits[1] - 2]
        } else {
            S_BPTC_FACTORS[mi.index_bits[0] - 2]
        },
    ];

    let table = &BC7_INDEX_TABLES[mode][partition_set_idx];
    let pos_base = bit.pos();

    let mut r0 = [0u16; 16];
    let mut r1 = [0u16; 16];
    let mut g0 = [0u16; 16];
    let mut g1 = [0u16; 16];
    let mut b0 = [0u16; 16];
    let mut b1 = [0u16; 16];
    let mut a0 = [0u16; 16];
    let mut a1 = [0u16; 16];
    let mut fca = [0u16; 16];
    let mut fcb = [0u16; 16];
    let mut faa = [0u16; 16];
    let mut fab = [0u16; 16];

    (0..4_usize).for_each(|yy| {
        (0..4_usize).for_each(|xx| {
            let idx = yy * 4 + xx;

            let mut subset_index: usize = table.subset[idx] as usize;
            let pos0 = pos_base + table.idx_pos0[idx] as usize;
            let pos1 = pos_base + table.idx_pos1[idx] as usize;
            let num0 = table.idx_bits0[idx] as usize;
            let num1 = table.idx_bits1[idx] as usize;

            let index_0 = bit.read_at(pos0, num0) as usize;
            let index_1 = if has_index_bits1 {
                bit.read_at(pos1, num1) as usize
            } else {
                index_0
            };

            let fc: u16 = factors[index_selection_mode][if index_selection_mode == 0 {
                index_0
            } else {
                index_1
            }] as u16;
            let fa: u16 = factors[1 - index_selection_mode][if index_selection_mode == 0 {
                index_1
            } else {
                index_0
            }] as u16;

            let fca_val: u16 = 64 - fc;
            let fcb_val: u16 = fc;
            let faa_val: u16 = 64 - fa;
            let fab_val: u16 = fa;

            subset_index *= 2;
            r0[idx] = ep_r[subset_index] as u16;
            r1[idx] = ep_r[subset_index + 1] as u16;
            g0[idx] = ep_g[subset_index] as u16;
            g1[idx] = ep_g[subset_index + 1] as u16;
            b0[idx] = ep_b[subset_index] as u16;
            b1[idx] = ep_b[subset_index + 1] as u16;
            a0[idx] = ep_a[subset_index] as u16;
            a1[idx] = ep_a[subset_index + 1] as u16;
            fca[idx] = fca_val;
            fcb[idx] = fcb_val;
            faa[idx] = faa_val;
            fab[idx] = fab_val;
        });
    });

    use core::arch::x86_64::*;

    unsafe {
        for base in (0..16).step_by(8) {
            let r0v = _mm_loadu_si128(r0.as_ptr().add(base) as *const __m128i);
            let r1v = _mm_loadu_si128(r1.as_ptr().add(base) as *const __m128i);
            let g0v = _mm_loadu_si128(g0.as_ptr().add(base) as *const __m128i);
            let g1v = _mm_loadu_si128(g1.as_ptr().add(base) as *const __m128i);
            let b0v = _mm_loadu_si128(b0.as_ptr().add(base) as *const __m128i);
            let b1v = _mm_loadu_si128(b1.as_ptr().add(base) as *const __m128i);
            let a0v = _mm_loadu_si128(a0.as_ptr().add(base) as *const __m128i);
            let a1v = _mm_loadu_si128(a1.as_ptr().add(base) as *const __m128i);

            let fcav = _mm_loadu_si128(fca.as_ptr().add(base) as *const __m128i);
            let fcbv = _mm_loadu_si128(fcb.as_ptr().add(base) as *const __m128i);
            let faav = _mm_loadu_si128(faa.as_ptr().add(base) as *const __m128i);
            let fabv = _mm_loadu_si128(fab.as_ptr().add(base) as *const __m128i);

            let mut r = _mm_add_epi16(
                _mm_add_epi16(_mm_mullo_epi16(r0v, fcav), _mm_mullo_epi16(r1v, fcbv)),
                _mm_set1_epi16(32),
            );
            let mut g = _mm_add_epi16(
                _mm_add_epi16(_mm_mullo_epi16(g0v, fcav), _mm_mullo_epi16(g1v, fcbv)),
                _mm_set1_epi16(32),
            );
            let mut b = _mm_add_epi16(
                _mm_add_epi16(_mm_mullo_epi16(b0v, fcav), _mm_mullo_epi16(b1v, fcbv)),
                _mm_set1_epi16(32),
            );
            let mut a = _mm_add_epi16(
                _mm_add_epi16(_mm_mullo_epi16(a0v, faav), _mm_mullo_epi16(a1v, fabv)),
                _mm_set1_epi16(32),
            );

            r = _mm_srli_epi16(r, 6);
            g = _mm_srli_epi16(g, 6);
            b = _mm_srli_epi16(b, 6);
            a = _mm_srli_epi16(a, 6);

            match rotation_mode {
                1 => swap(&mut a, &mut r),
                2 => swap(&mut a, &mut g),
                3 => swap(&mut a, &mut b),
                _ => {}
            }

            let r8 = _mm_packus_epi16(r, _mm_setzero_si128());
            let g8 = _mm_packus_epi16(g, _mm_setzero_si128());
            let b8 = _mm_packus_epi16(b, _mm_setzero_si128());
            let a8 = _mm_packus_epi16(a, _mm_setzero_si128());

            let rg = _mm_unpacklo_epi8(r8, g8);
            let ba = _mm_unpacklo_epi8(b8, a8);
            let rgba0 = _mm_unpacklo_epi16(rg, ba);
            let rgba1 = _mm_unpackhi_epi16(rg, ba);

            let dst = outbuf.as_mut_ptr().add(base) as *mut __m128i;
            _mm_storeu_si128(dst, rgba0);
            _mm_storeu_si128(dst.add(1), rgba1);
        }
    }
}

#[inline]
fn decode_bc7_mode6(bit: &mut BitReader128, outbuf: &mut [u32]) {
    use core::arch::x86_64::*;

    let mut ep_r0 = (bit.read(7) as u8) << 1;
    let mut ep_r1 = (bit.read(7) as u8) << 1;
    let mut ep_g0 = (bit.read(7) as u8) << 1;
    let mut ep_g1 = (bit.read(7) as u8) << 1;
    let mut ep_b0 = (bit.read(7) as u8) << 1;
    let mut ep_b1 = (bit.read(7) as u8) << 1;
    let mut ep_a0 = (bit.read(7) as u8) << 1;
    let mut ep_a1 = (bit.read(7) as u8) << 1;

    let pda = bit.read(1) as u8;
    let pdb = bit.read(1) as u8;

    ep_r0 |= pda;
    ep_r1 |= pdb;
    ep_g0 |= pda;
    ep_g1 |= pdb;
    ep_b0 |= pda;
    ep_b1 |= pdb;
    ep_a0 |= pda;
    ep_a1 |= pdb;

    let factors = &S_BPTC_FACTORS[2];
    let pos_base = bit.pos();

    unsafe {
        for base in (0..16).step_by(8) {
            let mut idx_arr = [0u16; 8];
            for (i, cell) in idx_arr.iter_mut().enumerate() {
                let pixel = base + i;
                let bits = if pixel == 0 { 3 } else { 4 };
                let pos = pos_base + if pixel == 0 { 0 } else { 3 + (pixel - 1) * 4 };
                *cell = bit.read_at(pos, bits);
            }

            let mut fc_arr = [0u16; 8];
            for i in 0..8 {
                fc_arr[i] = factors[idx_arr[i] as usize] as u16;
            }
            let fc_vec = _mm_loadu_si128(fc_arr.as_ptr() as *const __m128i);
            let fc_vec_lo = _mm_cvtepu16_epi32(fc_vec);
            let fc_vec_hi = _mm_cvtepu16_epi32(_mm_srli_si128(fc_vec, 8));

            let fca_vec_lo = _mm_sub_epi32(_mm_set1_epi32(64), fc_vec_lo);
            let fca_vec_hi = _mm_sub_epi32(_mm_set1_epi32(64), fc_vec_hi);

            let r_lo = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_r0 as i32), fca_vec_lo),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_r1 as i32), fc_vec_lo),
                ),
                _mm_set1_epi32(32),
            );
            let r_hi = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_r0 as i32), fca_vec_hi),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_r1 as i32), fc_vec_hi),
                ),
                _mm_set1_epi32(32),
            );

            let g_lo = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_g0 as i32), fca_vec_lo),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_g1 as i32), fc_vec_lo),
                ),
                _mm_set1_epi32(32),
            );
            let g_hi = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_g0 as i32), fca_vec_hi),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_g1 as i32), fc_vec_hi),
                ),
                _mm_set1_epi32(32),
            );

            let b_lo = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_b0 as i32), fca_vec_lo),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_b1 as i32), fc_vec_lo),
                ),
                _mm_set1_epi32(32),
            );
            let b_hi = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_b0 as i32), fca_vec_hi),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_b1 as i32), fc_vec_hi),
                ),
                _mm_set1_epi32(32),
            );

            let a_lo = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_a0 as i32), fca_vec_lo),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_a1 as i32), fc_vec_lo),
                ),
                _mm_set1_epi32(32),
            );
            let a_hi = _mm_add_epi32(
                _mm_add_epi32(
                    _mm_mullo_epi32(_mm_set1_epi32(ep_a0 as i32), fca_vec_hi),
                    _mm_mullo_epi32(_mm_set1_epi32(ep_a1 as i32), fc_vec_hi),
                ),
                _mm_set1_epi32(32),
            );

            let r = _mm_packus_epi32(_mm_srli_epi32(r_lo, 6), _mm_srli_epi32(r_hi, 6));
            let g = _mm_packus_epi32(_mm_srli_epi32(g_lo, 6), _mm_srli_epi32(g_hi, 6));
            let b = _mm_packus_epi32(_mm_srli_epi32(b_lo, 6), _mm_srli_epi32(b_hi, 6));
            let a = _mm_packus_epi32(_mm_srli_epi32(a_lo, 6), _mm_srli_epi32(a_hi, 6));

            let r8 = _mm_packus_epi16(r, _mm_setzero_si128());
            let g8 = _mm_packus_epi16(g, _mm_setzero_si128());
            let b8 = _mm_packus_epi16(b, _mm_setzero_si128());
            let a8 = _mm_packus_epi16(a, _mm_setzero_si128());

            let rg = _mm_unpacklo_epi8(r8, g8);
            let ba = _mm_unpacklo_epi8(b8, a8);
            let rgba0 = _mm_unpacklo_epi16(rg, ba);
            let rgba1 = _mm_unpackhi_epi16(rg, ba);

            let dst = outbuf.as_mut_ptr().add(base) as *mut __m128i;
            _mm_storeu_si128(dst, rgba0);
            _mm_storeu_si128(dst.add(1), rgba1);
        }
    }
}

#[derive(Copy, Clone)]
struct BitReader128 {
    bits: u128,
    bit_pos: u32,
}

static BC7_SUBSET_2: LazyLock<[[u8; 16]; 64]> = LazyLock::new(|| {
    let mut table = [[0u8; 16]; 64];
    for p in 0..64 {
        let mask = S_BPTC_P2[p];
        for (idx, cell) in table[p].iter_mut().enumerate() {
            *cell = ((mask >> idx) & 1) as u8;
        }
    }
    table
});

static BC7_SUBSET_3: LazyLock<[[u8; 16]; 64]> = LazyLock::new(|| {
    let mut table = [[0u8; 16]; 64];
    for p in 0..64 {
        let mask = S_BPTC_P3[p];
        for (idx, cell) in table[p].iter_mut().enumerate() {
            *cell = ((mask >> (2 * idx)) & 3) as u8;
        }
    }
    table
});

static BC7_ANCHOR_2: LazyLock<[u8; 64]> = LazyLock::new(|| {
    let mut table = [0u8; 64];
    for p in 0..64 {
        table[p] = S_BPTC_A2[p] as u8;
    }
    table
});

static BC7_ANCHOR_3: LazyLock<[[u8; 3]; 64]> = LazyLock::new(|| {
    let mut table = [[0u8; 3]; 64];
    for p in 0..64 {
        table[p][0] = 0;
        table[p][1] = S_BPTC_A3[0][p] as u8;
        table[p][2] = S_BPTC_A3[1][p] as u8;
    }
    table
});

#[derive(Copy, Clone)]
struct Bc7IndexTable {
    subset: [u8; 16],
    idx_pos0: [u8; 16],
    idx_bits0: [u8; 16],
    idx_pos1: [u8; 16],
    idx_bits1: [u8; 16],
}

static BC7_INDEX_TABLES: LazyLock<[[Bc7IndexTable; 64]; 8]> = LazyLock::new(|| {
    let mut tables = [[Bc7IndexTable {
        subset: [0u8; 16],
        idx_pos0: [0u8; 16],
        idx_bits0: [0u8; 16],
        idx_pos1: [0u8; 16],
        idx_bits1: [0u8; 16],
    }; 64]; 8];

    for mode in 0..8 {
        let mi = &S_BP7_MODE_INFO[mode];
        let has_index_bits1 = mi.index_bits[1] != 0;

        for p in 0..64 {
            let subset_table_2 = &BC7_SUBSET_2[p];
            let subset_table_3 = &BC7_SUBSET_3[p];
            let anchor_2 = BC7_ANCHOR_2[p] as usize;
            let anchor_3 = &BC7_ANCHOR_3[p];

            let mut pos0 = 0usize;
            let mut pos1 = mi.num_subsets * (16 * mi.index_bits[0] - 1);

            for idx in 0..16 {
                let subset_index = match mi.num_subsets {
                    2 => subset_table_2[idx] as usize,
                    3 => subset_table_3[idx] as usize,
                    _ => 0,
                };

                let index_anchor = match mi.num_subsets {
                    2 if subset_index != 0 => anchor_2,
                    3 => anchor_3[subset_index] as usize,
                    _ => 0,
                };

                let anchor = idx == index_anchor;
                let bits0 = (mi.index_bits[0] - anchor as usize) as u8;
                let bits1 = if has_index_bits1 {
                    (mi.index_bits[1] - anchor as usize) as u8
                } else {
                    0
                };

                tables[mode][p].subset[idx] = subset_index as u8;
                tables[mode][p].idx_pos0[idx] = pos0 as u8;
                tables[mode][p].idx_bits0[idx] = bits0;
                tables[mode][p].idx_pos1[idx] = pos1 as u8;
                tables[mode][p].idx_bits1[idx] = bits1;

                pos0 += bits0 as usize;
                pos1 += bits1 as usize;
            }
        }
    }

    tables
});

pub(crate) struct Bc7IndexTablesFlat {
    pub(crate) subset: [u8; 8 * 64 * 16],
    pub(crate) idx_pos0: [u8; 8 * 64 * 16],
    pub(crate) idx_bits0: [u8; 8 * 64 * 16],
    pub(crate) idx_pos1: [u8; 8 * 64 * 16],
    pub(crate) idx_bits1: [u8; 8 * 64 * 16],
}

static BC7_INDEX_TABLES_FLAT: LazyLock<Bc7IndexTablesFlat> = LazyLock::new(|| {
    let mut flat = Bc7IndexTablesFlat {
        subset: [0u8; 8 * 64 * 16],
        idx_pos0: [0u8; 8 * 64 * 16],
        idx_bits0: [0u8; 8 * 64 * 16],
        idx_pos1: [0u8; 8 * 64 * 16],
        idx_bits1: [0u8; 8 * 64 * 16],
    };

    for mode in 0..8 {
        for p in 0..64 {
            let table = &BC7_INDEX_TABLES[mode][p];
            for idx in 0..16 {
                let offset = (mode * 64 + p) * 16 + idx;
                flat.subset[offset] = table.subset[idx];
                flat.idx_pos0[offset] = table.idx_pos0[idx];
                flat.idx_bits0[offset] = table.idx_bits0[idx];
                flat.idx_pos1[offset] = table.idx_pos1[idx];
                flat.idx_bits1[offset] = table.idx_bits1[idx];
            }
        }
    }

    flat
});

pub(crate) fn bc7_index_tables_flat() -> &'static Bc7IndexTablesFlat {
    &BC7_INDEX_TABLES_FLAT
}

impl BitReader128 {
    #[inline]
    fn new(data: &[u8]) -> Self {
        let mut bytes = [0u8; 16];
        bytes.copy_from_slice(&data[..16]);
        Self {
            bits: u128::from_le_bytes(bytes),
            bit_pos: 0,
        }
    }

    #[inline]
    fn read(&mut self, num_bits: usize) -> u16 {
        let val = self.peek(0, num_bits);
        self.bit_pos += num_bits as u32;
        val
    }

    #[inline]
    fn peek(&self, offset: usize, num_bits: usize) -> u16 {
        if num_bits == 0 {
            return 0;
        }
        let shift = (self.bit_pos as usize + offset) & 127;
        let mask = (1u128 << num_bits) - 1;
        ((self.bits >> shift) & mask) as u16
    }

    #[inline]
    fn read_at(&self, bit_pos: usize, num_bits: usize) -> u16 {
        if num_bits == 0 {
            return 0;
        }
        let shift = bit_pos & 127;
        let mask = (1u128 << num_bits) - 1;
        ((self.bits >> shift) & mask) as u16
    }

    #[inline]
    fn pos(&self) -> usize {
        self.bit_pos as usize
    }
}
