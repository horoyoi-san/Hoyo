use crate::edit::{BaseConfigHeader, patch_data_in_design};
use anyhow::Context;
use crate::common::{downloader::DownloadedAssetInfo, hash::get_32bit_hash_const};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::{Cursor, Write},
    path::Path,
};
use crate::bytes::{ExistFlag, FromBytes, ToBytes};

const TEXTMAP_PATHS: [(&str, i32, i32); 14] = [
    (
        "EN",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_en.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_en.binary_header.bytes"),
    ),
    (
        "CN",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_cn.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_cn.binary_header.bytes"),
    ),
    (
        "KR",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_kr.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_kr.binary_header.bytes"),
    ),
    (
        "JP",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_jp.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_jp.binary_header.bytes"),
    ),
    (
        "ID",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_id.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_id.binary_header.bytes"),
    ),
    (
        "CHS",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_chs.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_chs.binary_header.bytes"),
    ),
    (
        "CHT",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_cht.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_cht.binary_header.bytes"),
    ),
    (
        "DE",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_de.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_de.binary_header.bytes"),
    ),
    (
        "ES",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_es.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_es.binary_header.bytes"),
    ),
    (
        "FR",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_fr.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_fr.binary_header.bytes"),
    ),
    (
        "RU",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_ru.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_ru.binary_header.bytes"),
    ),
    (
        "TH",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_th.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_th.binary_header.bytes"),
    ),
    (
        "VI",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_vi.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_vi.binary_header.bytes"),
    ),
    (
        "PT",
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_pt.bytes"),
        get_32bit_hash_const("BakedConfig/ExcelOutput/Textmap_pt.binary_header.bytes"),
    ),
];

#[derive(Deserialize, Serialize)]
struct TextID {
    pub hash: i32,
    pub hash_64: u64,
}

impl ToBytes for TextID {
    fn to_bytes<T: std::io::Seek + std::io::Write>(&self, r: &mut T) -> std::io::Result<()> {
        self.hash.to_bytes(r)?;
        self.hash_64.to_bytes(r)?;
        Ok(())
    }
}

impl FromBytes for TextID {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        Ok(Self {
            hash: i32::from_bytes(r)?,
            hash_64: u64::from_bytes(r)?,
        })
    }
}

#[derive(Deserialize, Serialize)]
struct TextMapRow {
    #[serde(rename = "ID")]
    pub id: Option<TextID>,
    pub text: Option<String>,
    pub has_param: Option<bool>,
}

impl FromBytes for TextMapRow {
    fn from_bytes<T: std::io::Seek + std::io::Read>(r: &mut T) -> std::io::Result<Self> {
        let exist_flag = ExistFlag::new(r, 3)?;

        Ok(Self {
            id: if exist_flag.exists(0) {
                Some(TextID::from_bytes(r)?)
            } else {
                None
            },
            text: if exist_flag.exists(1) {
                Some(String::from_bytes(r)?)
            } else {
                None
            },
            has_param: if exist_flag.exists(2) {
                Some(bool::from_bytes(r)?)
            } else {
                None
            },
        })
    }
}

impl ToBytes for TextMapRow {
    fn to_bytes<W: std::io::Seek + std::io::Write>(&self, w: &mut W) -> std::io::Result<()> {
        let mut exist_flag = ExistFlag::empty(3);

        let mut temp_w = Cursor::new(Vec::new());

        if let Some(id) = &self.id {
            exist_flag.toggle(0, true);
            id.to_bytes(&mut temp_w)?;
        }

        if let Some(text) = &self.text {
            exist_flag.toggle(1, true);
            text.to_bytes(&mut temp_w)?;
        }

        if let Some(has_param) = &self.has_param {
            exist_flag.toggle(2, true);
            has_param.to_bytes(&mut temp_w)?;
        }

        exist_flag.to_bytes(w)?;
        w.write_all(&temp_w.into_inner())?;

        Ok(())
    }
}

type TextMapHeader = BaseConfigHeader<u64>;

impl TextMapHeader {
    fn modify(&mut self, row: &TextMapRow) {
        if let Some((_, _, len, _)) = self
            .items
            .get_mut(&row.id.as_ref().map(|v| v.hash_64).unwrap_or_default())
        {
            let mut temp_cursor = Cursor::new(Vec::new());
            row.to_bytes(&mut temp_cursor).unwrap();
            *len = temp_cursor.get_ref().len() as i32;
        }
    }
}

pub fn modify_textmaps(
    textmap_dir: &Path,
    asset: &mut DownloadedAssetInfo,
    modified_files: &mut HashSet<String>,
) -> anyhow::Result<()> {
    if !textmap_dir.is_dir() {
        return Ok(());
    }

    let files = fs::read_dir(textmap_dir)
        .context("Failed to read directory")?
        .filter_map(Result::ok);

    for path in files {
        let language = path
            .file_name()
            .to_string_lossy()
            .replace("TextMap", "")
            .replace(".json", "");

        let Ok(Ok(textmap_entries)) =
            fs::read(path.path()).map(|f| serde_json::from_slice::<HashMap<i32, String>>(&f))
        else {
            log::warn!("{} is not a valid json, skipping", path.path().display());
            continue;
        };

        let entry_count = textmap_entries.len();

        match modify_textmap(&language, asset, modified_files, textmap_entries) {
            Ok(_) => log::debug!("modified {entry_count} entries of TextMap{language}"),
            Err(err) => log::error!("failed to modify TextMap{language} {err:?}"),
        }
    }

    Ok(())
}

fn modify_textmap(
    language: &str,
    asset: &mut DownloadedAssetInfo,
    modified_files: &mut HashSet<String>,
    textmap_entries: HashMap<i32, String>,
) -> anyhow::Result<()> {
    let Some((_, textmap_hash, textmap_header_hash)) = TEXTMAP_PATHS
        .iter()
        .find(|v| v.0 == language.to_uppercase())
    else {
        return Err(anyhow::anyhow!("invalid language {language}"));
    };

    let mut header = TextMapHeader::from_bytes(&mut Cursor::new(
        &asset.design_data_list[textmap_header_hash],
    ))
    .context("failed to parse TextMapHeader")?;

    let (mut textmap, first_byte) = {
        let Some(textmap_bytes) = asset.design_data_list.get(textmap_hash) else {
            return Err(anyhow::anyhow!(
                "language {language} with hash {textmap_hash} doesn't exist on design data!"
            ));
        };

        let (textmap_bytes, first_byte) = if !textmap_bytes.is_empty() && textmap_bytes[0] == 0 {
            (&textmap_bytes[1..], Some(&textmap_bytes[..1]))
        } else {
            (textmap_bytes.as_slice(), None)
        };

        (
            Vec::<TextMapRow>::from_bytes(&mut Cursor::new(textmap_bytes))
                .context("failed to parse TextMapRow")?,
            first_byte,
        )
    };

    let mut textmap_index: HashMap<i32, usize> = HashMap::with_capacity(textmap.len());
    for (i, row) in textmap.iter().enumerate() {
        if let Some(id) = &row.id {
            textmap_index.insert(id.hash, i);
        }
    }

    for (hash, content) in textmap_entries {
        if let Some(&idx) = textmap_index.get(&hash) {
            let row = &mut textmap[idx];
            row.text = Some(content);
            header.modify(row);
        }
    }

    // Patch textmap content
    let mut textmap_cursor = Cursor::new(Vec::new());
    if let Some(first_byte) = first_byte {
        textmap_cursor.write_all(first_byte)?;
    }
    textmap.to_bytes(&mut textmap_cursor)?;

    patch_data_in_design(
        asset,
        *textmap_hash,
        textmap_cursor.into_inner(),
        modified_files,
    );

    // Patch textmap header
    header.recalculate();
    patch_data_in_design(asset, *textmap_header_hash, header.to_vec(), modified_files);

    Ok(())
}
