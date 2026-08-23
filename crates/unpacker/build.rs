use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR");
    let oodle_dir = Path::new(&manifest)
        .join("..")
        .join("..")
        .join("Assets")
        .join("oodle");
    let oodle_dir = oodle_dir.canonicalize().unwrap_or(oodle_dir);
    println!("cargo:rustc-link-search=native={}", oodle_dir.display());

    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_env = std::env::var("CARGO_CFG_TARGET_ENV").unwrap_or_default();

    if target_os == "windows" && target_env == "msvc" {
        println!("cargo:rustc-link-lib=static=oo2core_win64");
    } else if target_os == "linux" {
        println!("cargo:rustc-link-lib=static=oo2corelinux64");
    } else {
        println!(
            "cargo:warning=unpacker: no Oodle static lib configured for target_os={target_os} target_env={target_env}"
        );
    }
}
