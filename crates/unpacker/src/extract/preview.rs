use std::path::Path;

use anyhow::{Result, anyhow};
use image::RgbaImage;

use crate::archive;
use crate::unity::classes::texture2d::Texture2D;
use crate::unity::serialized_file::SerializedFile;

use super::{GAME, map_file};

pub fn decode_texture(block: &Path, path_id: i64) -> Result<RgbaImage> {
    let data = map_file(block)?;
    let archives = archive::extract_archives(&data[..], GAME)?;

    let mut first_texture: Option<RgbaImage> = None;

    for archive in &archives {
        for file_name in archive.file_names() {
            if file_name.ends_with(".resS") {
                continue;
            }
            let Ok(bytes) = archive.extract_file(file_name) else {
                continue;
            };
            let Ok(serialized_file) = SerializedFile::from_bytes(&bytes, archive.game_type())
            else {
                continue;
            };

            // 1. Resolve Sprite PPtr to underlying Texture2D if needed
            let mut target_tex_path_id = path_id;
            for info in &serialized_file.objects {
                if info.path_id == path_id {
                    if let Ok(obj) = info.parse_object(&serialized_file.header, &bytes) {
                        if let Some(sprite) = obj.downcast_ref::<crate::unity::classes::sprite::Sprite>() {
                            target_tex_path_id = sprite.rd.texture.path_id;
                            break;
                        }
                    }
                }
            }

            // 2. Decode matched Texture2D
            for info in &serialized_file.objects {
                if info.path_id == target_tex_path_id || info.path_id == path_id {
                    if let Ok(obj) = info.parse_object(&serialized_file.header, &bytes) {
                        if let Some(t2d) = obj.downcast_ref::<Texture2D>() {
                            let owned;
                            let tex_data: &[u8] = if !t2d.stream_info.path.is_empty()
                                && let Some(name) = t2d.stream_info.path.split('/').next_back()
                            {
                                owned = archive
                                    .extract_file_range(
                                        name,
                                        t2d.stream_info.offset as usize,
                                        t2d.stream_info.size as usize,
                                    )?
                                    .into_owned();
                                &owned
                            } else {
                                &t2d.embedded_data
                            };

                            return t2d.decode_image(tex_data);
                        }
                    }
                }

                // 3. Keep first texture in block as fallback
                if first_texture.is_none() {
                    if let Ok(obj) = info.parse_object(&serialized_file.header, &bytes) {
                        if let Some(t2d) = obj.downcast_ref::<Texture2D>() {
                            let owned;
                            let tex_data: &[u8] = if !t2d.stream_info.path.is_empty()
                                && let Some(name) = t2d.stream_info.path.split('/').next_back()
                            {
                                if let Ok(range) = archive.extract_file_range(
                                    name,
                                    t2d.stream_info.offset as usize,
                                    t2d.stream_info.size as usize,
                                ) {
                                    owned = range.into_owned();
                                    &owned
                                } else {
                                    &t2d.embedded_data
                                }
                            } else {
                                &t2d.embedded_data
                            };

                            if let Ok(decoded) = t2d.decode_image(tex_data) {
                                first_texture = Some(decoded);
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(img) = first_texture {
        return Ok(img);
    }

    Err(anyhow!(
        "Texture2D with path_id {path_id} not found in {block:?}"
    ))
}
