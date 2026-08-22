use std::{collections::HashMap, hash::Hash, io};
use varint_rs::VarintWriter;

pub trait ToBytes: Send + Sync + Sized {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()>;
}

impl ToBytes for u8 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_u8_varint(*self)
    }
}

impl ToBytes for u16 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_u16_varint(*self)
    }
}

impl ToBytes for u32 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_u32_varint(*self)
    }
}

impl ToBytes for u64 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_u64_varint(*self)
    }
}

impl ToBytes for usize {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_usize_varint(*self)
    }
}

impl ToBytes for i8 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i8_varint(*self)
    }
}

impl ToBytes for i16 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i16_varint(*self)
    }
}

impl ToBytes for i32 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i32_varint(*self)
    }
}

impl ToBytes for i64 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i64_varint(*self)
    }
}

impl ToBytes for isize {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_isize_varint(*self)
    }
}

impl ToBytes for bool {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i8_varint(if *self { 1 } else { 0 })
    }
}

impl ToBytes for f32 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_all(&self.to_le_bytes())
    }
}

impl ToBytes for f64 {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_all(&self.to_le_bytes())
    }
}

impl ToBytes for String {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_usize_varint(self.len())?;
        w.write_all(self.as_bytes())
    }
}

impl ToBytes for &str {
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_usize_varint(self.len())?;
        w.write_all(self.as_bytes())
    }
}

impl<T> ToBytes for Vec<T>
where
    T: ToBytes,
{
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i32_varint(self.len() as i32)?;

        for item in self {
            item.to_bytes(w)?;
        }

        Ok(())
    }
}

impl<K, V> ToBytes for HashMap<K, V>
where
    K: ToBytes + Eq + Hash,
    V: ToBytes,
{
    fn to_bytes<W: io::Seek + io::Write>(&self, w: &mut W) -> io::Result<()> {
        w.write_i32_varint(self.len() as i32)?;

        for (k, v) in self {
            k.to_bytes(w)?;
            v.to_bytes(w)?;
        }

        Ok(())
    }
}

impl<T> ToBytes for Box<T>
where
    T: ToBytes,
{
    fn to_bytes<W: io::Seek + io::Write>(&self, _: &mut W) -> io::Result<()> {
        unimplemented!("ToBytes for Box<T>")
    }
}
