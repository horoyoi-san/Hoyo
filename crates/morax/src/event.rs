use crate::crypt::event as event_crypt;
use crate::error::Result;
use crate::metadata::Metadata;
use crate::type_def::Il2CppTypeDefinition;

#[derive(Clone, Debug)]
pub struct Il2CppEventDefinition {
    pub name: String,
    pub type_name: String,
    pub flags: u16,
    pub add_rva: Option<u64>,
    pub remove_rva: Option<u64>,
    pub raise_rva: Option<u64>,
    pub token: u32,
}

impl Metadata {
    pub fn events(&self, type_def: &Il2CppTypeDefinition) -> Result<Vec<Il2CppEventDefinition>> {
        let Some(event_start) = type_def.event_start else {
            return Ok(Vec::new());
        };

        let mut events = Vec::with_capacity(type_def.event_count);
        for local in 0..type_def.event_count {
            let global_index = event_start + local;
            let entry = self.header.payload_offset as usize
                + self.header.events_offset as usize
                + global_index * event_crypt::ENTRY_SIZE;
            let raw = event_crypt::decrypt(&self.global_data, entry, global_index as u64)?;

            let name = self.decode_string(raw.name_index)?;
            let type_name = if raw.type_index >= 0 {
                self.type_csharp_name(raw.type_index as u32)?
            } else {
                "object".to_owned()
            };

            let add = self.event_accessor(type_def, raw.add_local)?;
            let remove = self.event_accessor(type_def, raw.remove_local)?;
            let raise = self.event_accessor(type_def, raw.raise_local)?;

            let flags = [add, remove, raise]
                .into_iter()
                .flatten()
                .next()
                .map_or(0, |(flags, _)| flags);

            events.push(Il2CppEventDefinition {
                name,
                type_name,
                flags,
                add_rva: add.map(|(_, rva)| rva),
                remove_rva: remove.map(|(_, rva)| rva),
                raise_rva: raise.map(|(_, rva)| rva),
                token: crate::crypt::token::event_token(global_index),
            });
        }
        Ok(events)
    }

    fn event_accessor(
        &self,
        type_def: &Il2CppTypeDefinition,
        local: u16,
    ) -> Result<Option<(u16, u64)>> {
        let Some(method_start) = type_def
            .method_start
            .filter(|_| local != event_crypt::ACCESSOR_NONE)
        else {
            return Ok(None);
        };
        let method = self.method(method_start + local as usize)?;
        Ok(Some((method.flags, method.rva)))
    }
}
