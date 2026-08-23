use crate::crypt::attributes::FieldAttributes;
use crate::crypt::field as field_crypt;
use crate::crypt::token;
use crate::error::Result;
use crate::metadata::Metadata;
use crate::pe::{read_i32, read_i64, read_u8, read_u16, read_u32, read_u64};
use crate::type_def::Il2CppTypeDefinition;

macro_rules! managed_float {
    ($v:expr) => {{
        let v = $v;
        if v.is_nan() {
            "NaN".to_owned()
        } else if v.is_infinite() {
            if v < 0.0 { "-Infinity" } else { "Infinity" }.to_owned()
        } else {
            serde_json::to_string(&v).unwrap_or_default()
        }
    }};
}

#[derive(Clone, Debug)]
pub struct Il2CppFieldDefinition {
    pub name: String,
    pub type_name: String,
    pub type_index: u32,
    pub flags: u16,
    pub offset: u32,
    pub token: u32,
    pub default_value: Option<String>,
}

impl Metadata {
    pub fn fields(
        &self,
        type_index: usize,
        type_def: &Il2CppTypeDefinition,
    ) -> Result<Vec<Il2CppFieldDefinition>> {
        let Some(field_start) = type_def.field_start else {
            return Ok(Vec::new());
        };

        let mut fields = Vec::with_capacity(type_def.field_count);
        for local_index in 0..type_def.field_count {
            let field_index = field_start + local_index;
            let entry_offset = self.header.payload_offset as usize
                + self.header.fields_offset as usize
                + field_index * field_crypt::ENTRY_SIZE;
            let raw = field_crypt::decrypt(
                &self.global_data,
                entry_offset,
                field_start as u32,
                local_index as u32,
            )?;

            let name = self.decode_string(raw.name_index)?;
            let type_name = self.type_csharp_name(raw.type_index)?;
            let flags = self.il2cpp_type(raw.type_index)?.attrs;
            let offset = self
                .field_offset(type_index, local_index)
                .unwrap_or_default();

            let default_value = self.field_default_value(field_index, flags)?;

            fields.push(Il2CppFieldDefinition {
                name,
                type_name,
                type_index: raw.type_index,
                flags,
                offset,
                token: token::field_token(field_index),
                default_value,
            });
        }
        Ok(fields)
    }

    fn field_default_value(&self, field_index: usize, flags: u16) -> Result<Option<String>> {
        if flags & FieldAttributes::Literal.bits() as u16 == 0 {
            return Ok(None);
        }
        let Some(&(type_index, data_offset)) = self.field_default_values.get(&field_index) else {
            return Ok(Some("0".to_owned()));
        };
        self.format_default_value(type_index, data_offset).map(Some)
    }

    fn format_default_value(&self, type_index: u32, data_offset: u32) -> Result<String> {
        let kind = self.il2cpp_type(type_index)?.kind;
        let base = self.header.payload_offset as usize
            + self.header.field_and_parameter_default_value_data_offset as usize
            + data_offset as usize;
        let data = &self.global_data;

        let value = match kind {
            0x02 | 0x04 | 0x05 => read_u8(data, base)?.to_string(),
            0x03 | 0x06 | 0x07 => read_u16(data, base)?.to_string(),
            0x08 | 0x09 | 0x11 | 0x12 | 0x15 | 0x1C | 0x1D | 0x2C => {
                read_i32(data, base)?.to_string()
            }
            0x0C => managed_float!(f32::from_bits(read_u32(data, base)?)),
            0x0D => managed_float!(f64::from_bits(read_u64(data, base)?)),
            0x0A | 0x0B => read_i64(data, base)?.to_string(),
            0x0E => {
                let length = read_i32(data, base)?.max(0) as usize;
                let start = base + 4;
                let bytes = data.get(start..start + length).unwrap_or_default();
                format!("\"{}\"", String::from_utf8_lossy(bytes))
            }
            _ => "0".to_owned(),
        };
        Ok(value)
    }

    fn field_offset(&self, type_index: usize, local_field_index: usize) -> Result<u32> {
        let map_offset = self.header.payload_offset as usize
            + self.header.field_offset_map_offset as usize
            + type_index * 4;
        let selector = read_i32(&self.global_data, map_offset)?;
        if selector < 0 {
            return Ok(0);
        }

        let group_offset = self.header.payload_offset as usize
            + self.header.field_offset_group_offset as usize
            + selector as usize * 12;
        let offset_start = read_u32(&self.global_data, group_offset + 8)? as usize;

        let offset_entry = self.header.payload_offset as usize
            + self.header.field_offset_offset as usize
            + (offset_start + local_field_index) * 4;
        Ok(read_u32(&self.global_data, offset_entry)? & field_crypt::OFFSET_MASK)
    }
}
