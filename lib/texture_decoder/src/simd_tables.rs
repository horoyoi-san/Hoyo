use std::sync::LazyLock;

pub static BC1_INDICES: LazyLock<[[u8; 8]; 65536]> = LazyLock::new(|| {
    let mut table = [[0u8; 8]; 65536];
    for v in 0u16..=u16::MAX {
        let mut idx = v;
        for cell in table[v as usize].iter_mut() {
            *cell = (idx & 3) as u8;
            idx >>= 2;
        }
    }
    table
});

pub static ALPHA_IDX_12: LazyLock<[[u8; 4]; 4096]> = LazyLock::new(|| {
    let mut table = [[0u8; 4]; 4096];
    for (v, row) in table.iter_mut().enumerate() {
        let mut x = v;
        for cell in row.iter_mut() {
            *cell = (x & 7) as u8;
            x >>= 3;
        }
    }
    table
});
