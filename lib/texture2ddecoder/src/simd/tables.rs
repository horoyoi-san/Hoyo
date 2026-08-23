#[repr(C, align(32))]
pub struct SimdTables {
    pub rgb565_to_rgba: [u32; 65536],
    pub fp16_to_fp32: [f32; 65536],
    pub bc3_alpha: [[u8; 8]; 65536],
    pub bc1_indices: [[u8; 8]; 65536],
}

impl SimdTables {
    pub fn new() -> Self {
        Self {
            rgb565_to_rgba: Self::build_rgb565_table(),
            fp16_to_fp32: Self::build_fp16_table(),
            bc3_alpha: Self::build_bc3_alpha_table(),
            bc1_indices: Self::build_bc1_indices(),
        }
    }

    fn build_rgb565_table() -> [u32; 65536] {
        let mut table = [0u32; 65536];
        for i in 0u16..=u16::MAX {
            let r = ((i >> 11) & 0x1f) as u8;
            let g = ((i >> 5) & 0x3f) as u8;
            let b = (i & 0x1f) as u8;

            let r8 = (r << 3) | (r >> 2);
            let g8 = (g << 2) | (g >> 4);
            let b8 = (b << 3) | (b >> 2);

            table[i as usize] = u32::from_le_bytes([r8, g8, b8, 255]);
        }
        table
    }

    fn build_fp16_table() -> [f32; 65536] {
        let mut table = [0.0f32; 65536];
        for h in 0u16..=u16::MAX {
            table[h as usize] = fp16_ieee_to_fp32_value(h);
        }
        table
    }

    fn build_bc3_alpha_table() -> [[u8; 8]; 65536] {
        let mut table = [[0u8; 8]; 65536];
        for a0 in 0..=u8::MAX {
            for a1 in 0..=u8::MAX {
                let idx = (a1 as usize) | ((a0 as usize) << 8);
                if a0 > a1 {
                    table[idx] = [
                        a0,
                        a1,
                        ((a0 * 6 + a1) / 7),
                        ((a0 * 5 + a1 * 2) / 7),
                        ((a0 * 4 + a1 * 3) / 7),
                        ((a0 * 3 + a1 * 4) / 7),
                        ((a0 * 2 + a1 * 5) / 7),
                        ((a0 + a1 * 6) / 7),
                    ];
                } else {
                    table[idx] = [
                        a0,
                        a1,
                        ((a0 * 4 + a1) / 5),
                        ((a0 * 3 + a1 * 2) / 5),
                        ((a0 * 2 + a1 * 3) / 5),
                        ((a0 + a1 * 4) / 5),
                        0,
                        255,
                    ];
                }
            }
        }
        table
    }

    fn build_bc1_indices() -> [[u8; 8]; 65536] {
        let mut table = [[0u8; 8]; 65536];
        for v in 0u16..=u16::MAX {
            let mut idx = v;
            for cell in table[v as usize].iter_mut() {
                *cell = (idx & 3) as u8;
                idx >>= 2;
            }
        }
        table
    }
}

#[inline]
fn fp16_ieee_to_fp32_value(h: u16) -> f32 {
    let w = (h as u32) << 16;
    let sign = w & 0x80000000;
    let two_w = w.wrapping_add(w);

    let exp_offset = 0xE0 << 23;
    let exp_scale = f32::from_bits(0x7800000);
    let normalized_value = f32::from_bits((two_w >> 4) + exp_offset) * exp_scale;

    let magic_mask = 126 << 23;
    let magic_bias = 0.5;
    let denormalized_value = f32::from_bits((two_w >> 17) | magic_mask) - magic_bias;

    let denormalized_cutoff = 1 << 27;
    let result = sign
        | if two_w < denormalized_cutoff {
            f32::to_bits(denormalized_value)
        } else {
            f32::to_bits(normalized_value)
        };
    f32::from_bits(result)
}

pub static SIMD_TABLES: std::sync::LazyLock<SimdTables> =
    std::sync::LazyLock::new(SimdTables::new);
