use std::path::PathBuf;

fn main() {
    let def_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("version.def");

    println!("cargo:rerun-if-changed={}", def_path.to_str().unwrap());
    println!("cargo:rustc-link-arg=/DEF:{}", def_path.to_str().unwrap());
}
