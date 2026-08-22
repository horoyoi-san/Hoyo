use crate::crypt::il2cpp_type as type_crypt;
use crate::error::Result;
use crate::metadata::Metadata;

#[derive(Clone, Copy)]
pub(crate) struct Il2CppType {
    pub data: u32,
    pub attrs: u16,
    pub kind: u8,
    pub bits: u8,
}

impl Metadata {
    pub(crate) fn type_name(&self, type_index: u32, json: bool) -> Result<String> {
        if let Some(name) = self.type_name_cache.get(&(type_index, json)) {
            return Ok(name.clone());
        }

        let entry = self.il2cpp_type(type_index)?;
        let mut name = match entry.kind {
            0x01 => "System.Void".to_owned(),
            0x02 => "System.Boolean".to_owned(),
            0x03 => "System.Char".to_owned(),
            0x04 => "System.SByte".to_owned(),
            0x05 => "System.Byte".to_owned(),
            0x06 => "System.Int16".to_owned(),
            0x07 => "System.UInt16".to_owned(),
            0x08 => "System.Int32".to_owned(),
            0x09 => "System.UInt32".to_owned(),
            0x0A => "System.Int64".to_owned(),
            0x0B => "System.UInt64".to_owned(),
            0x0C => "System.Single".to_owned(),
            0x0D => "System.Double".to_owned(),
            0x0E => "System.String".to_owned(),
            0x0F => {
                if entry.data == 0 {
                    "System.Void*".to_owned()
                } else {
                    format!("{}*", self.type_name(entry.data, json)?)
                }
            }
            0x10 => self.type_name(entry.data, json)?,
            0x11 | 0x12 | 0x1C => self.type_def_full_name(entry.data as usize)?,
            0x13 | 0x1E => self.generic_parameter_name(entry.data)?.unwrap_or_default(),
            0x14 => self.array_type_name(entry.data, json)?,
            0x15 => self
                .generic_inst_name(entry.data, json)?
                .unwrap_or_default(),
            0x16 => "System.TypedReference".to_owned(),
            0x18 => "System.IntPtr".to_owned(),
            0x19 => "System.UIntPtr".to_owned(),
            0x1D => format!("{}[]", self.type_name(entry.data, json)?),
            _ => String::new(),
        };

        if entry.bits & 0x40 != 0 {
            name.push('&');
        }
        if json {
            name = type_json_alias(&name).to_owned();
        }

        self.type_name_cache
            .insert((type_index, json), name.clone());
        Ok(name)
    }

    pub(crate) fn array_type_name(&self, data: u32, json: bool) -> Result<String> {
        let rva = self.array_types_rva + data * 32;
        let elem_va = self.pe.rd64(rva)?;
        let rank = self.pe.rd8(rva + 8)?;
        let elem = self.type_name(self.type_ptr_index(elem_va)?, json)?;
        Ok(format!(
            "{elem}[{}]",
            ",".repeat(rank.saturating_sub(1) as usize)
        ))
    }

    pub(crate) fn type_csharp_name(&self, type_index: u32) -> Result<String> {
        let entry = self.il2cpp_type(type_index)?;
        let mut name = match entry.kind {
            0x01 => "void".to_owned(),
            0x02 => "bool".to_owned(),
            0x03 => "char".to_owned(),
            0x04 => "sbyte".to_owned(),
            0x05 => "byte".to_owned(),
            0x06 => "short".to_owned(),
            0x07 => "ushort".to_owned(),
            0x08 => "int".to_owned(),
            0x09 => "uint".to_owned(),
            0x0A => "long".to_owned(),
            0x0B => "ulong".to_owned(),
            0x0C => "float".to_owned(),
            0x0D => "double".to_owned(),
            0x0E => "string".to_owned(),
            0x0F => {
                if entry.data == 0 {
                    "void*".to_owned()
                } else {
                    format!("{}*", self.type_csharp_name(entry.data)?)
                }
            }
            0x10 => self.type_csharp_name(entry.data)?,
            0x11 | 0x12 => self.type_def_short_name(entry.data as usize)?,
            0x13 | 0x1E => self.generic_parameter_name(entry.data)?.unwrap_or_default(),
            0x14 => self.array_csharp_name(entry.data)?,
            0x15 => self
                .generic_inst_declaration_name(entry.data)?
                .unwrap_or_default(),
            0x16 => "TypedReference".to_owned(),
            0x18 => "IntPtr".to_owned(),
            0x19 => "UIntPtr".to_owned(),
            0x1C => "object".to_owned(),
            0x1D => format!("{}[]", self.type_csharp_name(entry.data)?),
            _ => String::new(),
        };
        if entry.bits & 0x40 != 0 {
            name.push('&');
        }
        Ok(name)
    }

    fn array_csharp_name(&self, data: u32) -> Result<String> {
        let rva = self.array_types_rva + data * 32;
        let elem = self.type_csharp_name(self.type_ptr_index(self.pe.rd64(rva)?)?)?;
        let rank = self.pe.rd8(rva + 8)?;
        Ok(format!(
            "{elem}[{}]",
            ",".repeat(rank.saturating_sub(1) as usize)
        ))
    }

    pub(crate) fn il2cpp_type(&self, index: u32) -> Result<Il2CppType> {
        let d = type_crypt::decode(
            &self.pe,
            self.types_rva,
            self.image_base,
            index,
            self.il2cpp_type_format,
        )?;
        Ok(Il2CppType {
            data: d.data,
            attrs: d.attrs,
            kind: d.kind,
            bits: d.bits,
        })
    }

    pub(crate) fn type_ptr_index(&self, va: u64) -> Result<u32> {
        let rva = (va - self.image_base) as u32;
        Ok(type_crypt::ptr_index(
            rva,
            self.types_rva,
            self.il2cpp_type_format,
        )?)
    }
}

pub(crate) fn type_json_alias(name: &str) -> &str {
    match name {
        "System.Int32" => "int",
        "System.UInt32" => "uint",
        "System.Int16" => "short",
        "System.UInt16" => "ushort",
        "System.Int64" => "long",
        "System.UInt64" => "ulong",
        "System.Byte" => "byte",
        "System.SByte" => "sbyte",
        "System.Boolean" => "bool",
        "System.Single" => "float",
        "System.Double" => "double",
        "System.String" => "string",
        "System.Char" => "char",
        "System.Object" => "object",
        "System.Void" => "void",
        "System.Decimal" => "decimal",
        "System.DateTime" => "DateTime",
        other => other,
    }
}
