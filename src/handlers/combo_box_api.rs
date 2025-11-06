use std::collections::HashMap;

use axum::extract::Query;
use tracing::{error, info};

use super::*;

pub fn routes() -> Router<AppStateRef> {
    Router::new()
        .route("/combo/box/api/config/sdk/combo", get(config_sdk_combo))
        .route("/combo/box/api/config/sw/precache", get(config_sw_precache))
}

#[derive(Deserialize, Debug)]
#[allow(unused)]
struct ConfigSDKComboRequest {
    pub biz_key: String,
    pub client_type: u32,
}

#[derive(Serialize)]
struct ConfigSDKComboResponseData {
    pub vals: HashMap<String, String>,
}

async fn config_sdk_combo(
    query: Query<ConfigSDKComboRequest>,
) -> Json<Response<ConfigSDKComboResponseData>> {
    info!("GET /combo/box/api/config/sdk/combo - {:?}", &query);

    match query.client_type {
        3 => Json(Response::new(ConfigSDKComboResponseData {
            vals: HashMap::<_, _>::from([
                (
                    String::from("httpdns_plus_config"),
                    String::from(
                        "{ \"enable\": 1, \"cache_expire_time\": 300, \"ip_report_enable\":1}",
                    ),
                ),
                (
                    String::from("login_record_config"),
                    String::from("{\"is_checked\":true}"),
                ),
                (
                    String::from("network_report_config"),
                    String::from(
                        "{ \"enable\": 1, \"status_codes\": [206], \"url_paths\": [\"dataUpload\"] }",
                    ),
                ),
                (String::from("list_goods_work_mode"), String::from("1")),
                (
                    String::from("kibana_pc_config"),
                    String::from(
                        "{ \"enable\": 1, \"level\": \"Info\",\"modules\": [\"download\"] }",
                    ),
                ),
                (
                    String::from("h5log_filter_config"),
                    String::from(
                        "{\n\t\"function\": {\n\t\t\"event_name\": [\"info_get_cps\", \"notice_close_notice\", \"info_get_uapc\", \"report_set_info\", \"info_get_channel_id\", \"info_get_sub_channel_id\"]\n\t}\n}",
                    ),
                ),
                (
                    String::from("webview_apm_config"),
                    String::from("{ \"crash_capture_enable\": true }"),
                ),
                (
                    String::from("webview_rendermethod_config"),
                    String::from("{ \"useLegacy\": false }"),
                ),
                (String::from("enable_web_dpi"), String::from("true")),
            ]),
        })),
        _ => {
            error!("Unknown client_type");
            Json(Response::error(7, "RetCode_NoConfig"))
        }
    }
}

#[derive(Serialize)]
struct ConfigSWPrecacheResponseData {
    pub vals: HashMap<String, String>,
}

async fn config_sw_precache() -> Json<Response<ConfigSWPrecacheResponseData>> {
    info!("GET /combo/box/api/config/sw/precache");

    Json(Response::new(ConfigSWPrecacheResponseData {
        vals: HashMap::<_, _>::from([
            (
                String::from("url"),
                String::from("https://sdk.mihoyo.com/sw.html"),
            ),
            (String::from("enable"), String::from("true")),
        ]),
    }))
}
