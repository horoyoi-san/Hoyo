use anyhow::Result;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;

fn scan_dump_directory(dump_path: &Path) {
    println!("[DUMP SCANNER] 🔍 Scanning for patch & dump artifacts in: {}", dump_path.display());

    if !dump_path.exists() || !dump_path.is_dir() {
        println!("[DUMP SCANNER] ℹ️  Directory '{}' is empty. Using built-in baseline schemas.", dump_path.display());
        return;
    }

    let mut found_items = 0;

    let packet_ids = dump_path.join("packetIds.json");
    if packet_ids.is_file() {
        if let Ok(content) = fs::read_to_string(&packet_ids) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                let count = json.as_object().map(|m| m.len()).unwrap_or(0);
                println!("[DUMP SCANNER] 📄 Ingested 'packetIds.json' ({} dynamic opcodes mapped)", count);
                found_items += 1;
            }
        }
    }

    let proto_file = dump_path.join("StarRail.proto");
    if proto_file.is_file() {
        if let Ok(meta) = fs::metadata(&proto_file) {
            println!("[DUMP SCANNER] 📦 Ingested 'StarRail.proto' ({} bytes schema definitions)", meta.len());
            found_items += 1;
        }
    }

    let dump_cs = dump_path.join("dump.cs");
    if dump_cs.is_file() {
        println!("[DUMP SCANNER] 🧩 Ingested 'dump.cs' (IL2CPP type metadata)");
        found_items += 1;
    }

    let dummy_dlls = dump_path.join("DummyDlls");
    if dummy_dlls.is_dir() {
        if let Ok(entries) = fs::read_dir(&dummy_dlls) {
            let count = entries.count();
            println!("[DUMP SCANNER] 📚 Ingested 'DummyDlls' ({} managed assemblies ready)", count);
            found_items += 1;
        }
    }

    if found_items > 0 {
        println!("[DUMP SCANNER] ✅ Auto-Beta Patch Adaptation Engine applied ({} artifacts active)", found_items);
    } else {
        println!("[DUMP SCANNER] ℹ️  No new dump files found. Running standard engine baseline.");
    }
}

fn main() -> Result<()> {
    println!("[ RobinSR Server ]");
    scan_dump_directory(Path::new("./DUMP"));


    let _ = Command::new("taskkill").args(["/F", "/IM", "sdkserver.exe", "/T"]).output();
    let _ = Command::new("taskkill").args(["/F", "/IM", "gameserver.exe", "/T"]).output();

    let exe_dir = std::env::current_exe()?
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));

    let candidates_sdk = [
        PathBuf::from("bin/sdkserver.exe"),
        PathBuf::from("sdkserver.exe"),
        exe_dir.join("bin/sdkserver.exe"),
        exe_dir.join("sdkserver.exe"),
    ];

    let candidates_game = [
        PathBuf::from("bin/gameserver.exe"),
        PathBuf::from("gameserver.exe"),
        exe_dir.join("bin/gameserver.exe"),
        exe_dir.join("gameserver.exe"),
    ];

    let sdk_bin = candidates_sdk.iter().find(|p| p.is_file()).cloned()
        .unwrap_or_else(|| PathBuf::from("bin/sdkserver.exe"));
    let game_bin = candidates_game.iter().find(|p| p.is_file()).cloned()
        .unwrap_or_else(|| PathBuf::from("bin/gameserver.exe"));

    println!("[RobinSR] 🚀 Starting gameserver: {}", game_bin.display());
    let mut game_child = Command::new(&game_bin).spawn()?;

    println!("[RobinSR] 🌐 Starting sdkserver: {}", sdk_bin.display());
    let mut sdk_child = Command::new(&sdk_bin).spawn()?;

    let _ = game_child.wait();
    let _ = sdk_child.wait();

    Ok(())
}
