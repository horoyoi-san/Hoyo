use std::io::{self, Read};

fn read_i32<R: Read>(r: &mut R) -> io::Result<i32> {
    let mut buf = [0u8; 4];
    r.read_exact(&mut buf)?;
    Ok(i32::from_be_bytes(buf))
}

fn read_u32<R: Read>(r: &mut R) -> io::Result<u32> {
    let mut buf = [0u8; 4];
    r.read_exact(&mut buf)?;
    Ok(u32::from_be_bytes(buf))
}

fn read_i64<R: Read>(r: &mut R) -> io::Result<i64> {
    let mut buf = [0u8; 8];
    r.read_exact(&mut buf)?;
    Ok(i64::from_be_bytes(buf))
}

fn read_u8<R: Read>(r: &mut R) -> io::Result<u8> {
    let mut buf = [0u8; 1];
    r.read_exact(&mut buf)?;
    Ok(buf[0])
}

pub struct DataEntry {
    pub name_hash: i32,
    pub size: u32,
    pub offset: u32,
}

impl DataEntry {
    pub fn read<R: Read>(r: &mut R) -> io::Result<Self> {
        Ok(Self {
            name_hash: read_i32(r)?,
            size: read_u32(r)?,
            offset: read_u32(r)?,
        })
    }
}

pub struct FileEntry {
    pub file_byte_name: [u8; 16],
    pub data_entries: Vec<DataEntry>,
}

impl FileEntry {
    pub fn read<R: Read>(r: &mut R) -> io::Result<Self> {
        let name_hash = read_i32(r)?;
        let mut file_byte_name = [0u8; 16];
        r.read_exact(&mut file_byte_name)?;
        let _size = read_i64(r)?;
        let data_count = read_i32(r)?;
        let mut data_entries = Vec::with_capacity(data_count as usize);
        for _ in 0..data_count {
            data_entries.push(DataEntry::read(r)?);
        }
        read_u8(r)?;
        read_u8(r)?;
        read_u8(r)?;
        let _ = name_hash;
        Ok(Self {
            file_byte_name,
            data_entries,
        })
    }
}

pub struct DesignIndex {
    pub file_count: i32,
    pub design_data_count: i32,
    pub file_list: Vec<FileEntry>,
}

impl DesignIndex {
    pub fn read<R: Read>(r: &mut R) -> io::Result<Self> {
        let _unk_i64 = read_i64(r)?;
        let file_count = read_i32(r)?;
        let design_data_count = read_i32(r)?;
        let mut file_list = Vec::with_capacity(file_count as usize);
        for _ in 0..file_count {
            file_list.push(FileEntry::read(r)?);
        }
        Ok(Self {
            file_count,
            design_data_count,
            file_list,
        })
    }
}

pub fn hex_name(bytes: &[u8; 16]) -> String {
    let mut s = String::with_capacity(32);
    for b in bytes {
        s.push_str(&format!("{b:02x}"));
    }
    s
}
