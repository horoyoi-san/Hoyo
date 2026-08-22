use crate::error::Result;

use super::super::tables::{self, Coded, Col};
use super::*;

impl AsmBuilder<'_> {
    pub(super) fn emit_fields(
        &mut self,
        type_index: usize,
        type_def: &crate::type_def::Il2CppTypeDefinition,
    ) -> Result<()> {
        for field in self.ctx.metadata.fields(type_index, type_def)? {
            let constant = self.field_constant(field.token & 0x00FF_FFFF)?;
            let mut flags = u32::from(field.flags);
            if constant.is_some() {
                flags |= 0x8000;
            }

            let mut sig = vec![SIG_FIELD];
            self.encode_type(field.type_index, &mut sig)?;
            let name = self.string(&field.name);
            let sig_col = self.blob(&sig);
            let rid = self
                .tables
                .add(tables::FIELD, vec![Col::u16(flags), name, sig_col]);

            if let Some((element, value)) = constant {
                let blob = self.blob(&value);
                self.tables.add(
                    tables::CONSTANT,
                    vec![
                        Col::u16(u32::from(element)),
                        Col::coded(Coded::HasConstant, tables::FIELD, rid),
                        blob,
                    ],
                );
            }
            if field.offset > 0 {
                self.add_named_attribute(
                    tables::FIELD,
                    rid,
                    "FieldOffsetAttribute",
                    &[("Offset", format!("0x{:X}", field.offset))],
                )?;
            }
            self.add_token_attribute(tables::FIELD, rid, field.token)?;
        }
        Ok(())
    }

    fn field_constant(&self, field_index: u32) -> Result<Option<(u8, Vec<u8>)>> {
        let Some(&(type_index, data_offset)) = self
            .ctx
            .metadata
            .field_default_values
            .get(&(field_index as usize))
        else {
            return Ok(None);
        };
        let element = self.enum_underlying_element(type_index)?;
        let base = self.ctx.metadata.header.payload_offset as usize
            + self
                .ctx
                .metadata
                .header
                .field_and_parameter_default_value_data_offset as usize
            + data_offset as usize;
        let data = &self.ctx.metadata.global_data;
        let take = |len: usize| data.get(base..base + len).map(<[u8]>::to_vec);

        let value = match element {
            0x02 | 0x04 | 0x05 => take(1),
            0x03 | 0x06 | 0x07 => take(2),
            0x08 | 0x09 | 0x0C => take(4),
            0x0A | 0x0B | 0x0D => take(8),
            ET_STRING => {
                let length = crate::pe::read_i32(data, base)?;
                if length < 0 {
                    return Ok(Some((ET_CLASS, vec![0, 0, 0, 0])));
                }
                let start = base + 4;
                let bytes = data.get(start..start + length as usize).unwrap_or_default();
                Some(
                    String::from_utf8_lossy(bytes)
                        .encode_utf16()
                        .flat_map(u16::to_le_bytes)
                        .collect(),
                )
            }
            _ => return Ok(None),
        };
        Ok(value.map(|bytes| (element, bytes)))
    }

    fn enum_underlying_element(&self, type_index: u32) -> Result<u8> {
        let entry = self.ctx.metadata.il2cpp_type(type_index)?;
        if entry.kind != ET_VALUETYPE {
            return Ok(entry.kind);
        }
        let type_def_index = entry.data as usize;
        let type_def = self.ctx.metadata.type_def(type_def_index)?.clone();
        if type_def.is_enum {
            for field in self.ctx.metadata.fields(type_def_index, &type_def)? {
                if field.flags & 0x10 == 0 && field.flags & 0x40 == 0 {
                    return Ok(self.ctx.metadata.il2cpp_type(field.type_index)?.kind);
                }
            }
        }
        Ok(0x08)
    }
}
