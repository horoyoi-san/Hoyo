use tracing::{error, info};

use super::*;

pub fn routes() -> Router<AppStateRef> {
    Router::new()
        .route(
            "/{product_name}/account/ma-passport/api/appLoginByPassword",
            post(app_login_by_password),
        )
        .route(
            "/{product_name}/account/ma-passport/token/verifySToken",
            post(verify_s_token),
        )
}

#[derive(Deserialize, Debug)]
struct LoginRequest {
    pub account: String,
    pub password: String,
}

#[derive(Serialize)]
struct LoginResponseData {
    pub token: TokenData,
    pub user_info: UserInfoData,
    pub ext_user_info: ExtUserInfoData,
    pub reactivate_action_ticket: String,
    pub bind_email_action_ticket: String,
}

#[derive(Serialize)]
struct TokenData {
    pub token_type: u32,
    pub token: String,
}

#[derive(Serialize)]
struct UserInfoData {
    pub aid: String,
    pub mid: String,
    pub account_name: String,
    pub email: String,
    pub is_email_verify: u32,
    pub area_code: String,
    pub mobile: String,
    pub safe_area_code: String,
    pub safe_mobile: String,
    pub realname: String,
    pub identity_code: String,
    pub rebind_area_code: String,
    pub rebind_mobile: String,
    pub rebind_mobile_time: String,
    pub links: Vec<LinkData>,
    pub country: String,
    pub password_time: String,
    pub is_adult: u32,
    pub unmasked_email: String,
    pub unmasked_email_type: u32,
}

#[derive(Serialize, Default)]
struct LinkData {
    pub thirdparty: String,
    pub union_id: String,
    pub nickname: String,
    pub email: String,
    #[serde(rename = "subType")]
    pub sub_type: String,
    pub sub_union_id: String,
}

#[derive(Serialize, Default)]
struct ExtUserInfoData {
    pub guardian_email: String,
    pub birth: String,
}

async fn app_login_by_password(
    state: State<AppStateRef>,
    request: Json<LoginRequest>,
) -> Json<Response<LoginResponseData>> {
    info!(
        "POST /{{product_name}}/account/ma-passport/api/appLoginByPassword - {:?}",
        &request
    );

    let Ok(login) = crate::util::rsa_decrypt(&request.account) else {
        error!("Couldn't decrypt account (login)");
        return Json(Response::error(
            -10,
            "Your patch is outdated, get a new one at https://discord.gg/reversedrooms (Password decryption failed)",
        ));
    };
    let Ok(password) = crate::util::rsa_decrypt(&request.password) else {
        error!("Couldn't decrypt password");
        return Json(Response::error(
            -10,
            "Your patch is outdated, get a new one at https://discord.gg/reversedrooms (Password decryption failed)",
        ));
    };

    let account = match state.db.get_account_by_name(login.clone()).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            error!("Couldn't find account with specified login \"{login}\"");
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
    Json(Response::new(LoginResponseData {
        token: TokenData {
            token_type: 1,
            token: account.token,
        },
        user_info: UserInfoData {
            aid: account.uid.to_string(),
            mid: account.uid.to_string(),
            account_name: String::new(),
            email: account.username.as_str().to_string(),
            is_email_verify: 0,
            area_code: String::from("**"),
            mobile: String::new(),
            safe_area_code: String::new(),
            safe_mobile: String::new(),
            realname: String::new(),
            identity_code: String::new(),
            rebind_area_code: String::new(),
            rebind_mobile: String::new(),
            rebind_mobile_time: String::from("315532800"),
            links: Vec::new(),
            country: String::from("RU"),
            password_time: String::from("1762297200"),
            is_adult: 0,
            unmasked_email: String::new(),
            unmasked_email_type: 0,
        },
        ext_user_info: ExtUserInfoData {
            guardian_email: String::new(),
            birth: String::from("0"),
        },
        reactivate_action_ticket: String::new(),
        bind_email_action_ticket: String::new(),
    }))
}

#[derive(Deserialize, Debug)]
struct VerifySTokenRequest {
    pub mid: String,
    pub stoken: String,
}

#[derive(Serialize)]
struct VerifySTokenResponseData {
    pub user_info: UserInfoData,
    pub tokens: Vec<TokenData>,
    pub ext_user_info: ExtUserInfoData,
}

async fn verify_s_token(
    state: State<AppStateRef>,
    request: Json<VerifySTokenRequest>,
) -> Json<Response<VerifySTokenResponseData>> {
    info!(
        "POST /{{product_name}}/account/ma-passport/token/verifySToken - {:?}",
        &request
    );

    let Ok(uid) = request.mid.parse() else {
        error!("Couldn't convert parse mid as int");
        return Json(Response::error(-101, "Account cache error"));
    };

    let account = match state.db.get_account_by_uid(uid).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            error!("Couldn't find account with specified uid");
            return Json(Response::error(-101, "Account cache error"));
        }
        Err(err) => {
            tracing::error!("database error: {err}");
            return Json(Response::error(-1, "Internal server error"));
        }
    };

    if account.token == request.stoken {
        info!("Logged in to account \"{}\"", account.username.as_str());
        Json(Response::new(VerifySTokenResponseData {
            user_info: UserInfoData {
                aid: account.uid.to_string(),
                mid: account.uid.to_string(),
                account_name: String::new(),
                email: account.username.as_str().to_string(),
                is_email_verify: 0,
                area_code: String::from("**"),
                mobile: String::new(),
                safe_area_code: String::new(),
                safe_mobile: String::new(),
                realname: String::new(),
                identity_code: String::new(),
                rebind_area_code: String::new(),
                rebind_mobile: String::new(),
                rebind_mobile_time: String::from("315532800"),
                links: Vec::new(),
                country: String::from("RU"),
                password_time: String::from("1762297200"),
                is_adult: 0,
                unmasked_email: String::new(),
                unmasked_email_type: 0,
            },
            tokens: vec![TokenData {
                token_type: 1,
                token: account.token,
            }],
            ext_user_info: ExtUserInfoData {
                guardian_email: String::new(),
                birth: String::from("0"),
            },
        }))
    } else {
        error!("Token doesn't match");
        Json(Response::error(
            -101,
            "For account safety, please log in again",
        ))
    }
}
