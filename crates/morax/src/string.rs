use crate::error::Result;

use crate::crypt::string as string_crypt;
use crate::metadata::Metadata;

impl Metadata {
    pub(crate) fn decode_string(&self, index: u32) -> Result<String> {
        if let Some(value) = self.string_cache.get(&index) {
            return Ok(value.clone());
        }
        let base = self.header.payload_offset as usize + self.header.string_offset as usize;
        let value = string_crypt::decode(&self.global_data, base, index)?;
        self.string_cache.insert(index, value.clone());
        Ok(value)
    }
}
