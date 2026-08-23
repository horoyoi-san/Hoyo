use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use crate::lua::bytecode;
use crate::lua::lua_v::archive::{hex_name, DesignIndex};
use crate::lua::lua_v::hash::{find_manifest, hash_path};

fn find_lua_v(dir: &Path) -> Result<PathBuf, String> {
    for entry in fs::read_dir(dir).map_err(|e| format!("read dir fail: {e}"))? {
        let entry = entry.map_err(|e| format!("entry fail: {e}"))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name.starts_with("LuaV_") && name.ends_with(".bytes") {
            return Ok(path);
        }
    }
    Err("no LuaV_*.bytes found".to_owned())
}

fn build_data_map(input_dir: &Path, index: &DesignIndex) -> HashMap<i32, Vec<u8>> {
    let mut map = HashMap::new();
    for fe in &index.file_list {
        let hex = hex_name(&fe.file_byte_name);
        let hex_path = input_dir.join(format!("{hex}.bytes"));
        let Ok(bytes) = fs::read(&hex_path) else {
            continue;
        };
        for de in &fe.data_entries {
            let start = de.offset as usize;
            let end = start + de.size as usize;
            if end <= bytes.len() {
                map.insert(de.name_hash, bytes[start..end].to_vec());
            } else {
                eprintln!(
                    "[lua_v] warning: {} entry @{} size={} > file len {}",
                    hex_path.display(), de.offset, de.size, bytes.len(),
                );
            }
        }
    }
    map
}

fn decompile_bytes(data: &[u8]) -> (String, bool) {
    let result = std::panic::catch_unwind(|| {
        let module = bytecode::parse(data)?;
        Ok::<_, bytecode::ParseError>(crate::lua::decompile_module_to_source(&module))
    });
    match result {
        Ok(Ok(src)) => {
            let p = src.contains("partial reconstruction") || src.contains("[unhandled]");
            (src, p)
        }
        Ok(Err(e)) => (format!("-- parse error: {e}\n"), false),
        Err(_) => (String::new(), false),
    }
}

pub fn run(input_dir: &Path, out_dir: &Path) -> Result<(), String> {
    let lua_v_path = find_lua_v(input_dir)?;
    eprintln!("[lua_v] archive: {}", lua_v_path.display());

    let lua_v_data = fs::read(&lua_v_path)
        .map_err(|e| format!("read {}: {e}", lua_v_path.display()))?;
    let index = DesignIndex::read(&mut Cursor::new(&lua_v_data))
        .map_err(|e| format!("parse {}: {e}", lua_v_path.display()))?;
    eprintln!(
        "[lua_v] index: {} file entries, {} data entries",
        index.file_count, index.design_data_count
    );

    let data_map = build_data_map(input_dir, &index);
    eprintln!("[lua_v] loaded {} data blobs", data_map.len());

    let paths = find_manifest(&data_map)
        .ok_or_else(|| "manifest not found".to_owned())?;
    eprintln!("[lua_v] manifest: {} file paths", paths.len());

    let data_map = Arc::new(data_map);
    let ok = AtomicUsize::new(0);
    let partial = AtomicUsize::new(0);
    let missing = AtomicUsize::new(0);
    let p_err = AtomicUsize::new(0);
    let panicked = AtomicUsize::new(0);

    use rayon::prelude::*;
    paths.par_iter().for_each(|path| {
        let lookup_path = format!("BakedLua/{path}.bytes");
        let hash = hash_path(&lookup_path);
        let Some(data) = data_map.get(&hash) else {
            missing.fetch_add(1, Ordering::Relaxed);
            return;
        };
        let out_path = out_dir.join(Path::new(path).with_extension("lua"));
        let (text, is_partial) = decompile_bytes(data);
        if let Some(parent) = out_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&out_path, text);
        if is_partial {
            partial.fetch_add(1, Ordering::Relaxed);
        } else {
            ok.fetch_add(1, Ordering::Relaxed);
        }
    });

    eprintln!(
        "[lua_v] done: ok={} partial={} missing={} parse_err={} panicked={}",
        ok.load(Ordering::Relaxed),
        partial.load(Ordering::Relaxed),
        missing.load(Ordering::Relaxed),
        p_err.load(Ordering::Relaxed),
        panicked.load(Ordering::Relaxed),
    );
    Ok(())
}
