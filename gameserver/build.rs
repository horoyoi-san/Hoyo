use std::{env, fs, path::PathBuf};

const DEFAULT_UI_TEXT: &str = r#"{
  "beta_text": "<color=#0bffe0>Horoyoi-san ඞ</color> | <color=#0b3cff>Aeon</color> ★ <color=#ff0000>Aha</color>",
  "version_text": "เวอร์ชันปัจจุบันคือเวอร์ชันทดสอบ ซึ่งไม่ได้บ่งบอกถึงคุณภาพสุดท้ายของเกม <color=#FF0000>Ho</color><color=#FF7F00>nk</color><color=#FFFF00>ai</color> <color=#00FF00>St</color><color=#0000FF>ar</color> <color=#4B0082>Gay</color>"
}
"#;

fn main() {
    let manifest_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let project_dir = manifest_dir.parent().expect("gameserver is inside workspace");
    let config_path = project_dir.join("UID_Custom.json");

    println!("cargo:rerun-if-changed={}", config_path.display());
    if !config_path.exists() {
        if let Err(err) = fs::write(&config_path, DEFAULT_UI_TEXT) {
            println!(
                "cargo:warning=Could not create {}: {err}",
                config_path.display()
            );
        } else {
            println!("cargo:warning=Created {}", config_path.display());
        }
    }
}
