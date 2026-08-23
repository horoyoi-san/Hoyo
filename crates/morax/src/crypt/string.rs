// PATTERN = FF 15 ? ? ? ? 4D 85 F7 8B 85 80 00 00 00
// il2cpp_class_get_namespace

use anyhow::{Result, anyhow};

use crate::pe::{Pe, read_u64};

pub fn decode(data: &[u8], base: usize, index: u32) -> Result<String> {
    if index == u32::MAX {
        return Ok(String::new());
    }

    // v16 = ((unsigned int)v1 >> 25) & 0x3F;        // offset
    // if ( v1 < 0 )
    // v16 = (unsigned __int8)((unsigned int)v1 >> 23);
    let (length, off_mask) = if (index as i32) < 0 {
        (((index >> 23) & 0xFF) as usize, 0x7FFFFF)
    } else {
        (((index >> 25) & 0x3F) as usize, 0x1FFFFFF)
    };
    if length == 0 {
        return Ok(String::new());
    }

    let string_offset = (index & off_mask) as usize;
    let data_offset = base + string_offset;
    let qword_count = length.div_ceil(8);

    // v116 = 0x907C49622D94D21AuLL * v115 + 0x75B679DAF67C3F24LL;
    let mut keystream = 0x75B679DAF67C3F24 + 0x907C49622D94D21A * (string_offset as u64);
    let mut out = Vec::with_capacity(qword_count * 8);
    for chunk_index in 0..qword_count {
        let encrypted = read_u64(data, data_offset + chunk_index * 8)?;
        out.extend_from_slice(&(encrypted ^ keystream).to_le_bytes());
        keystream += 0x3E693CD23A41FDEF; // v116 += 0x3E693CD23A41FDEFLL;
    }

    out.truncate(length);
    String::from_utf8(out).map_err(|error| anyhow!("invalid decoded UTF-8 string: {error}"))
}

// v117 = *(_DWORD *)(qword_8E5B118 + 0x1B4) - 0x72BC5B12;
pub fn head_block(pe: &Pe, hdr: u32) -> Result<u32> {
    Ok(pe.rd32(hdr + 0x1B4)? - 0x72BC5B12) // v117 = *(_DWORD *)(qword_8E5B118 + 0x1B4) - 0x72BC5B12;
}
