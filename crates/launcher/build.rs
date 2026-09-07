use std::{env, fs, path::PathBuf, process::Command};

fn main() {
    match env::var("CARGO_CFG_TARGET_ENV").as_deref() {
        Ok("msvc") => {
            println!("cargo:rustc-link-arg-bin=launcher=/MANIFEST:EMBED");
            println!("cargo:rustc-link-arg-bin=launcher=/MANIFESTUAC:level='requireAdministrator'");
        }
        Ok("gnu") => {
            let Some(out_dir) = env::var_os("OUT_DIR") else {
                return;
            };

            let out_dir = PathBuf::from(out_dir);
            let manifest = out_dir.join("launcher.manifest");
            let resource = out_dir.join("launcher.rc");
            let object = out_dir.join("launcher-manifest.o");

            if fs::write(&manifest, MANIFEST).is_err() || fs::write(&resource, RESOURCE).is_err() {
                return;
            }

            let Ok(status) = Command::new("x86_64-w64-mingw32-windres")
                .current_dir(&out_dir)
                .args(["launcher.rc", "-O", "coff", "-o"])
                .arg(&object)
                .status()
            else {
                return;
            };

            if !status.success() {
                return;
            }

            println!("cargo:rustc-link-arg-bin=launcher={}", object.display());
        }
        _ => {}
    }
}

const RESOURCE: &str = "1 24 \"launcher.manifest\"\n";

const MANIFEST: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
"#;
