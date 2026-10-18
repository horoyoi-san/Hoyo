use axum::extract::Path;
use axum::http::header::CONTENT_TYPE;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Redirect, Response};
use tokio::fs;

pub fn root_dir() -> std::path::PathBuf {
    static ROOT: std::sync::OnceLock<std::path::PathBuf> = std::sync::OnceLock::new();
    ROOT.get_or_init(find_root_dir).clone()
}

fn find_root_dir() -> std::path::PathBuf {
    use std::path::{Path, PathBuf};

    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let mut candidates = Vec::new();

    if let Some(path) = std::env::var_os("HOYO_DESIGN_OVERRIDE_DIR") {
        candidates.push(PathBuf::from(path));
    }

    // Support both the launcher bundle (server/design_override) and running
    // the server from a source checkout next to game-Launcher.
    candidates.push(current_dir.join("design_override"));
    candidates.push(current_dir.join("server").join("design_override"));

    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            for ancestor in parent.ancestors() {
                candidates.push(ancestor.join("design_override"));
                candidates.push(ancestor.join("server").join("design_override"));
                candidates.push(
                    ancestor
                        .join("game-Launcher")
                        .join("server")
                        .join("design_override"),
                );
            }
        }
    }

    let has_contents = |path: &Path| {
        path.is_dir()
            && std::fs::read_dir(path)
                .map(|mut entries| entries.next().is_some())
                .unwrap_or(false)
    };
    for candidate in candidates {
        if has_contents(&candidate) {
            let resolved = candidate.canonicalize().unwrap_or(candidate);
            tracing::info!("Design override directory: {}", resolved.display());
            return resolved;
        }
    }

    let fallback = std::env::var_os("HOYO_DESIGN_OVERRIDE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| current_dir.join("design_override"));
    tracing::warn!(
        "No populated design override directory found; using {}",
        fallback.display()
    );
    fallback
}

pub async fn serve(Path((version, cdn, path)): Path<(String, String, String)>) -> Response {
    if !safe_component(&version) || !safe_component(&cdn) || !safe_relative_path(&path) {
        return StatusCode::BAD_REQUEST.into_response();
    }

    let root = root_dir().join(&version).join(&cdn);
    // The wildcard already includes `client/Windows/`, so append it once.
    let file_path = root.join(&path);
    if let Ok(metadata) = fs::metadata(&file_path).await {
        if metadata.is_file() {
            match fs::read(file_path).await {
                Ok(bytes) => {
                    tracing::info!("Design data: sent {path} ({} bytes)", bytes.len());
                    return ([(CONTENT_TYPE, "application/octet-stream")], bytes).into_response();
                }
                Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            }
        }
    }

    let upstream_path = root.join("upstream.txt");
    let upstream = match fs::read_to_string(upstream_path).await {
        Ok(value) => value.trim().trim_end_matches('/').to_string(),
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };
    if !upstream.starts_with("https://") {
        return StatusCode::BAD_GATEWAY.into_response();
    }

    match reqwest::Url::parse(&format!("{upstream}/{path}")) {
        Ok(url) => {
            tracing::info!("Design data: CDN fallback for {path}: {url}");
            Redirect::temporary(url.as_str()).into_response()
        }
        Err(_) => StatusCode::BAD_GATEWAY.into_response(),
    }
}

fn safe_component(value: &str) -> bool {
    !value.is_empty()
        && value != "."
        && value != ".."
        && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
}

fn safe_relative_path(value: &str) -> bool {
    !value.is_empty()
        && value.split('/').all(|part| {
            !part.is_empty()
                && part != "."
                && part != ".."
                && part.bytes().all(|byte| {
                    byte.is_ascii_alphanumeric() || b"._-".contains(&byte)
                })
        })
}
