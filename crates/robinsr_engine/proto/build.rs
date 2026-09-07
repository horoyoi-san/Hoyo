use std::{
    fs,
    io::{self, BufRead},
    path::Path,
};

pub fn main() {
    let proto_file = "StarRail.proto";
    let out_rs = Path::new("out/_.rs");
    if std::path::Path::new(proto_file).exists() {
        println!("cargo:rerun-if-changed={proto_file}");

        let res = prost_build::Config::new()
            .out_dir("out/")
            .type_attribute(".", "#[derive(proto_derive::CmdID)]")
            .compile_protos(&[proto_file], &["."]);

        if let Ok(()) = res {
            let _ = impl_message_id(out_rs);
        } else if out_rs.exists() {
            println!("cargo:warning=protoc was not found or failed, using pre-generated out/_.rs");
        } else {
            res.expect("Failed to compile protobuf files and out/_.rs is missing");
        }
    }
}

pub fn impl_message_id(path: &Path) -> io::Result<()> {
    let file = fs::File::open(path)?;
    let reader = io::BufReader::new(file);
    let mut output = Vec::new();

    let mut attr = None;
    for line in reader.lines() {
        let line = line?;

        if line.contains("CmdID:") {
            if let Some(attr_str) = make_message_id_attr(&line) {
                attr = Some(attr_str);
            }
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
