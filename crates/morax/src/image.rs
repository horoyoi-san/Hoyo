use crate::error::Result;

use crate::crypt::image as image_crypt;
use crate::metadata::Metadata;

#[derive(Clone, Debug)]
pub struct Il2CppImageDefinition {
    pub name: String,
    pub type_start: usize,
    pub type_count: usize,
}

impl Metadata {
    pub(crate) fn load_images(&self) -> Result<Vec<Il2CppImageDefinition>> {
        let image_count = self.header.image_count as usize;
        let image_table = self.header.images_offset as usize;
        let mut images = Vec::with_capacity(image_count);
        for index in 0..image_count {
            let entry = image_table + index * image_crypt::ENTRY_SIZE;
            let raw = image_crypt::decrypt(&self.startup_data, entry, index as u32)?;
            let name = self.decode_string(raw.name_index)?;
            images.push(Il2CppImageDefinition {
                name,
                type_start: raw.type_start as usize,
                type_count: raw.type_count as usize,
            });
        }
        Ok(images)
    }
}
