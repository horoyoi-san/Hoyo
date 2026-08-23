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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    #[test]
    fn flag_toggle_and_read() {
        let mut flag = ExistFlag::empty(130);
        assert!(!flag.exists(0));
        assert!(!flag.exists(129));

        flag.toggle(0, true);
        flag.toggle(129, true);
        assert!(flag.exists(0));
        assert!(flag.exists(129));
        assert!(!flag.exists(1));

        flag.toggle(0, false);
        assert!(!flag.exists(0));
    }

    #[test]
    fn flag_roundtrip_through_varint() {
        let mut flag = ExistFlag::empty(100);
        flag.toggle(3, true);
        flag.toggle(64, true);

        let mut buf = Cursor::new(Vec::new());
        flag.to_bytes(&mut buf).unwrap();
        buf.set_position(0);

        let restored = ExistFlag::new(&mut buf, 100).unwrap();
        assert!(restored.exists(3));
        assert!(restored.exists(64));
        assert!(!restored.exists(4));
    }

    #[test]
    #[should_panic(expected = "out of bound field index")]
    fn flag_out_of_bounds_panics() {
        let flag = ExistFlag::empty(10);
        flag.exists(10);
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
