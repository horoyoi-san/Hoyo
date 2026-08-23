use std::collections::HashMap;

pub(super) fn compress_u32(value: u32, out: &mut Vec<u8>) {
    if value < 0x80 {
        out.push(value as u8);
    } else if value < 0x4000 {
        out.push((value >> 8) as u8 | 0x80);
        out.push(value as u8);
    } else {
        out.push((value >> 24) as u8 | 0xC0);
        out.push((value >> 16) as u8);
        out.push((value >> 8) as u8);
        out.push(value as u8);
    }
}

#[derive(Default)]
pub(super) struct StringHeap {
    data: Vec<u8>,
    index: HashMap<String, u32>,
}

impl StringHeap {
    pub(super) fn new() -> Self {
        Self {
            data: vec![0],
            index: HashMap::new(),
        }
    }

    pub(super) fn add(&mut self, value: &str) -> u32 {
        if value.is_empty() {
            return 0;
        }
        if let Some(&offset) = self.index.get(value) {
            return offset;
        }
        let offset = self.data.len() as u32;
        self.data.extend_from_slice(value.as_bytes());
        self.data.push(0);
        self.index.insert(value.to_owned(), offset);
        offset
    }

    pub(super) fn into_bytes(self) -> Vec<u8> {
        self.data
    }
}

#[derive(Default)]
pub(super) struct BlobHeap {
    data: Vec<u8>,
    index: HashMap<Vec<u8>, u32>,
}

impl BlobHeap {
    pub(super) fn new() -> Self {
        Self {
            data: vec![0],
            index: HashMap::new(),
        }
    }

    pub(super) fn add(&mut self, blob: &[u8]) -> u32 {
        if blob.is_empty() {
            return 0;
        }
        if let Some(&offset) = self.index.get(blob) {
            return offset;
        }
        let offset = self.data.len() as u32;
        compress_u32(blob.len() as u32, &mut self.data);
        self.data.extend_from_slice(blob);
        self.index.insert(blob.to_vec(), offset);
        offset
    }

    pub(super) fn into_bytes(self) -> Vec<u8> {
        self.data
    }
}

#[derive(Default)]
pub(super) struct GuidHeap {
    guids: Vec<[u8; 16]>,
}

impl GuidHeap {
    pub(super) fn new() -> Self {
        Self { guids: Vec::new() }
    }

    pub(super) fn add(&mut self, guid: [u8; 16]) -> u32 {
        self.guids.push(guid);
        self.guids.len() as u32
    }

    pub(super) fn into_bytes(self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.guids.len() * 16);
        for guid in self.guids {
            out.extend_from_slice(&guid);
        }
        out
    }
}

pub(super) fn deterministic_mvid(seed: &str) -> [u8; 16] {
    let mut guid = [0u8; 16];
    for (chunk, salt) in guid.chunks_mut(8).zip([0u64, 0x9E37_79B9_7F4A_7C15u64]) {
        let mut hash = 0xcbf2_9ce4_8422_2325u64 ^ salt;
        for byte in seed.bytes() {
            hash ^= u64::from(byte);
            hash = hash.wrapping_mul(0x0000_0100_0000_01B3);
        }
        chunk.copy_from_slice(&hash.to_le_bytes());
    }
    guid[7] = (guid[7] & 0x0F) | 0x40;
    guid[8] = (guid[8] & 0x3F) | 0x80;
    guid
}
