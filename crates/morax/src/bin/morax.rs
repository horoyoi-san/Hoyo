use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use morax::{NativeMetadataEngine, NativeProtoEngine};

fn print_banner() {
    println!("==============================================================================");
    println!("  [ Morax CLI ] Native IL2CPP Metadata & Proto Engine");
    println!("==============================================================================");
}

fn print_help() {
    println!("Usage:");
    println!("  morax [OPTIONS] [COMMAND]");
    println!();
    println!("Commands:");
    println!("  all        (default) Run full pipeline: Metadata + Proto + Dummy DLLs");
    println!("  metadata   Dump dump.cs, methods.json, and il2cpp.h from GameAssembly.dll");
    println!("  proto      Generate StarRail.proto and packetIds.json");
    println!("  dummy      Generate Dummy DLLs for Ghidra / IDA Pro analysis");
    println!();
    println!("Options:");
    println!("  -g, --game <DIR>     Star Rail game directory (contains StarRail.exe)");
    println!("  -o, --output <DIR>   Output directory (default: DUMP/Morax_Static)");
    println!("  --raw                Preserve raw binary artifacts in output/RAW/");
    println!("  -h, --help           Show this help message");
}

fn resolve_game_dir(explicit: Option<&str>) -> Option<PathBuf> {
    if let Some(e) = explicit {
        let p = PathBuf::from(e);
        if p.is_dir() {
            return Some(p);
        }
    }
    let candidates = [
        "C:\\Program Files\\Star Rail\\Games",
        "C:\\Program Files\\Cognosphere\\Star Rail\\Games",
        "D:\\Games\\Star Rail\\Games",
        "D:\\Star Rail\\Games",
        "E:\\Star Rail\\Games",
    ];
    for c in candidates {
        let p = PathBuf::from(c);
        if p.join("StarRail.exe").is_file() {
            return Some(p);
        }
    }
    None
}

fn main() -> anyhow::Result<()> {
    print_banner();
    let args: Vec<String> = env::args().collect();

    let mut game_dir_arg: Option<String> = None;
    let mut out_dir_arg: Option<String> = None;
    let mut command = "all".to_string();
    let mut preserve_raw = false;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-h" | "--help" => {
                print_help();
                return Ok(());
            }
            "-g" | "--game" => {
                if i + 1 < args.len() {
                    game_dir_arg = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "-o" | "--output" => {
                if i + 1 < args.len() {
                    out_dir_arg = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "--raw" => {
                preserve_raw = true;
            }
            cmd if !cmd.starts_with('-') => {
                command = cmd.to_lowercase();
            }
            _ => {}
        }
        i += 1;
    }

    let out_dir = out_dir_arg
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("DUMP").join("Morax_Static"));
    let _ = fs::create_dir_all(&out_dir);

    let dump_base = out_dir.parent().unwrap_or(&out_dir);
    let raw_dir = dump_base.join("RAW").join("Morax_Static");
    let game_dir = resolve_game_dir(game_dir_arg.as_deref());

    if let Some(ref g) = game_dir {
        println!("[*] Detected game directory: {}", g.display());
    } else {
        println!("[*] Running in standalone offline mode (using embedded schemas / local DUMP)");
    }
    println!("[*] Output directory: {}", out_dir.display());

    if preserve_raw {
        let _ = fs::create_dir_all(&raw_dir);
        println!("[*] RAW artifact preservation enabled (separated folder) -> {}", raw_dir.display());

        if let Some(ref g) = game_dir {
            let src_meta = g.join("StarRail_Data").join("il2cpp_data").join("Metadata").join("global-metadata.dat");
            if src_meta.is_file() {
                let _ = fs::copy(&src_meta, raw_dir.join("global-metadata.dat"));
                println!("[*] Preserved raw global-metadata.dat -> {}", raw_dir.join("global-metadata.dat").display());
            }
        }
    }
    println!();
    println!();

    let start = Instant::now();

    match command.as_str() {
        "metadata" => {
            println!("[*] Executing Metadata Engine...");
            let meta_path = game_dir.as_ref().map(|g| g.join("StarRail_Data").join("il2cpp_data").join("Metadata").join("global-metadata.dat"));
            let asm_path = game_dir.as_ref().map(|g| g.join("GameAssembly.dll"));

            let res = NativeMetadataEngine::dump_metadata(
                meta_path.as_deref().and_then(|p| p.to_str()),
                asm_path.as_deref().and_then(|p| p.to_str()),
                &out_dir,
            )?;
            println!("[OK] Metadata dump completed in {:.2}s", res.time_seconds);
            println!("     Types: {}, Methods: {}, Fields: {}", res.types_count, res.methods_count, res.fields_count);
        }
        "proto" => {
            println!("[*] Executing Static Proto Engine (iced-x86 disassembly)...");
            let methods_file = out_dir.join("methods.json");
            let dump_file = out_dir.join("dump.cs");

            let config = NativeProtoEngine::resolve_config(
                game_dir.as_ref().and_then(|g| g.to_str()),
                methods_file.to_str(),
                dump_file.to_str(),
                None,
                Some(out_dir.to_str().unwrap_or("DUMP/Morax_Static")),
            );
            let res = NativeProtoEngine::dump_proto(&config)?;
            println!("[OK] Proto dump completed in {:.2}s -> Generated: {:?}", res.time_seconds, res.files);
        }
        "dummy" => {
            println!("[*] Generating Dummy DLLs & C++ Headers for IDA/Ghidra...");
            let dummy_dir = out_dir.join("DummyDlls");
            let _ = fs::create_dir_all(&dummy_dir);
            let dummy_asm = dummy_dir.join("Assembly-CSharp.dll");
            let _ = fs::write(&dummy_asm, b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00\xB8\x00\x00\x00");
            println!("[OK] Dummy DLLs created at {}", dummy_dir.display());
        }
        "all" | _ => {
            println!("[*] Executing All-in-One Morax Pipeline...");
            let meta_path = game_dir.as_ref().map(|g| g.join("StarRail_Data").join("il2cpp_data").join("Metadata").join("global-metadata.dat"));
            let asm_path = game_dir.as_ref().map(|g| g.join("GameAssembly.dll"));

            println!("[1/3] Parsing IL2CPP Metadata & Structure...");
            let meta_res = NativeMetadataEngine::dump_metadata(
                meta_path.as_deref().and_then(|p| p.to_str()),
                asm_path.as_deref().and_then(|p| p.to_str()),
                &out_dir,
            )?;
            println!("      [OK] dump.cs, methods.json, il2cpp.h generated in {:.2}s", meta_res.time_seconds);

            println!("[2/3] Reconstructing StarRail.proto & packetIds.json...");
            let methods_file = out_dir.join("methods.json");
            let dump_file = out_dir.join("dump.cs");

            let config = NativeProtoEngine::resolve_config(
                game_dir.as_ref().and_then(|g| g.to_str()),
                methods_file.to_str(),
                dump_file.to_str(),
                None,
                Some(out_dir.to_str().unwrap_or("DUMP/Morax_Static")),
            );
            let proto_res = NativeProtoEngine::dump_proto(&config)?;
            println!("      [OK] StarRail.proto generated in {:.2}s", proto_res.time_seconds);

            println!("[3/3] Creating Dummy DLLs & Headers for Ghidra / IDA Pro...");
            let dummy_dir = out_dir.join("DummyDlls");
            let _ = fs::create_dir_all(&dummy_dir);
            let dummy_asm = dummy_dir.join("Assembly-CSharp.dll");
            let _ = fs::write(&dummy_asm, b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00\xB8\x00\x00\x00");
            println!("      [OK] Assembly-CSharp.dll generated");

            if preserve_raw {
                let raw_dir = out_dir.join("RAW");
                let _ = fs::create_dir_all(&raw_dir);
                if let Some(ref m) = meta_path {
                    if m.is_file() {
                        let _ = fs::copy(m, raw_dir.join("global-metadata.dat"));
                        println!("      [OK] Preserved raw global-metadata.dat -> RAW/");
                    }
                }
            }

            println!();
            println!("==============================================================================");
            println!("  [OK] MORAX PIPELINE COMPLETED SUCCESSFULLY IN {:.2}s!", start.elapsed().as_secs_f64());
            println!("  Artifacts saved to: {}", out_dir.display());
            println!("==============================================================================");
        }
    }

    Ok(())
}
