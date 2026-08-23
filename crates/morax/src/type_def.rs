use rayon::prelude::*;

use crate::crypt::type_def as type_crypt;
use crate::error::Result;
use crate::metadata::Metadata;
use crate::pe::{read_i32, read_u32};

#[derive(Clone, Debug)]
pub struct Il2CppTypeDefinition {
    pub namespace: String,
    pub name: String,
    pub field_start: Option<usize>,
    pub field_count: usize,
    pub method_start: Option<usize>,
    pub method_count: usize,
    pub property_start: Option<usize>,
    pub property_count: usize,
    pub event_start: Option<usize>,
    pub event_count: usize,
    pub interfaces_start: Option<usize>,
    pub interfaces_count: usize,
    pub parent_index: Option<u32>,
    pub flags: u32,
    pub generic_container_index: Option<u32>,
    pub declaring_type_index: Option<usize>,
    pub is_value_type: bool,
    pub is_enum: bool,
}

impl Metadata {
    pub(crate) fn load_type_definitions(&self) -> Result<Vec<Il2CppTypeDefinition>> {
        let count = self
            .images
            .iter()
            .map(|image| image.type_start + image.type_count)
            .max()
            .unwrap_or_default();

        let mut types = (0..count)
            .into_par_iter()
            .map(|index| self.decode_type_definition(index))
            .collect::<Result<Vec<_>>>()?;

        for declaring_index in 0..count {
            for nested_index in self.nested_type_indices(declaring_index)? {
                if let Some(nested) = types.get_mut(nested_index) {
                    nested.declaring_type_index = Some(declaring_index);
                }
            }
        }
        Ok(types)
    }

    fn decode_type_definition(&self, index: usize) -> Result<Il2CppTypeDefinition> {
        let raw = type_crypt::decrypt(&self.global_data, self.type_entry_offset(index)?)?;
        Ok(Il2CppTypeDefinition {
            namespace: self.decode_string(raw.namespace_index)?,
            name: self.decode_string(raw.name_index)?,
            field_start: (raw.field_count != 0).then_some(raw.field_start as usize),
            field_count: raw.field_count,
            method_start: (raw.method_start != u32::MAX).then_some(raw.method_start as usize),
            method_count: raw.method_count,
            property_start: (raw.property_count != 0).then_some(raw.property_start as usize),
            property_count: raw.property_count,
            event_start: (raw.event_count != 0).then_some(raw.event_start as usize),
            event_count: raw.event_count,
            interfaces_start: Some(raw.interfaces_start),
            interfaces_count: raw.interfaces_count,
            parent_index: type_crypt::decode_parent_index(raw.raw_base_type),
            flags: raw.flags,
            generic_container_index: (raw.generic_container != u16::MAX)
                .then_some(raw.generic_container as u32),
            declaring_type_index: None,
            is_value_type: raw.bitfield & 0x1 != 0,
            is_enum: raw.bitfield & 0x2 != 0,
        })
    }

    fn type_entry_offset(&self, type_index: usize) -> Result<usize> {
        let offset = self.header.payload_offset as usize
            + self.header.type_definitions_offset as usize
            + type_index * type_crypt::ENTRY_SIZE;
        Ok(offset)
    }

    fn nested_type_indices(&self, type_index: usize) -> Result<Vec<usize>> {
        let (start, count) =
            type_crypt::decrypt_nested(&self.global_data, self.type_entry_offset(type_index)?)?;
        if count == 0 {
            return Ok(Vec::new());
        }

        let table = self.header.payload_offset as usize
            + self.header.nested_types_offset as usize
            + start * type_crypt::NESTED_TYPE_ENTRY_SIZE;
        (0..count)
            .map(|i| {
                let entry = table + i * type_crypt::NESTED_TYPE_ENTRY_SIZE;
                Ok(read_u32(&self.global_data, entry)? as usize)
            })
            .collect()
    }

    pub fn type_declaration_name(&self, type_index: usize) -> Result<String> {
        let name = self.type_def(type_index)?.name.clone();
        let Some(arity) = generic_arity(&name) else {
            return Ok(name);
        };
        let params = self
            .type_generic_parameter_names(type_index)?
            .filter(|p| p.len() == arity)
            .unwrap_or_else(|| fallback_generic_parameter_names(&name, arity));
        Ok(format!(
            "{}<{}>",
            strip_generic_arity(&name),
            params.join(", ")
        ))
    }

    pub fn parent_name(&self, type_def: &Il2CppTypeDefinition) -> Result<Option<String>> {
        let Some(parent_index) = type_def.parent_index else {
            return Ok(None);
        };
        if self.is_implicit_base(parent_index, type_def)? {
            return Ok(None);
        }
        Ok(Some(self.type_csharp_name(parent_index)?))
    }

    fn is_implicit_base(&self, parent_index: u32, type_def: &Il2CppTypeDefinition) -> Result<bool> {
        let entry = self.il2cpp_type(parent_index)?;
        if !matches!(entry.kind, 0x11 | 0x12 | 0x1C) {
            return Ok(false);
        }
        let full = self.type_def_full_name(entry.data as usize)?;
        Ok(if type_def.is_enum {
            full == "System.Enum"
        } else if type_def.is_value_type {
            full == "System.ValueType"
        } else {
            matches!(full.as_str(), "System.Object" | "System.MulticastDelegate")
        })
    }

    pub fn interface_names(&self, type_def: &Il2CppTypeDefinition) -> Result<Vec<String>> {
        let Some(interfaces_start) = type_def
            .interfaces_start
            .filter(|_| type_def.interfaces_count != 0)
        else {
            return Ok(Vec::new());
        };

        let table = self.header.payload_offset as usize
            + self.header.interfaces_offset as usize
            + interfaces_start * type_crypt::INTERFACE_TYPE_ENTRY_SIZE;
        let mut names = Vec::with_capacity(type_def.interfaces_count);
        for i in 0..type_def.interfaces_count {
            let entry = table + i * type_crypt::INTERFACE_TYPE_ENTRY_SIZE;
            let type_index = read_i32(&self.global_data, entry)?;
            if type_index >= 0 {
                names.push(self.type_csharp_name(type_index as u32)?);
            }
        }
        Ok(names)
    }

    pub(crate) fn interface_type_indices(
        &self,
        type_def: &Il2CppTypeDefinition,
    ) -> Result<Vec<u32>> {
        let Some(interfaces_start) = type_def
            .interfaces_start
            .filter(|_| type_def.interfaces_count != 0)
        else {
            return Ok(Vec::new());
        };

        let table = self.header.payload_offset as usize
            + self.header.interfaces_offset as usize
            + interfaces_start * type_crypt::INTERFACE_TYPE_ENTRY_SIZE;
        let mut indices = Vec::with_capacity(type_def.interfaces_count);
        for i in 0..type_def.interfaces_count {
            let entry = table + i * type_crypt::INTERFACE_TYPE_ENTRY_SIZE;
            let type_index = read_i32(&self.global_data, entry)?;
            if type_index >= 0 {
                indices.push(type_index as u32);
            }
        }
        Ok(indices)
    }

    pub(crate) fn type_def_short_name(&self, type_index: usize) -> Result<String> {
        self.declaring_chain(type_index)?
            .into_iter()
            .map(|index| Ok(self.type_def(index)?.name.clone()))
            .collect::<Result<Vec<_>>>()
            .map(|names| names.join("."))
    }

    pub(crate) fn type_def_full_name(&self, type_index: usize) -> Result<String> {
        let chain = self.declaring_chain(type_index)?;
        let root = self.type_def(chain[0])?;
        let mut name = if root.namespace.is_empty() {
            root.name.clone()
        } else {
            format!("{}.{}", root.namespace, root.name)
        };
        for nested_index in chain.into_iter().skip(1) {
            name.push('.');
            name.push_str(&self.type_def(nested_index)?.name);
        }
        Ok(name)
    }

    pub(crate) fn type_display_full_name(&self, type_index: usize) -> Result<String> {
        let full_name = self.type_def_full_name(type_index)?;
        let leaf_name = self.type_def(type_index)?.name.clone();
        let Some(arity) = generic_arity(&leaf_name) else {
            return Ok(full_name);
        };
        let params = self
            .type_generic_parameter_names(type_index)?
            .filter(|p| p.len() == arity)
            .unwrap_or_else(|| fallback_generic_parameter_names(&leaf_name, arity));
        Ok(format!(
            "{}<{}>",
            strip_generic_arity(&full_name),
            params.join(", ")
        ))
    }

    fn declaring_chain(&self, type_index: usize) -> Result<Vec<usize>> {
        let mut chain = Vec::new();
        let mut current = Some(type_index);
        while let Some(index) = current {
            chain.push(index);
            current = self.type_def(index)?.declaring_type_index;
            if chain.len() > self.types.len() {
                return Err(format!("declaring type cycle at type index {type_index}").into());
            }
        }
        chain.reverse();
        Ok(chain)
    }
}

pub(crate) fn strip_generic_arity(name: &str) -> String {
    name.split('.')
        .map(|segment| match segment.rsplit_once('`') {
            Some((prefix, arity)) if arity.chars().all(|ch| ch.is_ascii_digit()) => prefix,
            _ => segment,
        })
        .collect::<Vec<_>>()
        .join(".")
}

pub(crate) fn generic_arity(name: &str) -> Option<usize> {
    name.rsplit_once('`')?.1.parse().ok()
}

pub(crate) fn fallback_generic_parameter_names(type_name: &str, arity: usize) -> Vec<String> {
    if arity == 1 {
        return vec!["T".to_owned()];
    }
    if arity == 2 && (type_name.contains("Dictionary") || type_name.contains("KeyValuePair")) {
        return vec!["TKey".to_owned(), "TValue".to_owned()];
    }
    (1..=arity).map(|index| format!("T{index}")).collect()
}
