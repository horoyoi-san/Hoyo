fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    if std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default() != "windows" {
        return;
    }

    let manifest_dir = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let out_dir = std::env::var("OUT_DIR").unwrap();

    let icon_src = manifest_dir
        .join("..")
        .join("..")
        .join("Assets")
        .join("Icon")
        .join("LLL.gif");
    let icon_path = format!("{out_dir}/app.ico");
    convert_to_ico(&icon_src, &icon_path);

    let mut res = winres::WindowsResource::new();
    res.set_icon(&icon_path);
    res.compile().expect("failed to compile Windows resources");
}

fn convert_to_ico(input: &std::path::Path, output: &str) {
    let img = image::open(input)
        .unwrap_or_else(|e| panic!("failed to open icon {}: {e}", input.display()));
    let img = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
    img.save(output)
        .unwrap_or_else(|e| panic!("failed to save ico {output}: {e}"));
    println!("cargo:rerun-if-changed={}", input.display());
}
