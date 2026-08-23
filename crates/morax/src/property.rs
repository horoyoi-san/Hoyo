use crate::error::Result;

use crate::crypt::property as property_crypt;
use crate::crypt::token;
use crate::metadata::Metadata;
use crate::type_def::Il2CppTypeDefinition;

#[derive(Clone, Debug)]
pub struct Il2CppPropertyDefinition {
    pub name: String,
    pub type_name: String,
    pub flags: u16,
    pub has_get: bool,
    pub has_set: bool,
    pub get_rva: Option<u64>,
    pub set_rva: Option<u64>,
    pub token: u32,
}

impl Metadata {
    pub fn properties(
        &self,
        type_def: &Il2CppTypeDefinition,
    ) -> Result<Vec<Il2CppPropertyDefinition>> {
        let Some(property_start) = type_def.property_start else {
            return Ok(Vec::new());
        };

        let mut properties = Vec::with_capacity(type_def.property_count);
        for local in 0..type_def.property_count {
            let global_index = property_start + local;
            let entry = self.header.payload_offset as usize
                + self.header.properties_offset as usize
                + global_index * property_crypt::ENTRY_SIZE;
            let raw = property_crypt::decrypt(&self.global_data, entry, global_index)?;
            let name = self.decode_string(raw.name_index)?;
            let has_get = raw.get_local != property_crypt::ACCESSOR_NONE;
            let has_set = raw.set_local != property_crypt::ACCESSOR_NONE;

            let mut type_name = String::from("System.Void");
            let mut flags = 0u16;
            let mut get_rva = None;
            let mut set_rva = None;
            if let Some(method_start) = type_def.method_start {
                if has_get {
                    let method = self.method(method_start + raw.get_local as usize)?;
                    get_rva = Some(method.rva);
                    type_name = method.return_type;
                    flags = method.flags;
                }
                if has_set {
                    let method = self.method(method_start + raw.set_local as usize)?;
                    set_rva = Some(method.rva);
                    if !has_get {
                        flags = method.flags;
                        if let Some(value_type) =
                            method.parameter_types_dump.into_iter().next_back()
                        {
                            type_name = value_type;
                        }
                    }
                }
            }

            properties.push(Il2CppPropertyDefinition {
                name,
                type_name,
                flags,
                has_get,
                has_set,
                get_rva,
                set_rva,
                token: token::property_token(global_index),
            });
        }
        Ok(properties)
    }
}
