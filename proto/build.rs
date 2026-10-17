use std::{
    fs,
    io::{self, BufRead},
    path::Path,
};

pub fn main() {
    let proto_file = "StarRail.proto";
    if std::path::Path::new(proto_file).exists() {
        println!("cargo:rerun-if-changed={proto_file}");

        let result = prost_build::Config::new()
            .out_dir("out/")
            .type_attribute(".", "#[derive(proto_derive::CmdID)]")
            .compile_protos(&[proto_file], &["."]);

        if let Err(error) = result {
            // Keep builds usable when protoc is unavailable or cannot start;
            // proto/out/_.rs is checked in and is the crate's compile input.
            println!("cargo:warning=protoc failed ({error}); using checked-in proto/out/_.rs");
        } else {
            impl_message_id(Path::new("out/_.rs")).unwrap();
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
