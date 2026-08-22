use std::fmt::{Display, Write as _};
use varint_rs::VarintReader;

use super::{FromBytes, ToBytes};

#[derive(Debug)]
pub struct ExistFlag {
    pub data: Vec<u64>,
    field_length: usize,
}

impl ExistFlag {
    pub fn empty(field_length: usize) -> Self {
        Self {
            data: vec![0; field_length.max(1usize).div_ceil(64)],
            field_length,
        }
    }

    pub fn new<R: std::io::Read + std::io::Seek>(
        r: &mut R,
        field_length: usize,
    ) -> std::io::Result<Self> {
        let num_varints = field_length.max(1usize).div_ceil(64);
        let mut data = Vec::with_capacity(num_varints);
        for _ in 0..num_varints {
            data.push(r.read_u64_varint()?);
        }
        Ok(Self { data, field_length })
    }

    pub fn exists(&self, index: usize) -> bool {
        assert!(
            index < self.field_length,
            "out of bound field index: {index}"
        );

        let segment_idx = index / 64;
        let bit_idx = index % 64;
        ((self.data[segment_idx] >> bit_idx) & 1) != 0
    }

    pub fn toggle(&mut self, index: usize, value: bool) {
        if index >= self.field_length {
            panic!("out of bound field index: {index}");
        }
        let segment_idx = index / 64;
        let bit_idx = index % 64;
        if value {
            self.data[segment_idx] |= 1 << bit_idx;
        } else {
            self.data[segment_idx] &= !(1 << bit_idx);
        }
    }
}

impl ToBytes for ExistFlag {
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        for value in &self.data {
            value.to_bytes(w)?;
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct ByteHash16(Vec<u8>);

impl FromBytes for ByteHash16 {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        let mut full_hash = [0u8; 16];
        for i in 0..4 {
            let mut chunk = vec![0u8; 4];
            r.read_exact(&mut chunk)?;
            for j in 0..4 {
                full_hash[i * 4 + j] = chunk[3 - j];
            }
        }
        Ok(Self(full_hash.to_vec()))
    }
}

impl Display for ByteHash16 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0.iter().fold(String::new(), |mut output, b| {
            let _ = output.write_str(&format!("{b:02x}"));
            output
        }))?;
        Ok(())
    }
}
