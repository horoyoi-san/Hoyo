use std::arch::x86_64::*;
use std::cmp;

use crate::{aes_blk, keys};

pub fn decrypt(data: &mut [u8]) {
    let mut key1 = [0u8; 0x10];
    let mut key2 = [0u8; 0x10];
    let mut key3 = [0u8; 0x10];

    key1.copy_from_slice(&data[4..0x14]);
    key2.copy_from_slice(&data[0x74..0x84]);
    key3.copy_from_slice(&data[0x84..0x94]);

    let encrypted_block_size = cmp::min(0x10 * ((data.len() - 0x94) >> 7), 0x400);

    for i in 0..cmp::min(key2.len(), keys::MR0K_INIT_VECTOR.len()) {
        key2[i] ^= keys::MR0K_INIT_VECTOR[i];
    }

    unsafe {
        aes_blk::decrypt(&mut key1, &keys::MR0K_EXPANSION_KEY);
        aes_blk::decrypt(&mut key3, &keys::MR0K_EXPANSION_KEY);
    }

    for i in 0..key1.len() {
        key1[i] ^= key3[i];
    }

    data[0x84..0x94].copy_from_slice(&key1);

    let seed1 = u64::from_le_bytes(key2[0..8].try_into().unwrap());
    let seed2 = u64::from_le_bytes(key3[0..8].try_into().unwrap());
    let seed = seed2 ^ seed1 ^ (seed1 + data.len() as u64 - 20);

    let encrypted_block = &mut data[0x94..0x94 + encrypted_block_size];
    let key = &keys::MR0K_BLOCK_KEY;
    let chunks = encrypted_block_size / 16;
    unsafe {
        let seed_vec = _mm_set1_epi64x(seed as i64);
        for i in 0..chunks {
            let off = i * 16;
            let b = _mm_loadu_si128(encrypted_block.as_ptr().add(off) as *const __m128i);
            let k = _mm_loadu_si128(key.as_ptr().add(off) as *const __m128i);
            let xored = _mm_xor_si128(_mm_xor_si128(b, k), seed_vec);
            _mm_storeu_si128(encrypted_block.as_mut_ptr().add(off) as *mut __m128i, xored);
        }
    }
}
