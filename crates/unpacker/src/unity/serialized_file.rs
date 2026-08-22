use std::{cell::RefCell, rc::Rc};

use anyhow::Result;

use crate::{
    GameType,
    binary_reader::{BinaryReader, ByteOrder},
    unity::{object::ObjectInfo, serialized_type::SerializedType},
};

#[derive(Default, Debug)]
pub struct SerializedFileHeader {
    pub game_type: GameType,
    pub metadata_size: u32,
    pub file_size: u32,
    pub version: u32,
    pub data_offset: u32,
    pub endian: ByteOrder,
    pub reserved: [u8; 3],
    pub unknown: i64,
}

impl SerializedFileHeader {
    pub fn from_reader(r: &mut BinaryReader, game_type: GameType) -> Result<Self> {
        let mut header = SerializedFileHeader {
            game_type,
            metadata_size: r.read_u32()?,
            file_size: r.read_u32()?,
            version: r.read_u32()?,
            data_offset: r.read_u32()?,
            ..Default::default()
        };

        if header.version >= 9 {
            header.endian = if r.read_u8()? == 0 {
                ByteOrder::Little
            } else {
                ByteOrder::Big
            };
            header.reserved = r.read_u8_list(3)?.try_into().unwrap();
        } else {
            r.set_offset((header.file_size - header.metadata_size) as usize)?;
            header.endian = if r.read_u8()? == 0 {
                ByteOrder::Little
            } else {
                ByteOrder::Big
            };
        }

        if header.version >= 22 {
            header.metadata_size = r.read_u32()?;
            header.file_size = r.read_u32()?;
            header.data_offset = r.read_u32()?;
            header.unknown = r.read_i64()?;
        }

        Ok(header)
    }
}

#[derive(Debug, Default)]
pub struct SerializedFile {
    pub header: SerializedFileHeader,
    pub version: String,
    pub target_platform: u32,
    pub enable_type_tree: bool,
    pub types: Vec<Rc<RefCell<SerializedType>>>,
    pub big_id: i32,
    pub objects: Vec<ObjectInfo>,
    pub script_types: Vec<LocalSerializedObjectIdentifier>,
    pub externals: Vec<FileIdentifier>,
    pub ref_types: Vec<Rc<RefCell<SerializedType>>>,
    pub user_information: String,
}

impl SerializedFile {
    pub fn from_bytes(data: &[u8], game_type: GameType) -> Result<Self> {
        let mut r = BinaryReader::new(data, ByteOrder::Big);

        let mut file = SerializedFile {
            header: SerializedFileHeader::from_reader(&mut r, game_type)?,
            ..Default::default()
        };

        r.set_endianess(file.header.endian);

        if file.header.version >= 7 {
            file.version = r.read_string_util_null()?;
        }

        if file.header.version >= 8 {
            file.target_platform = r.read_u32()?;
        }

        if file.header.version >= 13 {
            file.enable_type_tree = r.read_bool()?;
        }

        let type_count = r.read_i32()?;
        for _ in 0..type_count {
            file.types
                .push(Rc::new(RefCell::new(SerializedType::from_reader(
                    &mut r, &file, false,
                )?)));
        }

        if file.header.version >= 7 && file.header.version < 14 {
            file.big_id = r.read_i32()?;
        }

        let object_count = r.read_i32()?;
        for _ in 0..object_count {
            file.objects.push(ObjectInfo::from_reader(&mut r, &file)?);
        }

        if file.header.version >= 11 {
            let script_count = r.read_i32()?;
            for _ in 0..script_count {
                file.script_types.push(LocalSerializedObjectIdentifier {
                    local_serialized_file_index: r.read_i32()?,
                    local_identifier_in_file: if file.header.version < 14 {
                        r.read_i32()? as i64
                    } else {
                        r.align(4)?;
                        r.read_i64()?
                    },
                });
            }
        }

        let externals_count = r.read_i32()?;
        for _ in 0..externals_count {
            let mut external = FileIdentifier::default();

            if file.header.version >= 6 {
                r.read_string_util_null()?;
            }

            if file.header.version >= 5 {
                external.guid = r.read_u8_array()?;
                external.type_ = r.read_i32()?;
            }

            external.path_name = r.read_string_util_null()?;

            file.externals.push(external);
        }

        if file.header.version >= 20 {
            let ref_type_count = r.read_i32()?;
            for _ in 0..ref_type_count {
                file.ref_types
                    .push(Rc::new(RefCell::new(SerializedType::from_reader(
                        &mut r, &file, true,
                    )?)));
            }
        }

        if file.header.version >= 5 {
            file.user_information = r.read_string_util_null()?;
        }

        Ok(file)
    }
}

#[derive(Debug, Default)]
pub struct LocalSerializedObjectIdentifier {
    pub local_serialized_file_index: i32,
    pub local_identifier_in_file: i64,
}

#[derive(Default, Debug)]
pub struct FileIdentifier {
    pub guid: [u8; 16],
    pub type_: i32,
    pub path_name: String,
}
