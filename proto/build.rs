use std::{
    fs,
    io::{self, BufRead},
    path::Path,
};

pub fn main() {
    let proto_file = "StarRail.proto";
    let raw_proto = "../StarRail.proto";

    println!("cargo:rerun-if-changed={proto_file}");
    println!("cargo:rerun-if-changed={raw_proto}");
    println!("cargo:rerun-if-changed=packet_ids.json");
    println!("cargo:rerun-if-changed=required_types.json");
    println!("cargo:rerun-if-changed=../scripts/prune_proto.py");

    let _ = ensure_pruned_proto(proto_file, raw_proto);

    if Path::new(proto_file).exists() {
        prost_build::Config::new()
            .out_dir("out/")
            .type_attribute(".", "#[derive(proto_derive::CmdID)]")
            .compile_protos(&[proto_file], &["."])
            .unwrap();

        impl_message_id(Path::new("out/_.rs")).unwrap();
    }
}

fn ensure_pruned_proto(proto_file: &str, raw_proto: &str) -> io::Result<()> {
    let target = Path::new(proto_file);
    let raw_path = Path::new(raw_proto);

    let mut needs_pruning = false;

    // 1. Target file does not exist
    if !target.exists() {
        needs_pruning = true;
    } else if raw_path.exists() {
        // 2. Raw proto is newer than the pruned proto
        if let (Ok(raw_meta), Ok(target_meta)) = (fs::metadata(raw_path), fs::metadata(target)) {
            if let (Ok(raw_time), Ok(target_time)) = (raw_meta.modified(), target_meta.modified()) {
                if raw_time > target_time {
                    needs_pruning = true;
                }
            }
        }
    }

    // 3. Target file itself is a raw unpruned file (large file without CmdIDs)
    if !needs_pruning && target.exists() {
        if let Ok(meta) = fs::metadata(target) {
            if meta.len() > 300_000 {
                let content = fs::read_to_string(target).unwrap_or_default();
                if !content.contains("CmdID:") {
                    needs_pruning = true;
                }
            }
        }
    }

    if needs_pruning {
        let input_raw = if raw_path.exists() { raw_proto } else { proto_file };
        println!("cargo:warning=[Auto-Prune] Pruning raw protobuf definitions from {input_raw}...");

        let py_cmds = ["python", "python3", "py"];
        let mut success = false;
        for py in py_cmds {
            let status = std::process::Command::new(py)
                .args(["../scripts/prune_proto.py", "--raw", input_raw, "--out", proto_file])
                .status();
            if let Ok(status) = status {
                if status.success() {
                    success = true;
                    break;
                }
            }
        }

        if !success {
            println!("cargo:warning=[Auto-Prune] Failed to run python pruner script. Make sure Python 3 is installed.");
        }
    }

    Ok(())
}

pub fn impl_message_id(path: &Path) -> io::Result<()> {
    let file = fs::File::open(path)?;
    let reader = io::BufReader::new(file);
    let mut output = Vec::new();

    let mut attr = None;
    for line in reader.lines() {
        let line = line?;

        if line.contains("CmdID:") {
            attr = Some(make_message_id_attr(&line).unwrap());
        } else {
            output.push(line);
            if let Some(attr) = attr.take() {
                output.push(attr);
            }
        }
    }

    fs::write(path, output.join("\n").as_bytes())?;
    Ok(())
}

fn make_message_id_attr(line: &str) -> Option<String> {
    let id = line.trim_start().split(' ').nth(2)?.parse::<u16>().ok()?;
    Some(format!("#[cmdid({id})]"))
}
