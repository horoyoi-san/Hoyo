fn main() {
    println!("cargo:rustc-link-arg-bin=launcher=/MANIFEST:EMBED");
    println!("cargo:rustc-link-arg-bin=launcher=/MANIFESTUAC:level=\'requireAdministrator\'");
}
