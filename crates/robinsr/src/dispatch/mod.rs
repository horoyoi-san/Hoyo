use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::Engine;
use serde_json::json;
use std::net::SocketAddr;

pub fn router() -> Router {
    Router::new()
        // Dispatch & Gateway
        .route("/query_dispatch", get(query_dispatch))
        .route("/query_gateway", get(query_gateway))
        .route("/query_security_file", get(query_security_file))
        // MiHoYo / Star Rail SDK & Auth endpoints
        .route("/account/risky/api/check", post(risky_check))
        .route("/api/login", post(mock_login))
        .route("/auth/login", post(mock_login))
        .route("/combo/box/api/config/sdk/combo", get(sdk_combo_config))
        .route("/combo/granter/api/compareProtocolVersion", post(sdk_protocol_version))
        .route("/hk4e_global/combo/granter/login/v2/login", post(sdk_combo_login))
        .route("/hk4e_global/mdk/shield/api/login", post(sdk_shield_login))
        .route("/hk4e_global/mdk/shield/api/verify", post(sdk_shield_verify))
        .route("/mdk/shield/api/loadConfig", post(sdk_load_config))
        .route("/admin/mihoyo/common/config", get(common_config))
        // Fallback for any other game SDK queries
        .fallback(fallback_handler)
}

pub async fn start_dispatch_server(port: u16) -> anyhow::Result<()> {
    let app = router();
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    crate::emit_log(format!("[DISPATCH GATEWAY] 🌐 HTTP Gateway listening on http://0.0.0.0:{}", port));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

/// /query_dispatch handler: Returns base64 encoded region list matching game client version
async fn query_dispatch(req: Request) -> impl IntoResponse {
    let uri = req.uri().to_string();
    crate::emit_log(format!("[DISPATCH GATEWAY] 📡 Client request /query_dispatch (URI: {}) -> Region 'os_beta'", uri));

    let region_info = json!({
        "region_list": [
            {
                "name": "os_beta",
                "title": "RobinSR (Beta 2026)",
                "dispatch_url": "http://127.0.0.1:21000/query_gateway",
                "env_type": "2",
                "msg": "OK"
            }
        ],
        "top_sever_region_name": "os_beta",
        "client_secret_key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
        "retcode": 0,
        "msg": "OK"
    });

    let json_bytes = serde_json::to_vec(&region_info).unwrap_or_default();
    let b64 = base64::engine::general_purpose::STANDARD.encode(json_bytes);

    let mut res = Response::new(Body::from(b64));
    res.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    res
}

/// /query_gateway handler: Returns base64 encoded gameserver connection info
async fn query_gateway(req: Request) -> impl IntoResponse {
    let uri = req.uri().to_string();
    crate::emit_log(format!("[DISPATCH GATEWAY] 🚪 Client request /query_gateway (URI: {}) -> Directing to Gameserver 127.0.0.1:23301", uri));

    let gateway = json!({
        "retcode": 0,
        "msg": "OK",
        "ip": "127.0.0.1",
        "port": 23301,
        "use_tcp": false,
        "server_description": "RobinSR KCP Local Gameserver",
        "asset_bundle_url": "http://127.0.0.1:21000/asb",
        "ex_resource_url": "http://127.0.0.1:21000/asb",
        "lua_url": "http://127.0.0.1:21000/lua",
        "ifix_url": "http://127.0.0.1:21000/ifix",
        "event_tracking_url": "http://127.0.0.1:21000/event",
        "mdk_res_version": "1.0",
        "client_secret_key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA"
    });

    let json_bytes = serde_json::to_vec(&gateway).unwrap_or_default();
    let b64 = base64::engine::general_purpose::STANDARD.encode(json_bytes);

    let mut res = Response::new(Body::from(b64));
    res.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    res
}

async fn query_security_file() -> impl IntoResponse {
    let empty_b64 = base64::engine::general_purpose::STANDARD.encode(b"{}");
    let mut res = Response::new(Body::from(empty_b64));
    res.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    res
}

async fn risky_check() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "id": "mock_id",
            "action": "ACTION_NONE",
            "geetest": null
        }
    }))
}

async fn mock_login() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "account": {
                "uid": "10001",
                "token": "robinsr_session_token_991823",
                "email": "trailblazer@robinsr.local"
            }
        }
    }))
}

async fn sdk_combo_config() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "protocol": true,
            "qr_enabled": false,
            "log_level": "INFO"
        }
    }))
}

async fn sdk_protocol_version() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "modified": false,
            "protocol": {
                "id": 0,
                "app_id": 1,
                "language": "en"
            }
        }
    }))
}

async fn sdk_combo_login() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "combo_id": "10001",
            "combo_token": "robinsr_combo_token_2026",
            "open_id": "10001",
            "data": "{\"guest\":false}"
        }
    }))
}

async fn sdk_shield_login() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "account": {
                "uid": "10001",
                "name": "Trailblazer",
                "email": "trailblazer@robinsr.local",
                "is_email_verify": 1,
                "token": "robinsr_shield_token",
                "country": "US"
            }
        }
    }))
}

async fn sdk_shield_verify() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "account": {
                "uid": "10001",
                "token": "robinsr_shield_token"
            }
        }
    }))
}

async fn sdk_load_config() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {
            "client": "PC",
            "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA"
        }
    }))
}

async fn common_config() -> impl IntoResponse {
    Json(json!({
        "retcode": 0,
        "message": "OK",
        "data": {}
    }))
}

async fn fallback_handler(req: Request) -> impl IntoResponse {
    let method = req.method().to_string();
    let uri = req.uri().to_string();
    log::info!("[Dispatch Fallback] Responding OK 200 to {method} {uri}");

    (
        StatusCode::OK,
        [("Content-Type", "application/json")],
        Json(json!({
            "retcode": 0,
            "message": "OK",
            "data": {}
        })),
    )
}
