use axum::http::Uri;
use axum::response::{IntoResponse, Json};
use serde_json::json;

pub async fn not_found(uri: Uri) -> impl IntoResponse {
    tracing::debug!("Handling unhandled SDK/telemetry endpoint: {uri}");
    Json(json!({
        "code": 0,
        "retcode": 0,
        "message": "OK",
        "data": null
    }))
}
