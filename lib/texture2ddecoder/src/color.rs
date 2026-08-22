#![allow(clippy::too_many_arguments)]

pub static TRANSPARENT_MASK: u32 = {
    #[cfg(target_endian = "little")]
    {
        0x00ffffff
    }
    #[cfg(target_endian = "big")]
    {
        0xffffff00
    }
};

pub static TRANSPARENT_SHIFT: u32 = {
    #[cfg(target_endian = "little")]
    {
        24
    }
    #[cfg(target_endian = "big")]
    {
        0
    }
};

#[inline]
pub const fn color(r: u8, g: u8, b: u8, a: u8) -> u32 {
    u32::from_le_bytes([r, g, b, a])
}

#[inline]
pub const fn rgb565_le(d: u16) -> (u8, u8, u8) {
    (
        (d >> 8 & 0xf8) as u8 | (d >> 13) as u8,
        (d >> 3 & 0xfc) as u8 | (d >> 9 & 3) as u8,
        (d << 3) as u8 | (d >> 2 & 7) as u8,
    )
}

#[inline]
pub unsafe fn copy_block_buffer(
    bx: usize,
    by: usize,
    w: usize,
    h: usize,
    bw: usize,
    bh: usize,
    buffer: &[u32],
    image: &mut [u32],
) {
    let x: usize = bw * bx;
    let copy_width: usize = if bw * (bx + 1) > w { w - bw * bx } else { bw };

    let y_0 = by * bh;
    let copy_height: usize = if bh * (by + 1) > h { h - y_0 } else { bh };

    let image_ptr = image.as_mut_ptr();
    let buffer_ptr = buffer.as_ptr();

    for y in y_0..y_0 + copy_height {
        let flipped_y = h - 1 - y;
        let image_offset = flipped_y * w + x;
        let buffer_offset = (y - y_0) * bw;

        let dst = image_ptr.add(image_offset);
        let src = buffer_ptr.add(buffer_offset);

        core::ptr::copy_nonoverlapping(src, dst, copy_width);
    }
}
