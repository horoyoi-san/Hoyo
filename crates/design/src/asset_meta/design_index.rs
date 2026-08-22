use byteorder::{BE, ReadBytesExt, WriteBytesExt};
use std::fmt::Write;
use crate::bytes::{FromBytes, ToBytes};

#[derive(Debug, Clone)]
pub struct DesignIndex {
    pub unk_i64: i64,
    pub file_count: i32,
    pub design_data_count: i32,
    pub file_list: Vec<FileEntry>,
}

impl FromBytes for DesignIndex {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        let mut result = DesignIndex {
            unk_i64: r.read_i64::<BE>()?,
            file_count: r.read_i32::<BE>()?,
            design_data_count: r.read_i32::<BE>()?,
            file_list: vec![],
        };

        for _ in 0..result.file_count {
            result.file_list.push(FileEntry::from_bytes(r)?);
        }

        Ok(result)
    }
}

impl ToBytes for DesignIndex {
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        w.write_i64::<BE>(self.unk_i64)?;
        w.write_i32::<BE>(self.file_count)?;
        w.write_i32::<BE>(self.design_data_count)?;

        for file in &self.file_list {
            file.to_bytes(w)?;
        }

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct FileEntry {
    pub name_hash: i32,
    pub file_byte_name: String,
    pub size: i64,
    pub data_count: i32,
    pub data_entries: Vec<DataEntry>,
    pub tag: Tag,
}

impl FromBytes for FileEntry {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        let mut result = Self {
            name_hash: r.read_i32::<BE>()?,
            file_byte_name: {
                let mut buf = vec![0u8; 16];
                r.read_exact(&mut buf)?;
                buf.iter().fold(String::with_capacity(16), |mut output, b| {
                    let _ = output.write_str(&format!("{b:02x}"));
                    output
                })
            },
            size: r.read_i64::<BE>()?,
            data_count: r.read_i32::<BE>()?,
            data_entries: vec![],
            tag: Tag::default(),
        };

        for _ in 0..result.data_count {
            result.data_entries.push(DataEntry::from_bytes(r)?);
        }

        result.tag = Tag::from_bytes(r)?;

        Ok(result)
    }
}

impl ToBytes for FileEntry {
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        w.write_i32::<BE>(self.name_hash)?;
        w.write_all(&hex::decode(&self.file_byte_name).map_err(|_| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid hex string")
        })?)?;
        w.write_i64::<BE>(self.size)?;
        w.write_i32::<BE>(self.data_count)?;

        for entry in &self.data_entries {
            entry.to_bytes(w)?;
        }

        self.tag.to_bytes(w)?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct DataEntry {
    pub name_hash: i32,
    pub size: u32,
    pub offset: u32,
}

impl FromBytes for DataEntry {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        Ok(Self {
            name_hash: r.read_i32::<BE>()?,
            size: r.read_u32::<BE>()?,
            offset: r.read_u32::<BE>()?,
        })
    }
}

impl ToBytes for DataEntry {
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        w.write_i32::<BE>(self.name_hash)?;
        w.write_u32::<BE>(self.size)?;
        w.write_u32::<BE>(self.offset)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct Tag(pub Option<String>);

impl FromBytes for Tag {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        let first = r.read_u8()?;
        if first == 0x80 {
            return Ok(Tag(None));
        }

        assert_eq!(0x0, first);

        let length = r.read_u8()?;
        let mut bytes = vec![0u8; length as usize];
        r.read_exact(&mut bytes)?;
        let end = r.read_u8()?;

        assert_eq!(0x80, end);

        Ok(Tag(Some(String::from_utf8_lossy(&bytes).to_string())))
    }
}

impl ToBytes for Tag {
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        if let Some(tag) = self.0.as_ref() {
            w.write_u8(0)?;
            w.write_u8(tag.len() as u8)?;
            w.write_all(tag.as_bytes())?;
            w.write_u8(0x80)?;
        } else {
            w.write_u8(0x80)?;
        }

        Ok(())
    }
}
