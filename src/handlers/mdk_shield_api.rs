use std::collections::HashMap;

use axum::extract::Query;
use tracing::{error, info};

use super::*;

pub fn routes() -> Router<AppStateRef> {
    Router::new()
        .route("/{product_name}/mdk/shield/api/login", post(login))
        .route("/{product_name}/mdk/shield/api/verify", post(verify))
        .route(
            "/{product_name}/mdk/shield/api/loadConfig",
            get(load_config),
        )
}

#[derive(Deserialize, Debug)]
struct LoginRequest {
    pub account: String,
    pub password: String,
    pub is_crypto: bool,
}

#[derive(Deserialize, Debug)]
struct VerifyRequest {
    pub uid: String,
    pub token: String,
}

#[derive(Deserialize, Debug)]
struct LoadConfigRequest {
    pub client: u32,
    pub game_key: String,
}

#[derive(Serialize, Default)]
struct ResponseData {
    pub account: ResponseAccountData,
    pub device_grant_required: bool,
    pub reactive_required: bool,
    pub realperson_required: bool,
    pub safe_mobile_required: bool,
}

#[derive(Serialize, Default)]
struct ResponseAccountData {
    pub area_code: String,
    pub email: String,
    pub country: String,
    pub is_email_verify: String,
    pub token: String,
    pub uid: String,
}

#[derive(Serialize, Default)]
struct ResponseLoadConfigData {
    pub id: u32,
    pub game_key: String,
    pub client: String,
    pub identity: String,
    pub guest: bool,
    pub ignore_version: String,
    pub scene: String,
    pub name: String,
    pub disable_regist: bool,
    pub enable_email_captcha: bool,
    pub thirdparty: Vec<String>,
    pub disable_mmt: bool,
    pub server_guest: bool,
    pub thirdparty_ignore: HashMap<String, String>,
    pub enable_ps_bind_account: bool,
    pub thirdparty_login_configs: HashMap<String, String>,
    pub initialize_firebase: bool,
    pub bbs_auth_login: bool,
    pub bbs_auth_login_ignore: Vec<String>,
    pub fetch_instance_id: bool,
    pub enable_flash_login: bool,
    pub enable_logo_18: bool,
    pub logo_height: String,
    pub logo_width: String,
    pub enable_cx_bind_account: bool,
    pub firebase_blacklist_devices_switch: bool,
    pub firebase_blacklist_devices_version: u32,
    pub hoyolab_auth_login: bool,
    pub hoyolab_auth_login_ignore: Vec<String>,
    pub hoyoplay_auth_login: bool,
    pub enable_douyin_flash_login: bool,
    pub enable_age_gate: bool,
    pub enable_age_gate_ignore: Vec<String>,
}

async fn login(
    state: State<AppStateRef>,
    request: Json<LoginRequest>,
) -> Json<Response<ResponseData>> {
    info!(
        "POST /{{product_name}}/mdk/shield/api/login - {:?}",
        &request
    );

    if !request.is_crypto {
        error!("Unencrypted passwords are disabled by SDK security policy");
        return Json(Response::error(
            -10,
            "Invalid account format: unencrypted passwords are disabled by SDK security policy",
        ));
    }

    let Ok(password) = crate::util::rsa_decrypt(&request.password) else {
        error!("Couldn't decrypt password");
        return Json(Response::error(
            -10,
            "Your patch is outdated, get a new one at https://discord.gg/reversedrooms (Password decryption failed)",
        ));
    };

    let account = match state.db.get_account_by_name(request.account.clone()).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            error!("Couldn't find account with specified login");
            return Json(Response::error(-101, "Account or password error"));
        }
        Err(err) => {
            error!("database error: {err}");
            return Json(Response::error(-1, "Internal server error"));
        }
    };

    if !account.password.verify(&password) {
        error!("Password doesn't match");
        return Json(Response::error(-101, "Account or password error"));
    }

    info!("Logged in to account \"{}\"", account.username.as_str());
    Json(Response::new(ResponseData {
        account: ResponseAccountData {
            area_code: String::from("**"),
            email: account.username.as_str().to_string(),
            country: String::from("RU"),
            is_email_verify: String::from("1"),
            uid: account.uid.to_string(),
            token: account.token,
        },
        ..Default::default()
    }))
}

async fn verify(
    state: State<AppStateRef>,
    request: Json<VerifyRequest>,
) -> Json<Response<ResponseData>> {
    info!(
        "POST /{{product_name}}/mdk/shield/api/verify - {:?}",
        &request
    );

    let Ok(uid) = request.uid.parse() else {
        error!("Couldn't convert parse uid as int");
        return Json(Response::error(-101, "Account cache error"));
    };

    let account = match state.db.get_account_by_uid(uid).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            error!("Couldn't find account with specified uid");
            return Json(Response::error(-101, "Account cache error"));
        }
        Err(err) => {
            error!("database error: {err}");
            return Json(Response::error(-1, "Internal server error"));
        }
    };

    if account.token == request.token {
        info!("Logged in to account \"{}\"", account.username.as_str());
        Json(Response::new(ResponseData {
            account: ResponseAccountData {
                area_code: String::from("**"),
                email: account.username.as_str().to_string(),
                country: String::from("RU"),
                is_email_verify: String::from("1"),
                uid: account.uid.to_string(),
                token: account.token,
            },
            ..Default::default()
        }))
    } else {
        error!("Token doesn't match");
        Json(Response::error(
            -101,
            "For account safety, please log in again",
        ))
    }
}

async fn load_config(query: Query<LoadConfigRequest>) -> Json<Response<ResponseLoadConfigData>> {
    info!(
        "GET /{{product_name}}/mdk/shield/api/loadConfig - {:?}",
        &query
    );
    match query.client {
        1..=3 => Json(Response::new(ResponseLoadConfigData {
            id: 28 + query.client,
            game_key: query.game_key.clone(),
            client: String::from(match query.client {
                1 => "IOS",
                2 => "Android",
                3 => "PC",
                _ => unreachable!("Invalid query client"),
            }),
            identity: String::from("I_IDENTITY"),
            guest: false,
            ignore_version: String::new(),
            scene: String::from("S_NORMAL"),
            name: String::from("Nap"),
            disable_regist: false,
            enable_email_captcha: false,
            thirdparty: Vec::<_>::new(),
            disable_mmt: false,
            server_guest: (query.client == 1),
            thirdparty_ignore: HashMap::<_, _>::new(),
            enable_ps_bind_account: false,
            thirdparty_login_configs: HashMap::<_, _>::new(),
            initialize_firebase: false,
            bbs_auth_login: (query.client != 3),
            bbs_auth_login_ignore: Vec::<_>::new(),
            fetch_instance_id: false,
            enable_flash_login: (query.client != 3),
            enable_logo_18: false,
            logo_height: String::from("0"),
            logo_width: String::from("0"),
            enable_cx_bind_account: false,
            firebase_blacklist_devices_switch: false,
            firebase_blacklist_devices_version: 0,
            hoyolab_auth_login: false,
            hoyolab_auth_login_ignore: Vec::<_>::new(),
            hoyoplay_auth_login: (query.client == 3),
            enable_douyin_flash_login: false,
            enable_age_gate: false,
            enable_age_gate_ignore: Vec::<_>::new(),
        })),
        _ => {
            error!("Unknown client type");
            Json(Response::error(-104, "Missing configuration"))
        }
    }
}
