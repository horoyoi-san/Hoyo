use axum::http::Uri;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::json;

pub async fn not_found(uri: Uri) -> impl IntoResponse {
    let path = uri.path();
    tracing::info!("handled sdk fallback request: {path}");

    if path.contains("version.json") {
        return Json(json!({ "version": "1.0.0" })).into_response();
    }

    if path.contains("exchange") || path.contains("login") || path.contains("verify") || path.contains("token") || path.contains("auth") {
        return Json(json!({
            "retcode": 0,
            "code": 0,
            "message": "OK",
            "data": {
                "token": {
                    "token": "mostsecuretokenever",
                    "token_type": 1
                },
                "tokens": [
                    {
                        "token": "mostsecuretokenever",
                        "token_type": 1
                    }
                ],
                "account": {
                    "uid": "1337",
                    "token": "mostsecuretokenever",
                    "email": "ReversedRooms",
                    "country": "US",
                    "is_email_verify": "1",
                    "area_code": "**"
                },
                "user_info": {
                    "aid": "1337",
                    "mid": "1337",
                    "is_email_verify": 1,
                    "area_code": "**",
                    "country": "US",
                    "is_adult": 1,
                    "email": "motorized@wheel.chair"
                },
                "combo_id": "1337",
                "combo_token": "9065ad8507d5a1991cb6fddacac5999b780bbd92",
                "open_id": "1337",
                "account_type": 1,
                "heartbeat": false,
                "device_grant_required": false,
                "reactivate_required": false,
                "realperson_required": false,
                "safe_mobile_required": false
            }
        })).into_response();
    }

    Json(json!({
        "retcode": 0,
        "code": 0,
        "message": "OK",
        "data": {}
    })).into_response()
}
