use crate::crypt::attributes::MethodAttributes;
use crate::crypt::{event as event_crypt, property as property_crypt};
use crate::error::Result;

use super::super::heaps::compress_u32;
use super::super::tables::{self, Coded, Col};
use super::*;

impl AsmBuilder<'_> {
    pub(super) fn emit_properties(
        &mut self,
        type_def: &crate::type_def::Il2CppTypeDefinition,
        type_rid: u32,
        method_rids: &[u32],
    ) -> Result<()> {
        let Some(property_start) = type_def.property_start else {
            return Ok(());
        };
        let Some(method_start) = type_def.method_start else {
            return Ok(());
        };
        if type_def.property_count == 0 {
            return Ok(());
        }
        let property_list = self.tables.count(tables::PROPERTY) + 1;
        for local in 0..type_def.property_count {
            let global_index = property_start + local;
            let entry = self.ctx.metadata.header.payload_offset as usize
                + self.ctx.metadata.header.properties_offset as usize
                + global_index * property_crypt::ENTRY_SIZE;
            let raw = property_crypt::decrypt(&self.ctx.metadata.global_data, entry, global_index)?;
            let name = self.ctx.metadata.decode_string(raw.name_index)?;
            let get =
                (raw.get_local != property_crypt::ACCESSOR_NONE).then_some(raw.get_local as usize);
            let set =
                (raw.set_local != property_crypt::ACCESSOR_NONE).then_some(raw.set_local as usize);

            let (type_index, is_static, index_params) =
                self.accessor_signature(method_start, get, set)?;
            let mut sig = vec![0x08 | if is_static { 0 } else { SIG_HASTHIS }];
            compress_u32(index_params.len() as u32, &mut sig);
            match type_index {
                Some(index) => self.encode_type(index, &mut sig)?,
                None => sig.push(ET_OBJECT),
            }
            for param in index_params {
                self.encode_type(param, &mut sig)?;
            }
            let name_col = self.string(&name);
            let sig_col = self.blob(&sig);
            let prop_rid = self
                .tables
                .add(tables::PROPERTY, vec![Col::u16(0), name_col, sig_col]);

            if let Some(g) = get
                && let Some(&method_rid) = method_rids.get(g)
            {
                self.add_semantics(0x0002, method_rid, tables::PROPERTY, prop_rid);
            }
            if let Some(s) = set
                && let Some(&method_rid) = method_rids.get(s)
            {
                self.add_semantics(0x0001, method_rid, tables::PROPERTY, prop_rid);
            }
        }
        self.tables.add(
            tables::PROPERTY_MAP,
            vec![
                Col::Table(tables::TYPE_DEF, type_rid),
                Col::Table(tables::PROPERTY, property_list),
            ],
        );
        Ok(())
    }

    fn accessor_signature(
        &self,
        method_start: usize,
        get: Option<usize>,
        set: Option<usize>,
    ) -> Result<(Option<u32>, bool, Vec<u32>)> {
        if let Some(g) = get {
            let info = self.ctx.metadata.method_sig_indices(method_start + g)?;
            let is_static = info.flags & MethodAttributes::Static.bits() as u16 != 0;
            return Ok((
                Some(info.return_type_index),
                is_static,
                info.parameter_type_indices,
            ));
        }
        if let Some(s) = set {
            let info = self.ctx.metadata.method_sig_indices(method_start + s)?;
            let is_static = info.flags & MethodAttributes::Static.bits() as u16 != 0;
            let mut params = info.parameter_type_indices;
            let value = params.pop();
            return Ok((value, is_static, params));
        }
        Ok((None, false, Vec::new()))
    }

    pub(super) fn emit_events(
        &mut self,
        type_def: &crate::type_def::Il2CppTypeDefinition,
        type_rid: u32,
        method_rids: &[u32],
    ) -> Result<()> {
        let Some(event_start) = type_def.event_start else {
            return Ok(());
        };
        if type_def.event_count == 0 {
            return Ok(());
        }
        let event_list = self.tables.count(tables::EVENT) + 1;
        for local in 0..type_def.event_count {
            let global_index = event_start + local;
            let entry = self.ctx.metadata.header.payload_offset as usize
                + self.ctx.metadata.header.events_offset as usize
                + global_index * event_crypt::ENTRY_SIZE;
            let raw =
                event_crypt::decrypt(&self.ctx.metadata.global_data, entry, global_index as u64)?;
            let name = self.ctx.metadata.decode_string(raw.name_index)?;
            let event_type = if raw.type_index >= 0 {
                match self.type_ref_for_il2cpp(raw.type_index as u32)? {
                    Some((table, rid)) => Col::coded(Coded::TypeDefOrRef, table, rid),
                    None => Col::Coded(Coded::TypeDefOrRef, 0),
                }
            } else {
                Col::Coded(Coded::TypeDefOrRef, 0)
            };
            let name_col = self.string(&name);
            let event_rid = self
                .tables
                .add(tables::EVENT, vec![Col::u16(0), name_col, event_type]);

            for (local_index, semantics) in [
                (raw.add_local, 0x0008u32),
                (raw.remove_local, 0x0010),
                (raw.raise_local, 0x0020),
            ] {
                if local_index != event_crypt::ACCESSOR_NONE
                    && let Some(&method_rid) = method_rids.get(local_index as usize)
                {
                    self.add_semantics(semantics, method_rid, tables::EVENT, event_rid);
                }
            }
        }
        self.tables.add(
            tables::EVENT_MAP,
            vec![
                Col::Table(tables::TYPE_DEF, type_rid),
                Col::Table(tables::EVENT, event_list),
            ],
        );
        Ok(())
    }

    fn add_semantics(&mut self, semantics: u32, method_rid: u32, assoc_table: u8, assoc_rid: u32) {
        self.tables.add(
            tables::METHOD_SEMANTICS,
            vec![
                Col::u16(semantics),
                Col::Table(tables::METHOD_DEF, method_rid),
                Col::coded(Coded::HasSemantics, assoc_table, assoc_rid),
            ],
        );
    }

    pub(super) fn emit_interfaces(
        &mut self,
        type_rid: u32,
        type_def: &crate::type_def::Il2CppTypeDefinition,
    ) -> Result<()> {
        for interface in self.ctx.metadata.interface_type_indices(type_def)? {
            if let Some((table, rid)) = self.type_ref_for_il2cpp(interface)? {
                self.tables.add(
                    tables::INTERFACE_IMPL,
                    vec![
                        Col::Table(tables::TYPE_DEF, type_rid),
                        Col::coded(Coded::TypeDefOrRef, table, rid),
                    ],
                );
            }
        }
        Ok(())
    }

    pub(super) fn emit_nested(&mut self, type_index: usize, type_rid: u32) -> Result<()> {
        if let Some(declaring) = self.ctx.metadata.type_def(type_index)?.declaring_type_index
            && let Some(&enclosing_rid) = self.local_rid.get(&declaring)
        {
            self.tables.add(
                tables::NESTED_CLASS,
                vec![
                    Col::Table(tables::TYPE_DEF, type_rid),
                    Col::Table(tables::TYPE_DEF, enclosing_rid),
                ],
            );
        }
        Ok(())
    }

    pub(super) fn emit_generic_params(&mut self, type_index: usize, type_rid: u32) -> Result<()> {
        let Some(names) = self.ctx.metadata.type_generic_parameter_names(type_index)? else {
            return Ok(());
        };
        for (number, param_name) in names.into_iter().enumerate() {
            let name = self.string(&param_name);
            self.tables.add(
                tables::GENERIC_PARAM,
                vec![
                    Col::u16(number as u32),
                    Col::u16(0),
                    Col::coded(Coded::TypeOrMethodDef, tables::TYPE_DEF, type_rid),
                    name,
                ],
            );
        }
        Ok(())
    }
}
