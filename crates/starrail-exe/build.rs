fn main() {
    emit_frontend_path();

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

    let icon_path = out_dir.clone() + "\\app.ico";
    convert_to_ico(
        &manifest_dir
            .join("..")
            .join("..")
            .join("Assets")
            .join("Icon")
            .join("lunyi.png"),
        &icon_path,
    );

    let mut res = winres::WindowsResource::new();
    res.set("CompanyName", "miHoYo Co.,Ltd.");
    res.set("FileDescription", "Star Rail");
    res.set("FileVersion", "2019.4.34.45676");
    res.set("InternalName", "StarRail");
    res.set("OriginalFilename", "StarRail.exe");
    res.set("ProductName", "Star Rail");
    res.set("ProductVersion", "2019.4.34.15905388");
    res.set("LegalCopyright", "© miHoYo");
    res.set_icon(&icon_path);
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

fn convert_to_ico(input: &std::path::Path, output: &str) {
    let img = image::open(input)
        .unwrap_or_else(|e| panic!("failed to open icon {}: {e}", input.display()));
    let img = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
    img.save(output)
        .unwrap_or_else(|e| panic!("failed to save ico {output}: {e}"));
    println!("cargo:rerun-if-changed={}", input.display());
}

fn emit_frontend_path() {
    let frontend = std::env::vars()
        .find(|(key, _)| key.starts_with("CARGO_BIN_FILE_FRONTEND"))
        .map(|(_, value)| value);

    let path = if let Some(exe) = frontend {
        println!("cargo:rerun-if-changed={exe}");
        exe
    } else {
        println!(
            "cargo:warning=CARGO_BIN_FILE_FRONTEND* not visible to build script; \
             embedding EMPTY frontend placeholder (StarRail.exe will have no UI)"
        );
        let out_dir = std::env::var("OUT_DIR").unwrap();
        let placeholder = std::path::Path::new(&out_dir).join("frontend-placeholder.bin");
        std::fs::write(&placeholder, b"").expect("failed to write frontend placeholder");
        placeholder.to_string_lossy().into_owned()
    };

    println!("cargo:rustc-env=FRONTEND_EXE_PATH={path}");
}
