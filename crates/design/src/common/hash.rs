pub const fn get_32bit_hash_const(s: &str) -> i32 {
    let mut hash1: i32 = 5381;
    let mut hash2: i32 = hash1;

    let bytes = s.as_bytes();
    let length = bytes.len();

    let mut i = 0;
    while i < length {
        hash1 = ((hash1 << 5).wrapping_add(hash1)) ^ (bytes[i] as i32);

        if i + 1 < length {
            hash2 = ((hash2 << 5).wrapping_add(hash2)) ^ (bytes[i + 1] as i32);
        }

        i += 2;
    }

    hash1.wrapping_add(hash2.wrapping_mul(1566083941))
}

#[inline]
#[allow(dead_code)]
pub fn get_64bit_hash_const(s: &str) -> u64 {
    xxhash_rust::const_xxh64::xxh64(s.as_bytes(), 0)
}

pub const fn get_index_key_uint_uint(a: u32, b: u32) -> i32 {
    const GOLDEN_RATIO: u32 = 0x9E3779B9u32;

    let v9 = (a - b) ^ (b >> 13);
    let v10 = (GOLDEN_RATIO.wrapping_sub(v9).wrapping_sub(b)) ^ (v9 << 8);
    let v11 = (b.wrapping_sub(v9).wrapping_sub(v10)) ^ (v10 >> 13);
    let v12 = (v9.wrapping_sub(v10).wrapping_sub(v11)) ^ (v11 >> 12);
    let v13 = (v10.wrapping_sub(v11).wrapping_sub(v12)) ^ (v12 << 16);
    let v14 = (v11.wrapping_sub(v12).wrapping_sub(v13)) ^ (v13 >> 5);
    let v15 = (v12.wrapping_sub(v13).wrapping_sub(v14)) ^ (v14 >> 3);
    let temp = (v13.wrapping_sub(v14).wrapping_sub(v15)) ^ (v15 << 10);

    (v14.wrapping_sub(temp.wrapping_add(v15)) ^ (temp >> 15)) as i32
}
