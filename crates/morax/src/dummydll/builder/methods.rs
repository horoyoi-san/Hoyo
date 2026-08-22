use std::collections::HashSet;

use crate::crypt::attributes::MethodAttributes;
use crate::crypt::{event as event_crypt, property as property_crypt};
use crate::error::Result;

use super::super::heaps::compress_u32;
use super::super::pe::METHOD_BODY_RVA;
use super::super::tables::{self, Coded, Col};
use super::*;

impl AsmBuilder<'_> {
    pub(super) fn emit_methods(
        &mut self,
        type_def: &crate::type_def::Il2CppTypeDefinition,
    ) -> Result<Vec<u32>> {
        let Some(method_start) = type_def.method_start else {
            return Ok(Vec::new());
        };
        let count = type_def.method_count;

        let sigs = (0..count)
            .map(|local| self.ctx.metadata.method_sig_indices(method_start + local))
            .collect::<Result<Vec<_>>>()?;
        let accessors = self.accessor_locals(type_def)?;
        let mut order: Vec<usize> = (0..count).collect();
        order.sort_by_key(|&local| u8::from(!is_constructor(&sigs[local].name)));

        let mut method_rids = vec![0u32; count];
        for local in order {
            let method_index = method_start + local;
            let sig_info = &sigs[local];
            let is_static = sig_info.flags & MethodAttributes::Static.bits() as u16 != 0;
            let generic = self.method_generic_container(sig_info)?;
            let sig = self.build_method_sig(sig_info, is_static, generic)?;

            let name = self.string(&sig_info.name);
            let sig_col = self.blob(&sig);
            let param_list = self.tables.count(tables::PARAM) + 1;
            let no_body =
                (MethodAttributes::Abstract.bits() | MethodAttributes::PinvokeImpl.bits()) as u16;
            let rva = if sig_info.flags & no_body == 0 {
                METHOD_BODY_RVA
            } else {
                0
            };
            let rid = self.tables.add(
                tables::METHOD_DEF,
                vec![
                    Col::u32(rva),
                    Col::u16(0),
                    Col::u16(u32::from(sig_info.flags)),
                    name,
                    sig_col,
                    Col::Table(tables::PARAM, param_list),
                ],
            );
            method_rids[local] = rid;

            if let Some((count, start)) = generic {
                for i in 0..count {
                    let gp_index = start + i;
                    let num = self.ctx.metadata.generic_parameter_num(gp_index)?;
                    let param_name = self
                        .ctx
                        .metadata
                        .generic_parameter_name(gp_index)?
                        .unwrap_or_else(|| format!("T{i}"));
                    let name = self.string(&param_name);
                    self.tables.add(
                        tables::GENERIC_PARAM,
                        vec![
                            Col::u16(u32::from(num)),
                            Col::u16(0),
                            Col::coded(Coded::TypeOrMethodDef, tables::METHOD_DEF, rid),
                            name,
                        ],
                    );
                }
            }

            for (index, param_name) in sig_info.parameter_names.iter().enumerate() {
                if param_name.is_empty() {
                    continue;
                }
                let name = self.string(param_name);
                self.tables.add(
                    tables::PARAM,
                    vec![Col::u16(0), Col::u16(index as u32 + 1), name],
                );
            }

            if sig_info.rva > 0 {
                let offset = self
                    .ctx
                    .metadata
                    .pe
                    .offset(sig_info.rva as u32)
                    .unwrap_or(0);
                let mut fields = vec![
                    ("RVA", format!("0x{:X}", sig_info.rva)),
                    ("Offset", format!("0x{offset:X}")),
                    ("VA", format!("0x{:X}", sig_info.va)),
                ];
                if accessors.contains(&local) {
                    fields.push(("Name", sig_info.name.clone()));
                }
                self.add_named_attribute(tables::METHOD_DEF, rid, "AddressAttribute", &fields)?;
            }
            let token = 0x0600_0000 | method_index as u32;
            self.add_token_attribute(tables::METHOD_DEF, rid, token)?;

            if let Some(instantiations) = self.ctx.generic_instantiations.get(&method_index) {
                for (rva, name) in instantiations.clone() {
                    self.add_named_attribute(
                        tables::METHOD_DEF,
                        rid,
                        "GenericInstMethodAttribute",
                        &[("RVA", format!("0x{rva:X}")), ("Name", name)],
                    )?;
                }
            }
        }
        Ok(method_rids)
    }

    fn accessor_locals(
        &self,
        type_def: &crate::type_def::Il2CppTypeDefinition,
    ) -> Result<HashSet<usize>> {
        let meta = self.ctx.metadata;
        let mut set = HashSet::new();
        if let Some(property_start) = type_def.property_start {
            for local in 0..type_def.property_count {
                let global = property_start + local;
                let entry = meta.header.payload_offset as usize
                    + meta.header.properties_offset as usize
                    + global * property_crypt::ENTRY_SIZE;
                let raw = property_crypt::decrypt(&meta.global_data, entry, global)?;
                for accessor in [raw.get_local, raw.set_local] {
                    if accessor != property_crypt::ACCESSOR_NONE {
                        set.insert(accessor as usize);
                    }
                }
            }
        }
        if let Some(event_start) = type_def.event_start {
            for local in 0..type_def.event_count {
                let global = event_start + local;
                let entry = meta.header.payload_offset as usize
                    + meta.header.events_offset as usize
                    + global * event_crypt::ENTRY_SIZE;
                let raw = event_crypt::decrypt(&meta.global_data, entry, global as u64)?;
                for accessor in [raw.add_local, raw.remove_local, raw.raise_local] {
                    if accessor != event_crypt::ACCESSOR_NONE {
                        set.insert(accessor as usize);
                    }
                }
            }
        }
        Ok(set)
    }

    pub(super) fn build_method_sig(
        &mut self,
        sig_info: &crate::method::Il2CppMethodSignature,
        is_static: bool,
        generic: Option<(u32, u32)>,
    ) -> Result<Vec<u8>> {
        let mut cc = if is_static { 0 } else { SIG_HASTHIS };
        if generic.is_some() {
            cc |= SIG_GENERIC;
        }
        let mut sig = vec![cc];
        if let Some((count, _)) = generic {
            compress_u32(count, &mut sig);
        }
        compress_u32(sig_info.parameter_type_indices.len() as u32, &mut sig);
        self.encode_type(sig_info.return_type_index, &mut sig)?;
        for &param in &sig_info.parameter_type_indices {
            self.encode_type(param, &mut sig)?;
        }
        Ok(sig)
    }

    pub(super) fn method_generic_container(
        &self,
        sig: &crate::method::Il2CppMethodSignature,
    ) -> Result<Option<(u32, u32)>> {
        let mut owner = self.find_mvar_owner(sig.return_type_index)?;
        for &param in &sig.parameter_type_indices {
            if owner.is_some() {
                break;
            }
            owner = self.find_mvar_owner(param)?;
        }
        match owner {
            Some(container) => self.ctx.metadata.generic_container(container),
            None => Ok(None),
        }
    }

    fn find_mvar_owner(&self, type_index: u32) -> Result<Option<u32>> {
        let entry = self.ctx.metadata.il2cpp_type(type_index)?;
        match entry.kind {
            ET_MVAR => self.ctx.metadata.generic_parameter_owner(entry.data),
            ET_PTR | 0x10 | ET_SZARRAY if entry.data != 0 => self.find_mvar_owner(entry.data),
            ET_ARRAY => {
                let rva = self.ctx.metadata.array_types_rva + entry.data * 32;
                let element_va = self.ctx.metadata.pe.rd64(rva)?;
                let element = self.ctx.metadata.type_ptr_index(element_va)?;
                self.find_mvar_owner(element)
            }
            ET_GENERICINST => {
                let Some((_, class_inst_index)) =
                    self.ctx.metadata.generic_class_entry(entry.data)?
                else {
                    return Ok(None);
                };
                if class_inst_index < 0 {
                    return Ok(None);
                }
                for arg in self
                    .ctx
                    .metadata
                    .generic_inst_arg_indices(class_inst_index as u32)?
                {
                    if let Some(owner) = self.find_mvar_owner(arg)? {
                        return Ok(Some(owner));
                    }
                }
                Ok(None)
            }
            _ => Ok(None),
        }
    }
}
