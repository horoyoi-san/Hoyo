fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default() != "windows" {
        return;
    }

    let manifest_dir = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());

    println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
    println!("cargo:rustc-link-arg=/DYNAMICBASE");
    println!("cargo:rustc-link-arg=/NXCOMPAT");
    println!("cargo:rustc-link-arg=/HIGHENTROPYVA");

    let out_dir = std::env::var("OUT_DIR").unwrap();
    let def_path = format!("{out_dir}/exports.def");
    std::fs::write(
        &def_path,
        "EXPORTS\n\
         NvOptimusEnablement             DATA\n\
         AmdPowerXpressRequestHighPerformance DATA\n",
    )
    .expect("failed to write exports.def");
    println!("cargo:rustc-link-arg=/DEF:{def_path}");

    let icon_candidates = [
        manifest_dir.join("..").join("..").join("src-tauri").join("icons").join("icon.ico"),
        manifest_dir.join("..").join("..").join("src-tauri").join("icons").join("icon.png"),
        manifest_dir.join("..").join("..").join("Assets").join("Icon").join("lunyi.png"),
    ];

    let mut res = winres::WindowsResource::new();
    res.set("CompanyName", "miHoYo Co.,Ltd.");
    res.set("FileDescription", "Star Rail");
    res.set("FileVersion", "2019.4.34.45676");
    res.set("InternalName", "StarRail");
    res.set("OriginalFilename", "StarRail.exe");
    res.set("ProductName", "Star Rail");
    res.set("ProductVersion", "2019.4.34.15905388");
    res.set("LegalCopyright", "© miHoYo");

    for candidate in &icon_candidates {
        if candidate.is_file() {
            if candidate.extension().and_then(|e| e.to_str()) == Some("ico") {
                res.set_icon(candidate.to_str().unwrap());
                break;
            } else {
                let icon_path = out_dir.clone() + "\\app.ico";
                if convert_to_ico(candidate, &icon_path) {
                    res.set_icon(&icon_path);
                    break;
                }
            }
        }
    }

    res.set_manifest(
        r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
"#,
    );
    res.compile().expect("failed to compile Windows resources");

    println!("cargo:rerun-if-changed=build.rs");
}

fn convert_to_ico(input: &std::path::Path, output: &str) -> bool {
    if let Ok(img) = image::open(input) {
        let img = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
        if img.save(output).is_ok() {
            println!("cargo:rerun-if-changed={}", input.display());
            return true;
        }
    }
    false
}

