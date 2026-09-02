use anyhow::{anyhow, Context, Result};
use byteorder::{ReadBytesExt, WriteBytesExt, BE, LE};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{BufReader, Cursor, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::Command,
};
use varint_rs::{VarintReader, VarintWriter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageInfo {
    pub code: String,
    pub name: String,
    pub native_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLanguageState {
    pub current_text_lang: String,
    pub current_audio_lang: String,
    pub supported_text_languages: Vec<LanguageInfo>,
    pub supported_audio_languages: Vec<LanguageInfo>,
    pub game_dir_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguagePatchResult {
    pub success: bool,
    pub previous_text: String,
    pub new_text: String,
    pub previous_audio: String,
    pub new_audio: String,
    pub message: String,
}

#[derive(Default, Debug, Clone)]
pub struct DesignTarget {
    pub parent_file_hash: String,
    pub name_hash: i64,
    pub size: i32,
    pub offset: i32,
}

#[derive(Default, Debug, Clone)]
pub struct AllowedLanguageRow {
    pub area: Option<String>,
    pub row_type: Option<u8>,
    pub language_list: Option<Vec<String>>,
    pub default_language: Option<String>,
}

impl AllowedLanguageRow {
    pub fn serialize(&self) -> Result<Vec<u8>> {
        let mut buffer = Vec::new();
        let mut cursor = Cursor::new(&mut buffer);

        let bitmask = [
            self.area.is_some(),
            self.row_type.is_some(),
            self.language_list.is_some(),
            self.default_language.is_some(),
        ]
        .iter()
        .enumerate()
        .fold(0u8, |acc, (i, &set)| acc | ((set as u8) << i));

        cursor.write_u8(bitmask)?;

        if let Some(ref area) = self.area {
            Self::write_string(&mut cursor, area)?;
        }
        if let Some(row_type) = self.row_type {
            cursor.write_u8(row_type)?;
        }
        if let Some(ref language_list) = self.language_list {
            Self::write_string_array(&mut cursor, language_list)?;
        }
        if let Some(ref default_language) = self.default_language {
            Self::write_string(&mut cursor, default_language)?;
        }

        Ok(buffer)
    }

    #[inline]
    fn write_string(cursor: &mut Cursor<&mut Vec<u8>>, s: &str) -> Result<()> {
        let bytes = s.as_bytes();
        cursor.write_u8(bytes.len() as u8)?;
        cursor.write_all(bytes)?;
        Ok(())
    }

    #[inline]
    fn write_string_array(cursor: &mut Cursor<&mut Vec<u8>>, strings: &[String]) -> Result<()> {
        cursor.write_i8_varint(strings.len() as i8)?;
        for s in strings {
            Self::write_string(cursor, s)?;
        }
        Ok(())
    }

    pub fn update_language(&mut self, lang: &str) {
        self.default_language = Some(lang.to_string());
        self.language_list = Some(vec![lang.to_string()]);
    }

    pub fn update_text_language_unlock(&mut self, primary_lang: &str) {
        self.default_language = Some(primary_lang.to_string());
        let all_candidates = ["en", "th", "jp", "cn", "cht", "kr", "es", "fr", "de", "ru", "pt", "id", "vi"];
        let mut list = vec![primary_lang.to_string()];
        for &c in &all_candidates {
            if c != primary_lang && !list.iter().any(|x| x == c) {
                list.push(c.to_string());
            }
        }
        self.language_list = Some(list);
    }

    pub fn area(&self) -> Option<&str> {
        self.area.as_deref()
    }

    pub fn is_text(&self) -> bool {
        self.row_type.is_none()
    }

    pub fn is_voice(&self) -> bool {
        self.row_type == Some(1)
    }
}

pub struct AllowedLanguageTable<'a> {
    pub size: i32,
    pub offset: i32,
    pub bytes_path: &'a Path,
}

impl<'a> AllowedLanguageTable<'a> {
    pub fn new(size: i32, offset: i32, bytes_path: &'a Path) -> Self {
        Self {
            size,
            offset,
            bytes_path,
        }
    }

    pub fn serialize_rows(&self, rows: Vec<AllowedLanguageRow>) -> Result<Vec<u8>> {
        let mut buffer = Vec::new();
        let mut cursor = Cursor::new(&mut buffer);

        cursor.write_u8(0)?;
        cursor.write_i8_varint(rows.len() as i8)?;

        for row in rows {
            let row_data = row.serialize()?;
            cursor.write_all(&row_data)?;
        }

        Ok(buffer)
    }

    pub fn parse(&self) -> Result<Vec<AllowedLanguageRow>> {
        let bytes_file = File::open(self.bytes_path).with_context(|| {
            format!(
                "Got invalid .bytes path from design data: {}",
                self.bytes_path.display()
            )
        })?;
        let mut buf_reader = BufReader::new(bytes_file);
        buf_reader.seek(SeekFrom::Start(self.offset as u64))?;

        let mut buffer = vec![0u8; self.size as usize];
        buf_reader.read_exact(&mut buffer)?;

        let mut cursor = Cursor::new(buffer);

        cursor.read_u8()?;

        let count = cursor.read_i8_varint()? as usize;
        let mut rows = Vec::with_capacity(count);

        for _ in 0..count {
            let bitmask = cursor.read_u8()?;
            let mut row = AllowedLanguageRow::default();

            if bitmask & (1 << 0) != 0 {
                row.area = Some(Self::read_string(&mut cursor)?);
            }
            if bitmask & (1 << 1) != 0 {
                row.row_type = Some(cursor.read_u8()?);
            }
            if bitmask & (1 << 2) != 0 {
                row.language_list = Some(Self::read_string_array(&mut cursor)?);
            }
            if bitmask & (1 << 3) != 0 {
                row.default_language = Some(Self::read_string(&mut cursor)?);
            }

            rows.push(row);
        }

        Ok(rows)
    }

    #[inline]
    fn read_string(cursor: &mut Cursor<Vec<u8>>) -> Result<String> {
        let length = cursor.read_u8()? as usize;
        let mut buffer = vec![0u8; length];
        Read::read_exact(cursor, &mut buffer)?;
        String::from_utf8(buffer).map_err(|e| anyhow::anyhow!(e))
    }

    #[inline]
    fn read_string_array(cursor: &mut Cursor<Vec<u8>>) -> Result<Vec<String>> {
        let length = cursor.read_i8_varint()? as usize;
        let mut strings = Vec::with_capacity(length);
        for _ in 0..length {
            strings.push(Self::read_string(cursor)?);
        }
        Ok(strings)
    }
}

pub struct StarRailLangPatcher;

const REGISTRY_TARGETS: &[&str] = &[
    r"HKCU\Software\Cognosphere\Star Rail",
    r"HKCU\Software\miHoYo\崩坏：星穹铁道",
    r"HKCU\Software\miHoYo\Star Rail",
];

impl StarRailLangPatcher {
    pub fn get_supported_text_languages() -> Vec<LanguageInfo> {
        vec![
            LanguageInfo { code: "th".to_string(), name: "Thai".to_string(), native_name: "ภาษาไทย".to_string() },
            LanguageInfo { code: "en".to_string(), name: "English".to_string(), native_name: "English".to_string() },
            LanguageInfo { code: "ja".to_string(), name: "Japanese".to_string(), native_name: "日本語".to_string() },
            LanguageInfo { code: "cn".to_string(), name: "Chinese (Simplified)".to_string(), native_name: "简体中文".to_string() },
            LanguageInfo { code: "cht".to_string(), name: "Chinese (Traditional)".to_string(), native_name: "繁體中文".to_string() },
            LanguageInfo { code: "ko".to_string(), name: "Korean".to_string(), native_name: "한국어".to_string() },
            LanguageInfo { code: "es".to_string(), name: "Spanish".to_string(), native_name: "Español".to_string() },
            LanguageInfo { code: "fr".to_string(), name: "French".to_string(), native_name: "Français".to_string() },
            LanguageInfo { code: "de".to_string(), name: "German".to_string(), native_name: "Deutsch".to_string() },
            LanguageInfo { code: "ru".to_string(), name: "Russian".to_string(), native_name: "Русский".to_string() },
            LanguageInfo { code: "pt".to_string(), name: "Portuguese".to_string(), native_name: "Português".to_string() },
            LanguageInfo { code: "id".to_string(), name: "Indonesian".to_string(), native_name: "Bahasa Indonesia".to_string() },
            LanguageInfo { code: "vi".to_string(), name: "Vietnamese".to_string(), native_name: "Tiếng Việt".to_string() },
        ]
    }

    pub fn get_supported_audio_languages() -> Vec<LanguageInfo> {
        vec![
            LanguageInfo { code: "ja".to_string(), name: "Japanese Voice".to_string(), native_name: "日本語音声".to_string() },
            LanguageInfo { code: "en".to_string(), name: "English Voice".to_string(), native_name: "English Voice".to_string() },
            LanguageInfo { code: "cn".to_string(), name: "Chinese Voice".to_string(), native_name: "中文配音".to_string() },
            LanguageInfo { code: "ko".to_string(), name: "Korean Voice".to_string(), native_name: "한국어 음성".to_string() },
        ]
    }

    fn string_to_hex_null_terminated(s: &str) -> String {
        let mut hex = String::new();
        for b in s.as_bytes() {
            hex.push_str(&format!("{:02X}", b));
        }
        hex.push_str("00"); // Null terminator
        hex
    }

    fn parse_hex_binary(hex_str: &str) -> Option<String> {
        let clean = hex_str.trim().replace(' ', "");
        if clean.len() < 2 {
            return None;
        }
        let mut bytes = Vec::new();
        for i in (0..clean.len()).step_by(2) {
            if i + 2 <= clean.len() {
                if let Ok(b) = u8::from_str_radix(&clean[i..i + 2], 16) {
                    if b == 0 {
                        break;
                    }
                    bytes.push(b);
                }
            }
        }
        String::from_utf8(bytes).ok()
    }

    /// Queries the registry for a specific value
    fn query_registry_value(reg_path: &str, value_name: &str) -> Option<String> {
        let output = Command::new("reg")
            .args(["query", reg_path, "/v", value_name])
            .output()
            .ok()?;

        if !output.status.success() {
            return None;
        }

        let out_str = String::from_utf8_lossy(&output.stdout);
        for line in out_str.lines() {
            if line.contains(value_name) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let hex_val = parts[parts.len() - 1];
                    return Self::parse_hex_binary(hex_val);
                }
            }
        }
        None
    }

    /// Finds any registry value matching a prefix pattern
    fn find_registry_values_with_prefix(reg_path: &str, prefix: &str) -> Vec<String> {
        let mut names = Vec::new();
        let output = Command::new("reg")
            .args(["query", reg_path])
            .output();

        if let Ok(out) = output {
            let out_str = String::from_utf8_lossy(&out.stdout);
            for line in out_str.lines() {
                let trimmed = line.trim();
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                if let Some(first) = parts.first() {
                    if first.starts_with(prefix) {
                        names.push(first.to_string());
                    }
                }
            }
        }
        names
    }

    /// Sets a binary value in the Windows Registry using reg.exe
    fn set_registry_binary(reg_path: &str, value_name: &str, hex_data: &str) -> Result<()> {
        let status = Command::new("reg")
            .args(["add", reg_path, "/v", value_name, "/t", "REG_BINARY", "/d", hex_data, "/f"])
            .status()
            .with_context(|| format!("Failed to execute reg.exe for {reg_path} -> {value_name}"))?;

        if !status.success() {
            log::warn!("reg add failed for {} \\ {}", reg_path, value_name);
        }
        Ok(())
    }

    fn get_index_hash(data: &[u8]) -> Result<String> {
        let mut hash = [0u8; 16];
        let mut index = 0;
        for i in 0..4 {
            let offset = 0x1C + (i * 4);
            let chunk = data
                .get(offset..offset + 4)
                .context("M_DesignV.bytes is too short")?;
            for &byte in chunk.iter().rev() {
                hash[index] = byte;
                index += 1;
            }
        }
        Ok(hex::encode(hash))
    }

    fn find_design_target(design_bytes: &[u8]) -> Result<DesignTarget> {
        let mut cursor = Cursor::new(design_bytes);
        Self::find_target_v3(&mut cursor, -5186779221241758859i64).or_else(|_| {
            cursor.seek(SeekFrom::Start(0x0))?;
            Self::find_target_v2(&mut cursor, -515329346).or_else(|_| {
                cursor.seek(SeekFrom::Start(0x0))?;
                Self::find_target_v1(&mut cursor, -515329346)
            })
        })
    }

    fn find_target_v3(cursor: &mut Cursor<&[u8]>, target_hash: i64) -> Result<DesignTarget> {
        let _ = cursor.read_u64::<LE>()?;
        let file_count = cursor.read_u32::<BE>()?;
        let _ = cursor.read_u32::<LE>()?;

        let mut target = DesignTarget::default();

        for _ in 0..file_count {
            let _ = cursor.read_i32::<BE>()?;
            let _ = cursor.read_u32::<BE>(); // v3 new 4 bytes
            let mut file_hash_bytes = [0u8; 0x10];
            cursor.read_exact(&mut file_hash_bytes)?;
            target.parent_file_hash = hex::encode(file_hash_bytes);
            let _ = cursor.read_u64::<BE>()?;

            let entry_count = cursor.read_u32::<BE>()?;
            for _ in 0..entry_count {
                let name_hash = cursor.read_i64::<BE>()?; // v3 i32 -> i64
                let size = cursor.read_i32::<BE>()?;
                let offset = cursor.read_i32::<BE>()?;
                if name_hash == target_hash {
                    target.name_hash = name_hash;
                    target.size = size;
                    target.offset = offset;
                    break;
                }
            }

            if target.name_hash != 0 {
                break;
            }

            let _ = cursor.read_u24::<BE>()?;
        }

        if target.name_hash == 0 {
            return Err(anyhow!("Target hash not found in v3 design data"));
        }

        Ok(target)
    }

    fn find_target_v2(cursor: &mut Cursor<&[u8]>, target_hash: i32) -> Result<DesignTarget> {
        let _ = cursor.read_u64::<LE>()?;
        let file_count = cursor.read_u32::<BE>()?;
        let _ = cursor.read_u32::<LE>()?;

        let mut target = DesignTarget::default();

        for _ in 0..file_count {
            let _ = cursor.read_i32::<BE>()?;
            let mut file_hash_bytes = [0u8; 0x10];
            cursor.read_exact(&mut file_hash_bytes)?;
            target.parent_file_hash = hex::encode(file_hash_bytes);
            let _ = cursor.read_u64::<BE>()?;

            let entry_count = cursor.read_u32::<BE>()?;
            for _ in 0..entry_count {
                let name_hash = cursor.read_i32::<BE>()?;
                let size = cursor.read_i32::<BE>()?;
                let offset = cursor.read_i32::<BE>()?;
                if name_hash == target_hash {
                    target.name_hash = name_hash as i64;
                    target.size = size;
                    target.offset = offset;
                    break;
                }
            }

            if target.name_hash != 0 {
                break;
            }

            let _ = cursor.read_u24::<BE>()?;
        }

        if target.name_hash == 0 {
            return Err(anyhow!("Target hash not found in v2 design data"));
        }

        Ok(target)
    }

    fn find_target_v1(cursor: &mut Cursor<&[u8]>, target_hash: i32) -> Result<DesignTarget> {
        let _ = cursor.read_u64::<LE>()?;
        let file_count = cursor.read_u32::<BE>()?;
        let _ = cursor.read_u32::<LE>()?;

        let mut target = DesignTarget::default();

        for _ in 0..file_count {
            let _ = cursor.read_i32::<BE>()?;
            let mut file_hash_bytes = [0u8; 0x10];
            cursor.read_exact(&mut file_hash_bytes)?;
            target.parent_file_hash = hex::encode(file_hash_bytes);
            let _ = cursor.read_u64::<BE>()?;

            let entry_count = cursor.read_u32::<BE>()?;
            for _ in 0..entry_count {
                let name_hash = cursor.read_i32::<BE>()?;
                let size = cursor.read_i32::<BE>()?;
                let offset = cursor.read_i32::<BE>()?;
                if name_hash == target_hash {
                    target.name_hash = name_hash as i64;
                    target.size = size;
                    target.offset = offset;
                    break;
                }
            }

            if target.name_hash != 0 {
                break;
            }

            let _ = cursor.read_u8()?;
        }

        if target.name_hash == 0 {
            return Err(anyhow!("Target hash not found in v1 design data"));
        }

        Ok(target)
    }

    /// Patches the AllowedLanguage table in Star Rail DesignData folder (exact hsr-lang-patcher engine)
    pub fn patch_design_data_folder(design_dir: &Path, text_lang: &str, voice_lang: &str) -> Result<()> {
        let m_design_v_path = design_dir.join("M_DesignV.bytes");
        if !m_design_v_path.is_file() {
            return Err(anyhow!("M_DesignV.bytes not found in {}", design_dir.display()));
        }

        let m_design_data = fs::read(&m_design_v_path)?;
        let index_hash = Self::get_index_hash(&m_design_data)?;
        let design_v_path = design_dir.join(format!("DesignV_{index_hash}.bytes"));
        if !design_v_path.is_file() {
            return Err(anyhow!("DesignV_{index_hash}.bytes not found"));
        }

        let design_v_data = fs::read(&design_v_path)?;
        let target = Self::find_design_target(&design_v_data)?;
        let bytes_path = design_dir.join(format!("{}.bytes", target.parent_file_hash));

        // 1. Auto Snapshot / Backup before modifying
        let backup_dir = design_dir.join(".astralos_backup");
        let _ = fs::create_dir_all(&backup_dir);
        let backup_file = backup_dir.join(format!("{}.bytes.bak", target.parent_file_hash));
        if !backup_file.is_file() {
            let _ = fs::copy(&bytes_path, &backup_file);
        }

        let table = AllowedLanguageTable::new(target.size, target.offset, &bytes_path);
        let mut rows = table.parse()?;

        // Apply language row updates: unlock text dropdown in-game while pinning selected voice
        for (area, lang, voice) in [
            ("os", text_lang, false),
            ("cn", voice_lang, true),
            ("os", voice_lang, true),
            ("cn", text_lang, false),
        ] {
            if let Some(row) = rows.iter_mut().find(|r| {
                r.area() == Some(area) && if voice { r.is_voice() } else { r.is_text() }
            }) {
                if voice {
                    row.update_language(lang);
                } else {
                    row.update_text_language_unlock(lang);
                }
            }
        }

        // Dynamically pack maximum unlocked text languages that fit within target.size
        let mut serialized = table.serialize_rows(rows.clone())?;
        while serialized.len() > target.size as usize {
            let mut trimmed = false;
            // Trim from the back of text rows' language_list (keep primary language at index 0)
            for row in rows.iter_mut() {
                if row.is_text() {
                    if let Some(ref mut list) = row.language_list {
                        if list.len() > 1 {
                            list.pop();
                            trimmed = true;
                        }
                    }
                }
            }
            if !trimmed {
                // If already at minimum 1 language per row, break
                break;
            }
            serialized = table.serialize_rows(rows.clone())?;
        }

        let mut file = File::options().read(true).write(true).open(&bytes_path)?;
        file.seek(SeekFrom::Start(target.offset as u64))?;
        file.write_all(&serialized)?;

        if serialized.len() < target.size as usize {
            file.write_all(&vec![0u8; target.size as usize - serialized.len()])?;
        }

        log::info!("Successfully patched DesignData at {}", bytes_path.display());
        Ok(())
    }

    /// Restores the original DesignData binary file from the automated snapshot backup
    pub fn restore_design_data_backup(design_dir: &Path) -> Result<bool> {
        let backup_dir = design_dir.join(".astralos_backup");
        if !backup_dir.is_dir() {
            return Ok(false);
        }
        let mut restored = false;
        if let Ok(entries) = fs::read_dir(&backup_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if let Some(file_name) = p.file_name().and_then(|s| s.to_str()) {
                    if file_name.ends_with(".bytes.bak") {
                        let original_name = file_name.trim_end_matches(".bak");
                        let target = design_dir.join(original_name);
                        let _ = fs::copy(&p, &target);
                        restored = true;
                    }
                }
            }
        }
        Ok(restored)
    }

    /// Locates the DesignData/Windows directory inside a Star Rail game root
    fn find_design_data_dir(game_dir: &Path) -> Option<PathBuf> {
        let candidates = [
            game_dir.join("StarRail_Data").join("StreamingAssets").join("DesignData").join("Windows"),
            game_dir.join("StarRail_Data").join("Persistent").join("DesignData").join("Windows"),
        ];
        candidates.into_iter().find(|p| p.is_dir())
    }

    /// 1-Click Rollback game language configuration to original backup state
    pub fn rollback_language(game_dir: &Path) -> Result<bool> {
        let mut restored_any = false;
        // Try restoring from both StreamingAssets and Persistent
        for candidate in [
            game_dir.join("StarRail_Data").join("StreamingAssets").join("DesignData").join("Windows"),
            game_dir.join("StarRail_Data").join("Persistent").join("DesignData").join("Windows"),
        ] {
            if candidate.is_dir() {
                if let Ok(true) = Self::restore_design_data_backup(&candidate) {
                    restored_any = true;
                }
            }
        }
        if restored_any {
            Ok(true)
        } else {
            Err(anyhow!("No backup snapshots found in DesignData directories under {}", game_dir.display()))
        }
    }

    /// Detects current language configuration from Windows Registry, DesignData, and game files
    pub fn detect_state(game_dir: &Path) -> GameLanguageState {
        let is_valid = game_dir.join("StarRail.exe").is_file() || game_dir.join("GameAssembly.dll").is_file();

        let mut current_text = "en".to_string();
        let mut current_audio = "ja".to_string();
        let mut found_in_registry = false;

        for reg_path in REGISTRY_TARGETS {
            // Text Language detection
            if let Some(txt) = Self::query_registry_value(reg_path, "LanguageSettings_LocalTextLanguage_h2764291023") {
                current_text = txt.to_lowercase();
                found_in_registry = true;
            } else {
                let names = Self::find_registry_values_with_prefix(reg_path, "LanguageSettings_LocalTextLanguage");
                for name in names {
                    if let Some(txt) = Self::query_registry_value(reg_path, &name) {
                        current_text = txt.to_lowercase();
                        found_in_registry = true;
                        break;
                    }
                }
            }

            // Audio Language detection
            if let Some(aud) = Self::query_registry_value(reg_path, "LanguageSettings_LocalAudioLanguage_h882585060") {
                let lower = aud.to_lowercase();
                current_audio = if lower == "jp" { "ja".to_string() } else if lower == "kr" { "ko".to_string() } else { lower };
                found_in_registry = true;
            } else {
                let names = Self::find_registry_values_with_prefix(reg_path, "LanguageSettings_LocalAudioLanguage");
                for name in names {
                    if let Some(aud) = Self::query_registry_value(reg_path, &name) {
                        let lower = aud.to_lowercase();
                        current_audio = if lower == "jp" { "ja".to_string() } else if lower == "kr" { "ko".to_string() } else { lower };
                        found_in_registry = true;
                        break;
                    }
                }
            }

            if found_in_registry {
                break;
            }
        }

        // Fallback to GeneralConfig.json if registry is empty
        if !found_in_registry {
            let cfg_path = game_dir.join("GeneralConfig.json");
            if cfg_path.is_file() {
                if let Ok(content) = fs::read_to_string(&cfg_path) {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(t) = val.get("TextLanguage").and_then(|x| x.as_str()) {
                            current_text = t.to_lowercase();
                        }
                        if let Some(a) = val.get("VoiceLanguage").and_then(|x| x.as_str()) {
                            let lower = a.to_lowercase();
                            current_audio = if lower == "jp" { "ja".to_string() } else { lower };
                        }
                    }
                }
            }
        }

        GameLanguageState {
            current_text_lang: current_text,
            current_audio_lang: current_audio,
            supported_text_languages: Self::get_supported_text_languages(),
            supported_audio_languages: Self::get_supported_audio_languages(),
            game_dir_valid: is_valid,
        }
    }

    /// Applies new text and audio language to DesignData binary, Windows Registry, and Game Configurations
    pub fn set_language(
        game_dir: &Path,
        text_lang: &str,
        audio_lang: &str,
    ) -> Result<LanguagePatchResult> {
        let prev_state = Self::detect_state(game_dir);

        let clean_text = text_lang.trim().to_lowercase();
        let raw_audio = audio_lang.trim().to_lowercase();

        // 1. Map to Star Rail client DesignData codes
        let design_text_code = match clean_text.as_str() {
            "zh-cn" | "cn" => "cn",
            "zh-tw" | "tw" | "cht" => "cht",
            "ja" | "jp" => "jp",
            "ko" | "kr" => "kr",
            other => other,
        };

        let design_voice_code = match raw_audio.as_str() {
            "ja" | "jp" => "jp",
            "en" => "en",
            "zh" | "cn" => "cn",
            "ko" | "kr" => "kr",
            other => other,
        };

        // 2. Patch Game DesignData Binary (StreamingAssets & Persistent)
        let mut design_patched = false;
        let streaming_design = game_dir.join("StarRail_Data").join("StreamingAssets").join("DesignData").join("Windows");
        if streaming_design.is_dir() {
            if let Err(e) = Self::patch_design_data_folder(&streaming_design, design_text_code, design_voice_code) {
                log::warn!("StreamingAssets DesignData patch error: {e}");
            } else {
                design_patched = true;
            }
        }

        let persistent_design = game_dir.join("StarRail_Data").join("Persistent").join("DesignData").join("Windows");
        if persistent_design.is_dir() {
            if let Err(e) = Self::patch_design_data_folder(&persistent_design, design_text_code, design_voice_code) {
                log::warn!("Persistent DesignData patch error: {e}");
            } else {
                design_patched = true;
            }
        }

        // Also check if hsr-lang-patcher.exe exists in bin/ and run it
        let bin_patcher = PathBuf::from("bin").join("hsr-lang-patcher.exe");
        if bin_patcher.is_file() {
            let arg_lang = format!("-lang:0{},1{}", design_text_code, design_voice_code);
            let _ = Command::new(&bin_patcher)
                .arg(game_dir)
                .arg(&arg_lang)
                .output();
        }

        // 3. Write to all Star Rail Windows Registry targets
        let reg_audio_code = match raw_audio.as_str() {
            "ja" | "jp" => "jp",
            "en" => "en",
            "zh" | "cn" => "zh",
            "ko" | "kr" => "kr",
            other => other,
        };

        let text_hex = Self::string_to_hex_null_terminated(&clean_text);
        let audio_hex = Self::string_to_hex_null_terminated(reg_audio_code);
        let sdk_hex = Self::string_to_hex_null_terminated(&clean_text);

        for reg_path in REGISTRY_TARGETS {
            let _ = Self::set_registry_binary(reg_path, "LanguageSettings_LocalTextLanguage_h2764291023", &text_hex);
            let _ = Self::set_registry_binary(reg_path, "LanguageSettings_LocalAudioLanguage_h882585060", &audio_hex);
            let _ = Self::set_registry_binary(reg_path, "MIHOYOSDK_CURRENT_LANGUAGE_h2559149783", &sdk_hex);

            let text_keys = Self::find_registry_values_with_prefix(reg_path, "LanguageSettings_LocalTextLanguage");
            for key in text_keys {
                let _ = Self::set_registry_binary(reg_path, &key, &text_hex);
            }
            let audio_keys = Self::find_registry_values_with_prefix(reg_path, "LanguageSettings_LocalAudioLanguage");
            for key in audio_keys {
                let _ = Self::set_registry_binary(reg_path, &key, &audio_hex);
            }
        }

        // 4. Also write GeneralConfig.json for game directory compatibility
        let mut cfg_obj = serde_json::json!({
            "TextLanguage": clean_text,
            "VoiceLanguage": raw_audio
        });

        let cfg_path = game_dir.join("GeneralConfig.json");
        if cfg_path.is_file() {
            if let Ok(content) = fs::read_to_string(&cfg_path) {
                if let Ok(mut parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(obj) = parsed.as_object_mut() {
                        obj.insert("TextLanguage".to_string(), serde_json::Value::String(clean_text.clone()));
                        obj.insert("VoiceLanguage".to_string(), serde_json::Value::String(raw_audio.clone()));
                        cfg_obj = parsed;
                    }
                }
            }
        }

        if let Ok(formatted) = serde_json::to_string_pretty(&cfg_obj) {
            let _ = fs::write(&cfg_path, &formatted);
            let persistent_dir = game_dir.join("StarRail_Data").join("Persistent");
            if persistent_dir.is_dir() {
                let _ = fs::write(persistent_dir.join("GeneralConfig.json"), &formatted);
            }
        }

        let message = if design_patched {
            format!(
                "Successfully synchronized Game Language: Text=[{}] | Voice=[{}] (DesignData Bytes, Registry & Config Updated)",
                clean_text.to_uppercase(),
                raw_audio.to_uppercase()
            )
        } else {
            format!(
                "Successfully synchronized Game Language: Text=[{}] | Voice=[{}] (Registry & Config Updated)",
                clean_text.to_uppercase(),
                raw_audio.to_uppercase()
            )
        };

        Ok(LanguagePatchResult {
            success: true,
            previous_text: prev_state.current_text_lang,
            new_text: clean_text.clone(),
            previous_audio: prev_state.current_audio_lang,
            new_audio: raw_audio.clone(),
            message,
        })
    }
}


