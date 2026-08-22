use std::arch::x86_64::*;

use crate::keys::{AES_LOOKUP_SBOX_INV, AES_SHIFT_ROWS_TABLE_INV};

#[target_feature(enable = "avx2")]
pub unsafe fn decrypt(m: &mut [u8], keys: &[u8]) {
    unsafe {
        let mut block = _mm_loadu_si128(m.as_ptr() as *const __m128i);

        let k0 = _mm_loadu_si128(keys.as_ptr() as *const __m128i);
        block = _mm_xor_si128(block, k0);

        for i in 1..10 {
            let mut temp = [0u8; 16];

            // SubBytesInv
            {
                _mm_storeu_si128(temp.as_mut_ptr() as *mut __m128i, block);
                for b in &mut temp {
                    *b = AES_LOOKUP_SBOX_INV[*b as usize];
                }
                block = _mm_loadu_si128(temp.as_ptr() as *const __m128i);
            }

            // ShiftRowsInv
            {
                let shift_mask =
                    _mm_setr_epi8(0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2, 15, 12, 9, 6, 3);
                block = _mm_shuffle_epi8(block, shift_mask);
            }

            // MixColsInv
            {
                _mm_storeu_si128(temp.as_mut_ptr() as *mut __m128i, block);
                for off in (0..16).step_by(4) {
                    let a0 = temp[off] as usize;
                    let a1 = temp[off + 1] as usize;
                    let a2 = temp[off + 2] as usize;
                    let a3 = temp[off + 3] as usize;
                    temp[off] = super::keys::AES_LOOKUP_G14[a0]
                        ^ super::keys::AES_LOOKUP_G9[a3]
                        ^ super::keys::AES_LOOKUP_G13[a2]
                        ^ super::keys::AES_LOOKUP_G11[a1];
                    temp[off + 1] = super::keys::AES_LOOKUP_G14[a1]
                        ^ super::keys::AES_LOOKUP_G9[a0]
                        ^ super::keys::AES_LOOKUP_G13[a3]
                        ^ super::keys::AES_LOOKUP_G11[a2];
                    temp[off + 2] = super::keys::AES_LOOKUP_G14[a2]
                        ^ super::keys::AES_LOOKUP_G9[a1]
                        ^ super::keys::AES_LOOKUP_G13[a0]
                        ^ super::keys::AES_LOOKUP_G11[a3];
                    temp[off + 3] = super::keys::AES_LOOKUP_G14[a3]
                        ^ super::keys::AES_LOOKUP_G9[a2]
                        ^ super::keys::AES_LOOKUP_G13[a1]
                        ^ super::keys::AES_LOOKUP_G11[a0];
                }
                block = _mm_loadu_si128(temp.as_ptr() as *const __m128i);
            }

            //XorRoundKey
            {
                let ki = _mm_loadu_si128(keys.as_ptr().add(i * 16) as *const __m128i);
                block = _mm_xor_si128(block, ki);
            }
        }

        let mut final_temp = [0u8; 16];
        _mm_storeu_si128(final_temp.as_mut_ptr() as *mut __m128i, block);
        for b in &mut final_temp {
            *b = super::keys::AES_LOOKUP_SBOX_INV[*b as usize];
        }
        block = _mm_loadu_si128(final_temp.as_ptr() as *const __m128i);

        let shift_mask = _mm_setr_epi8(0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2, 15, 12, 9, 6, 3);
        block = _mm_shuffle_epi8(block, shift_mask);

        let k10 = _mm_loadu_si128(keys.as_ptr().add(0xA0) as *const __m128i);
        block = _mm_xor_si128(block, k10);

        _mm_storeu_si128(m.as_mut_ptr() as *mut __m128i, block);
    }
}

#[expect(unused)]
fn decrypt_normal(m: &mut [u8], keys: &[u8]) {
    let mut c = [0u8; 16];
    unsafe {
        std::ptr::copy(m.as_mut_ptr(), c.as_mut_ptr(), 16);
    }
    xor_round_key(&mut c, keys, 0);

    for i in 0..9 {
        sub_bytes_inv(&mut c);
        shift_rows_inv(&mut c);
        mix_cols_inv(&mut c);
        xor_round_key(&mut c, keys, i + 1);
    }

    sub_bytes_inv(&mut c);
    shift_rows_inv(&mut c);
    xor_round_key(&mut c, keys, 10);
    unsafe {
        std::ptr::copy(c.as_mut_ptr(), m.as_mut_ptr(), 16);
    }
}

#[inline]
fn sub_bytes_inv(a: &mut [u8]) {
    for b in a.iter_mut() {
        *b = AES_LOOKUP_SBOX_INV[*b as usize];
    }
}

#[inline]
fn xor_round_key(state: &mut [u8], keys: &[u8], round: i32) {
    for i in 0..16 {
        state[i] ^= keys[i + (round as usize) * 16];
    }
}

#[inline]
fn shift_rows_inv(state: &mut [u8]) {
    let mut temp = [0u8; 16];
    unsafe {
        std::ptr::copy(state.as_mut_ptr(), temp.as_mut_ptr(), 16);
    }
    for i in 0..16 {
        state[i] = temp[AES_SHIFT_ROWS_TABLE_INV[i] as usize];
    }
}

#[inline]
fn mix_col_inv(state: &mut [u8], off: i32) {
    let a0 = state[off as usize];
    let a1 = state[(off + 1) as usize];
    let a2 = state[(off + 2) as usize];
    let a3 = state[(off + 3) as usize];
    state[off as usize] = super::keys::AES_LOOKUP_G14[a0 as usize]
        ^ super::keys::AES_LOOKUP_G9[a3 as usize]
        ^ super::keys::AES_LOOKUP_G13[a2 as usize]
        ^ super::keys::AES_LOOKUP_G11[a1 as usize];
    state[(off + 1) as usize] = super::keys::AES_LOOKUP_G14[a1 as usize]
        ^ super::keys::AES_LOOKUP_G9[a0 as usize]
        ^ super::keys::AES_LOOKUP_G13[a3 as usize]
        ^ super::keys::AES_LOOKUP_G11[a2 as usize];
    state[(off + 2) as usize] = super::keys::AES_LOOKUP_G14[a2 as usize]
        ^ super::keys::AES_LOOKUP_G9[a1 as usize]
        ^ super::keys::AES_LOOKUP_G13[a0 as usize]
        ^ super::keys::AES_LOOKUP_G11[a3 as usize];
    state[(off + 3) as usize] = super::keys::AES_LOOKUP_G14[a3 as usize]
        ^ super::keys::AES_LOOKUP_G9[a2 as usize]
        ^ super::keys::AES_LOOKUP_G13[a1 as usize]
        ^ super::keys::AES_LOOKUP_G11[a0 as usize];
}

#[inline]
fn mix_cols_inv(state: &mut [u8]) {
    mix_col_inv(state, 0);
    mix_col_inv(state, 4);
    mix_col_inv(state, 8);
    mix_col_inv(state, 12);
}
