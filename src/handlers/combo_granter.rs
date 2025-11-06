use std::collections::HashMap;

use axum::extract::Query;
use tracing::{error, info};

use super::*;

#[derive(Deserialize)]
struct GranterLoginRequestData {
    pub uid: String,
    pub token: String,
}

#[derive(Deserialize)]
struct GranterLoginRequest {
    pub data: String,
}

pub fn routes() -> Router<AppStateRef> {
    Router::new()
        .route(
            "/{product_name}/combo/granter/login/v2/login",
            post(login_v2),
        )
        .route(
            "/{product_name}/combo/granter/api/getConfig",
            get(api_get_config),
        )
        .route(
            "/{product_name}/combo/granter/api/compareProtocolVersion",
            post(compare_protocol_version),
        )
}

#[derive(Serialize)]
struct GranterLoginResponseData {
    pub account_type: u32,
    pub combo_id: String,
    pub combo_token: String,
    pub data: &'static str,
    pub heartbeat: bool,
    pub open_id: String,
}

async fn login_v2(
    state: State<AppStateRef>,
    request: Json<GranterLoginRequest>,
) -> Json<Response<GranterLoginResponseData>> {
    info!(
        "POST /{{product_name}}/combo/granter/login/v2/login - {}",
        &request.data
    );

    let Ok(data) = serde_json::from_str::<GranterLoginRequestData>(&request.data) else {
        error!("Couldn't convert data to GranterLoginRequestData");
        return Json(Response::error(-101, "Account token error"));
    };

    let Ok(uid) = data.uid.parse() else {
        error!("Couldn't convert parse uid as int");
        return Json(Response::error(-101, "Account token error"));
    };

    match state.db.get_account_by_uid(uid).await {
        Ok(Some(account)) if account.token == data.token => {
            info!("Logged in to account \"{}\"", account.username.as_str());
            success_rsp(data.uid.clone(), account.token)
        }
        _ => {
            error!("Couldn't find account with specified uid");
            Json(Response::error(-101, "Account token error"))
        }
    }
}

fn success_rsp(uid: String, token: String) -> Json<Response<GranterLoginResponseData>> {
    Json(Response::new(GranterLoginResponseData {
        account_type: 1,
        combo_id: uid.clone(),
        combo_token: token,
        data: r#"{"guest":false}"#,
        heartbeat: false,
        open_id: uid,
    }))
}

#[derive(Deserialize, Debug)]
#[allow(unused)]
struct GranterApiGetConfigRequest {
    pub app_id: u32,
    pub channel_id: u32,
    pub client_type: u32,
}

#[derive(Serialize)]
struct GranterApiGetConfigResponseData {
    pub protocol: bool,
    pub qr_enabled: bool,
    pub log_level: String,
    pub announce_url: String,
    pub push_alias_type: u32,
    pub disable_ysdk_guard: bool,
    pub enable_announce_pic_popup: bool,
    pub app_name: String,
    pub qr_enabled_apps: Option<HashMap<String, bool>>,
    pub qr_app_icons: Option<HashMap<String, String>>,
    pub qr_cloud_display_name: String,
    pub enable_user_center: bool,
    pub functional_switch_configs: HashMap<String, String>,
    pub ugc_protocol: bool,
}

async fn api_get_config(
    query: Query<GranterApiGetConfigRequest>,
) -> Json<Response<GranterApiGetConfigResponseData>> {
    info!(
        "GET {{productName}}/combo/granter/api/getConfig - {:?}",
        query
    );

    Json(Response::new(GranterApiGetConfigResponseData {
        protocol: false,
        qr_enabled: true,
        log_level: String::from("INFO"),
        announce_url: String::from(
            "https://sdk.mihoyo.com/nap/btannouncement/index.html?sdk_presentation_style=fullscreen&sdk_screen_transparent=true&auth_appid=announcement&game=nap&game_biz=nap_cn&authkey_ver=1&sign_type=2&version=2.30#/",
        ),
        push_alias_type: 0,
        disable_ysdk_guard: false,
        enable_announce_pic_popup: true,
        app_name: String::from("Zenless Zone Zero"),
        qr_enabled_apps: (query.client_type == 3).then_some(HashMap::<_, _>::from([
            (String::from("bbs"), true),
            (String::from("cloud"), false),
        ])),
        qr_app_icons: (query.client_type == 3).then_some(HashMap::<_, _>::from([
            (String::from("app"), String::new()),
            (String::from("bbs"), String::new()),
            (String::from("cloud"), String::new()),
        ])),
        qr_cloud_display_name: String::from("Zenless Zone Zero Cloud"),
        enable_user_center: true,
        functional_switch_configs: HashMap::<_, _>::new(),
        ugc_protocol: true,
    }))
}

#[derive(Deserialize, Debug)]
#[allow(unused)]
struct GranterCompareProtocolVersionRequest {
    pub app_id: u32,
    pub channel_id: u32,
    pub language: String,
    pub major: String,
    pub minimum: String,
}

#[derive(Serialize)]
struct GranterCompareProtocolVersionResponseData {
    pub modified: bool,
    pub protocol: Option<GranterCompareProtocolVersionProtocolResponseData>,
}

#[derive(Serialize)]
struct GranterCompareProtocolVersionProtocolResponseData {
    pub id: u32,
    pub app_id: u32,
    pub language: String,
    pub user_proto: String,
    pub priv_proto: String,
    pub major: u32,
    pub minimum: u32,
    pub create_time: String,
    pub teenager_proto: String,
    pub third_proto: String,
    pub full_priv_proto: String,
}

async fn compare_protocol_version(
    body: Json<GranterCompareProtocolVersionRequest>,
) -> Json<Response<GranterCompareProtocolVersionResponseData>> {
    info!(
        "POST /{{product_name}}/combo/granter/api/compareProtocolVersion - {:?}",
        body
    );

    Json(Response::new(GranterCompareProtocolVersionResponseData {
        modified: true,
        protocol: Some(GranterCompareProtocolVersionProtocolResponseData {
            id: 0,
            app_id: body.app_id,
            language: body.language.clone(),
            user_proto: String::new(),
            priv_proto: String::new(),
            major: body.major.parse().unwrap_or(match body.app_id {
                11 => 0,
                _ => 6,
            }),
            minimum: body.minimum.parse().unwrap_or(match body.app_id {
                11 => 14,
                _ => 1,
            }),
            create_time: String::from("0"),
            teenager_proto: String::new(),
            third_proto: String::new(),
            full_priv_proto: String::new(),
        }),
    }))
}
