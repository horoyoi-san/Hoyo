use std::collections::HashMap;
use std::fs;
use std::path::Path;

use rayon::prelude::*;

use crate::error::Result;
use crate::metadata::Metadata;

mod builder;
mod heaps;
mod pe;
mod tables;

use builder::AsmBuilder;
pub const ATTRIBUTE_ASSEMBLY: &str = "Il2CppDummyDll";

struct Context<'a> {
    metadata: &'a Metadata,
    assembly_names: Vec<String>,
    type_to_image: Vec<usize>,
    generic_instantiations: HashMap<usize, Vec<(u64, String)>>,
}

impl<'a> Context<'a> {
    fn build(metadata: &'a Metadata) -> Result<Self> {
        let images = metadata.images();
        let assembly_names = images
            .iter()
            .map(|image| {
                image
                    .name
                    .strip_suffix(".dll")
                    .unwrap_or(&image.name)
                    .to_owned()
            })
            .collect();

        let type_count = images
            .iter()
            .map(|image| image.type_start + image.type_count)
            .max()
            .unwrap_or(0);
        let mut type_to_image = vec![0usize; type_count];
        for (image_index, image) in images.iter().enumerate() {
            let end = (image.type_start + image.type_count).min(type_count);
            for slot in &mut type_to_image[image.type_start.min(type_count)..end] {
                *slot = image_index;
            }
        }

        Ok(Self {
            metadata,
            assembly_names,
            type_to_image,
            generic_instantiations: crate::script::collect_generic_instantiations(metadata)?,
        })
    }
}

pub fn build_dummy_dll(metadata: &Metadata, out_dir: &Path) -> Result<usize> {
    let ctx = Context::build(metadata)?;
    fs::create_dir_all(out_dir)?;

    fs::write(
        out_dir.join(format!("{ATTRIBUTE_ASSEMBLY}.dll")),
        builder::build_attribute_assembly(),
    )?;

    (0..ctx.metadata.images().len())
        .into_par_iter()
        .try_for_each(|image_index| -> Result<()> {
            let bytes = AsmBuilder::build_image(&ctx, image_index)?;
            let path = out_dir.join(format!("{}.dll", ctx.assembly_names[image_index]));
            fs::write(path, bytes)?;
            Ok(())
        })?;

    Ok(ctx.metadata.images().len() + 1)
}
