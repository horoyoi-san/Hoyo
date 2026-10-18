use axum::Json;
use serde_json::json;

pub const LOGIN_WITH_PASSWORD_ENDPOINT: &str = "/{product_name}/mdk/shield/api/login";
pub const LOGIN_WITH_SESSION_TOKEN_ENDPOINT: &str = "/{product_name}/mdk/shield/api/verify";
pub const GRANTER_LOGIN_VERIFICATION_ENDPOINT: &str =
    "/{product_name}/combo/granter/login/v2/login";
pub const RISKY_API_CHECK_ENDPOINT: &str = "/account/risky/api/check";
pub const APN_LOGIN_BY_PASSWORD_ENDPOINT: &str = "/account/ma-cn-passport/app/loginByPassword";
pub const APN_VERIFY_TOKEN_ENDPOINT: &str = "/account/ma-cn-session/app/verify";
pub const APN_EXCHANGE_ENDPOINT: &str = "/account/ma-cn-session/app/exchange";
pub const COMBO_GET_CONFIG_ENDPOINT: &str = "/hkrpg_cn/combo/granter/api/getConfig";
pub const SHIELD_LOAD_CONFIG_ENDPOINT: &str = "/hkrpg_cn/mdk/shield/api/loadConfig";
pub const COMPARE_PROTOCOL_ENDPOINT: &str = "/hkrpg_cn/combo/granter/api/compareProtocolVersion";

#[tracing::instrument]
pub async fn login_with_password() -> Json<serde_json::Value> {
    Json(json!({
    "data": {
        "account": {
            "area_code": "**",
            "email": "ReversedRooms",
            "country": "RU",
            "is_email_verify": "1",
            "token": "mostsecuretokenever",
            "uid": "1337"
        },
        "device_grant_required": false,
        "reactivate_required": false,
        "realperson_required": false,
        "safe_mobile_required": false
    },
    "message": "OK",
    "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn login_with_session_token() -> Json<serde_json::Value> {
    Json(json!({
    "data": {
        "account": {
            "area_code": "**",
            "email": "ReversedRooms",
            "country": "RU",
            "is_email_verify": "1",
            "token": "mostsecuretokenever",
            "uid": "1337"
        },
        "device_grant_required": false,
        "reactivate_required": false,
        "realperson_required": false,
        "safe_mobile_required": false
    },
    "message": "OK",
    "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn granter_login_verification() -> Json<serde_json::Value> {
    Json(json!({
        "data": {
            "account_type": 1,
            "combo_id": "1337",
            "combo_token": "9065ad8507d5a1991cb6fddacac5999b780bbd92",
            "data": "{\"guest\":false}",
            "heartbeat": false,
            "open_id": "1337"
        },
        "message": "OK",
        "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn risky_api_check() -> Json<serde_json::Value> {
    Json(json!({
        "data": {
            "id": "06611ed14c3131a676b19c0d34c0644b",
            "action": "ACTION_NONE",
            "geetest": null
        },
        "message": "OK",
        "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn apn_login_with_password() -> Json<serde_json::Value> {
    Json(json!({
    "data": {
        "token": {
            "token": "mostsecuretokenever",
            "token_type": 1
        },
        "user_info": {
            "aid": "1337",
            "mid": "1337",
            "is_email_verify": 1,
            "area_code": "**",
            "country": "US",
            "is_adult": 1,
            "email": "Aeon ★ Aha@GAY.miHoYo"
        }
    },
    "message": "OK",
    "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn apn_veriy_token() -> Json<serde_json::Value> {
    Json(json!({
    "data": {
        "tokens": [
            {
                "token": "mostsecuretokenever",
                "token_type": 1
            }
        ],
        "user_info": {
            "aid": "1337",
            "mid": "1337",
            "is_email_verify": 1,
            "area_code": "**",
            "country": "US",
            "is_adult": 1,
            "email": "Aeon ★ Aha@GAY.miHoYo"
        }
    },
    "message": "OK",
    "retcode": 0
    }))
}


#[tracing::instrument]
pub async fn apn_exchange() -> Json<serde_json::Value> {
    // The client calls exchange after the combo-granter login. Return the
    // session identifiers alongside the APN verify fields for client builds
    // that deserialize either response shape.
    Json(json!({
        "data": {
            "account": {
                "uid": "1337",
                "token": "mostsecuretokenever"
            },
            "uid": "1337",
            "token": "mostsecuretokenever",
            "tokens": [{
                "token": "mostsecuretokenever",
                "token_type": 1
            }],
            "user_info": {
                "aid": "1337",
                "mid": "1337",
                "is_email_verify": 1,
                "area_code": "**",
                "country": "US",
                "is_adult": 1,
                "email": "ReversedRooms"
            },
            "account_type": 1,
            "combo_id": "1337",
            "combo_token": "9065ad8507d5a1991cb6fddacac5999b780bbd92",
            "data": "{\"guest\":false}",
            "heartbeat": false,
            "open_id": "1337"
        },
        "message": "OK",
        "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn combo_get_config() -> Json<serde_json::Value> {
    Json(json!({
        "data": {
            "protocol": false,
            "qr_enabled": false,
            "log_level": "INFO",
            "announce_url": "",
            "push_alias_type": 2,
            "disable_ysdk_guard": false,
            "enable_announce_pic_popup": false
        },
        "message": "OK",
        "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn shield_load_config() -> Json<serde_json::Value> {
    Json(json!({
        "data": {
            "id": 1,
            "game_key": "hkrpg_cn",
            "client": "PC",
            "identity": "I_IDENTITY",
            "guest": false,
            "ignore_versions": "",
            "scene": "S_NORMAL",
            "name": "Honkai: Star Rail",
            "disable_regist": false,
            "enable_email_captcha": false,
            "thirdparty": [],
            "disable_mmt": true,
            "server_guest": false,
            "thirdparty_ignore": {},
            "enable_ps_bind_account": false,
            "thirdparty_login_configs": {},
            "initialize_firebase": false,
            "bbs_auth_login": false,
            "bbs_auth_login_ignore": []
        },
        "message": "OK",
        "retcode": 0
    }))
}

#[tracing::instrument]
pub async fn compare_protocol_version() -> Json<serde_json::Value> {
    Json(json!({
        "data": {
            "modified": false,
            "protocol": {
                "id": 0,
                "app_id": 8,
                "language": "th",
                "user_proto": "",
                "priv_proto": "",
                "major": 0,
                "minimum": 0,
                "create_time": "0",
                "teenager_proto": "",
                "third_proto": "",
                "full_priv_proto": ""
            }
        },
        "message": "OK",
        "retcode": 0
    }))
}
