use std::borrow::Cow;
use std::collections::HashMap;
use std::fmt::Debug;

use crate::archive::Archive;
use crate::binary_reader::{BinaryReader, ByteOrder};
use crate::{GameType, oodle};

#[derive(Debug)]
struct EncrBlockInfo {
    offset_in_body: usize,
    compressed_size: usize,
    uncompressed_size: usize,
    flags: u16,
}

#[derive(Debug)]
struct EncrNodeInfo {
    offset: i64,
    size: i64,
    #[expect(unused)]
    flags: u32,
}

pub struct EncrArchive<'a> {
    game_type: GameType,
    data: &'a [u8],
    size: usize,
    body_offset: usize,
    blocks: Vec<EncrBlockInfo>,
    nodes: HashMap<String, EncrNodeInfo>,
    block_cumulative_sizes: Vec<usize>,
}

impl Debug for EncrArchive<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("EncrArchive")
            .field("body_offset", &self.body_offset)
            .field("blocks", &self.blocks)
            .field("nodes", &self.nodes)
            .field("block_cumulative_sizes", &self.block_cumulative_sizes)
            .finish()
    }
}

impl<'a> EncrArchive<'a> {
    pub fn new(data: &'a [u8], game_type: GameType) -> anyhow::Result<Self> {
        let mut reader = BinaryReader::new(data, ByteOrder::Big);

        let sig = reader.read_u8_array()?;
        if sig != *b"ENCR\0" {
            return Err(anyhow::anyhow!("Not an ENCR archive"));
        }

        // Header
        let archive_size = reader.read_i64()?;
        let compressed_blocks_info_size = reader.read_u32()?;
        let uncompressed_blocks_info_size = reader.read_u32()?;
        let flags = reader.read_u32()?;

        // Read compressed blocks info
        let compressed_info = reader.read_u8_list(compressed_blocks_info_size as usize)?;

        let compression_type = flags & 0x3f;

        let blocks_info_data = if compression_type == 2 || compression_type == 3 {
            lz4_flex::block::decompress(&compressed_info, uncompressed_blocks_info_size as usize)
                .map_err(|e| anyhow::anyhow!("LZ4 error: {e}"))?
        } else {
            return Err(anyhow::anyhow!(
                "Unsupported compression type: {compression_type}"
            ));
        };

        // Parse Blocks Info
        let mut info_reader = BinaryReader::new(&blocks_info_data, ByteOrder::Big);
        let blocks_count = info_reader.read_i32()?;

        let mut blocks = Vec::with_capacity(blocks_count as usize);
        let mut cumulative_sizes = Vec::with_capacity(blocks_count as usize);
        let mut current_offset = 0;
        let mut current_uncompressed_offset = 0;

        for _ in 0..blocks_count {
            let uncompressed_size = info_reader.read_u32()? as usize;
            let compressed_size = info_reader.read_u32()? as usize;
            let flags = info_reader.read_u16()?;

            blocks.push(EncrBlockInfo {
                offset_in_body: current_offset,
                compressed_size,
                uncompressed_size,
                flags,
            });

            current_uncompressed_offset += uncompressed_size;
            cumulative_sizes.push(current_uncompressed_offset);

            current_offset += compressed_size;
        }

        let nodes_count = info_reader.read_i32()?;
        let mut nodes_map = HashMap::with_capacity(nodes_count as usize);

        for _ in 0..nodes_count {
            let offset = info_reader.read_i64()?;
            let size = info_reader.read_i64()?;
            let flags = info_reader.read_u32()?;

            let path = info_reader.read_string_util_null()?;

            nodes_map.insert(
                path,
                EncrNodeInfo {
                    offset,
                    size,
                    flags,
                },
            );
        }

        let body_offset = reader.get_offset();

        if data.len() < body_offset + current_offset {
            return Err(anyhow::anyhow!("Truncated ENCR body"));
        }

        Ok(Self {
            game_type,
            data: &data[..archive_size as usize],
            size: archive_size as usize,
            body_offset,
            blocks,
            nodes: nodes_map,
            block_cumulative_sizes: cumulative_sizes,
        })
    }

    pub fn nodes(&self) -> HashMap<&String, (i64, i64)> {
        self.nodes
            .iter()
            .map(|(k, v)| (k, (v.offset, v.size)))
            .collect()
    }
}

impl<'a> Archive<'a> for EncrArchive<'a> {
    fn size(&self) -> usize {
        self.size
    }

    fn file_names(&self) -> Vec<&str> {
        self.nodes.keys().map(std::string::String::as_str).collect()
    }

    fn game_type(&self) -> GameType {
        self.game_type
    }

    fn extract_file(&self, path: &str) -> anyhow::Result<Cow<'a, [u8]>> {
        let (_, file_size) = match self.nodes.get(path) {
            Some(info) => (info.offset as usize, info.size as usize),
            None => return Err(anyhow::anyhow!("File not found: {path}")),
        };

        if file_size == 0 {
            return Ok(Cow::Borrowed(&[]));
        }

        self.extract_file_range(path, 0, file_size)
    }

    fn extract_file_range(
        &self,
        path: &str,
        offset: usize,
        size: usize,
    ) -> anyhow::Result<Cow<'a, [u8]>> {
        // Get the file's offset and size
        let (file_offset, file_size) = match self.nodes.get(path) {
            Some(info) => (info.offset as usize, info.size as usize),
            None => return Err(anyhow::anyhow!("File not found: {path}")),
        };

        // Validate the requested range
        if offset >= file_size {
            return Err(anyhow::anyhow!(
                "Offset {offset} is beyond file size {file_size}"
            ));
        }

        // Adjust the requested size if it would go beyond the file
        let adjusted_size = std::cmp::min(size, file_size - offset);
        if adjusted_size == 0 {
            return Ok(Cow::Borrowed(&[]));
        }

        // Calculate the absolute offset and size in the archive
        let abs_offset = file_offset + offset;
        let abs_size = adjusted_size;

        // Find the blocks that contain the requested range
        let start_block_idx = match self.block_cumulative_sizes.binary_search(&abs_offset) {
            Ok(idx) => idx + 1,
            Err(idx) => idx,
        };

        let file_end = abs_offset + abs_size;
        let end_block_idx = match self.block_cumulative_sizes.binary_search(&(file_end - 1)) {
            Ok(idx) => idx + 1,
            Err(idx) => idx,
        };

        if end_block_idx >= self.blocks.len() {
            return Err(anyhow::anyhow!("File range out of bounds"));
        }

        let body_data = &self.data[self.body_offset..];

        // If the requested range is within a single uncompressed block, return a borrowed slice
        if start_block_idx == end_block_idx {
            let block = &self.blocks[start_block_idx];
            if block.flags == 0 {
                let block_abs_start = if start_block_idx == 0 {
                    0
                } else {
                    self.block_cumulative_sizes[start_block_idx - 1]
                };
                let slice_start = block.offset_in_body;
                let local_start = abs_offset.saturating_sub(block_abs_start);
                let local_end = local_start + abs_size;
                return Ok(Cow::Borrowed(
                    &body_data[slice_start + local_start..slice_start + local_end],
                ));
            }
        }

        // Otherwise, collect the data from the relevant blocks
        let mut file_data = Vec::with_capacity(abs_size);
        for i in start_block_idx..=end_block_idx {
            let block = &self.blocks[i];
            let block_abs_start = if i == 0 {
                0
            } else {
                self.block_cumulative_sizes[i - 1]
            };
            let block_end = block_abs_start + block.uncompressed_size;
            let read_start_abs = std::cmp::max(abs_offset, block_abs_start);
            let read_end_abs = std::cmp::min(file_end, block_end);

            if read_end_abs <= read_start_abs {
                continue;
            }

            let local_start = read_start_abs - block_abs_start;
            let local_end = read_end_abs - block_abs_start;
            let slice_start = block.offset_in_body;
            let slice_end = slice_start + block.compressed_size;
            let slice = &body_data[slice_start..slice_end];

            if block.flags == 6 || block.flags == 7 {
                let decompressed_data = if slice.starts_with(b"mr0k") {
                    let mut owned = slice.to_vec();
                    mr0k::decrypt(&mut owned);
                    oodle::decompress(&Cow::Borrowed(&owned[20..]), block.uncompressed_size)
                        .map_err(|e| anyhow::anyhow!("Oodle error: {e}"))?
                } else {
                    oodle::decompress(&Cow::Borrowed(slice), block.uncompressed_size)
                        .map_err(|e| anyhow::anyhow!("Oodle error: {e}"))?
                };
                file_data.extend_from_slice(&decompressed_data[local_start..local_end]);
            } else if block.flags == 0 {
                file_data.extend_from_slice(&slice[local_start..local_end]);
            } else {
                return Err(anyhow::anyhow!("Unsupported block flags: {}", block.flags));
            }
        }

        if file_data.len() != abs_size {
            return Err(anyhow::anyhow!("Extracted size mismatch"));
        }

        Ok(Cow::Owned(file_data))
    }
}
