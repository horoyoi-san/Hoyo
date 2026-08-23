#[inline]
const fn __builtin_clz(x: u32) -> u32 {
    let mut ret: u32 = 0;
    let mut x = x;
    let mut i = 0;
    loop {
        if (x & 0x80000000 != 0) | (i == 32) {
            break;
        }
        ret += 1;
        x <<= 1;
        i += 1;
    }
    ret
}

#[inline]
fn fp32_from_bits(x: u32) -> f32 {
    f32::from_le_bytes(u32::to_le_bytes(x))
}

#[inline]
fn fp32_to_bits(x: f32) -> u32 {
    u32::from_le_bytes(f32::to_le_bytes(x))
}

#[inline]
pub fn fp16_ieee_to_fp32_value(h: u16) -> f32 {
    let w: u32 = (h as u32) << 16;
    let sign: u32 = w & 0x80000000;
    let two_w: u32 = w.overflowing_add(w).0;
    let exp_offset: u32 = 0xE0 << 23;
    let exp_scale: f32 = fp32_from_bits(0x7800000);
    let normalized_value: f32 = fp32_from_bits((two_w >> 4) + exp_offset) * exp_scale;
    let magic_mask: u32 = 126 << 23;
    let magic_bias: f32 = 0.5;
    let denormalized_value: f32 = fp32_from_bits((two_w >> 17) | magic_mask) - magic_bias;
    let denormalized_cutoff: u32 = 1 << 27;
    let result: u32 = sign
        | (if two_w < denormalized_cutoff {
            fp32_to_bits(denormalized_value)
        } else {
            fp32_to_bits(normalized_value)
        });
    fp32_from_bits(result)
}
