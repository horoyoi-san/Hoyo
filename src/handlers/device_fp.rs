use axum::extract::Query;
use tracing::{error, info};

use super::*;

pub fn routes() -> Router<AppStateRef> {
    Router::new()
        .route("/device-fp/api/getExtList", get(get_ext_list))
        .route("/device-fp/api/getFp", post(get_fp))
        .route(
            "/data_abtest_api/config/experiment/list",
            post(data_abtest_api),
        )
}

#[derive(Deserialize, Debug)]
struct DeviceGetExtListRequestData {
    pub platform: u32,
}

#[derive(Serialize)]
struct DeviceGetExtListResponseData {
    pub code: u32,
    pub msg: String,
    pub ext_list: Vec<&'static str>,
    pub pkg_list: Vec<String>,
    pub pkg_str: String,
}

async fn get_ext_list(
    query: Query<DeviceGetExtListRequestData>,
) -> Json<Response<DeviceGetExtListResponseData>> {
    info!("GET /device-fp/api/getExtList - {:?}", &query);

    match query.platform {
        3 => Json(Response::new(DeviceGetExtListResponseData {
            code: 200,
            msg: String::from("ok"),
            ext_list: vec![
                "cpuName",
                "deviceModel",
                "deviceName",
                "deviceType",
                "deviceUID",
                "gpuID",
                "gpuName",
                "gpuAPI",
                "gpuVendor",
                "gpuVersion",
                "gpuMemory",
                "osVersion",
                "cpuCores",
                "cpuFrequency",
                "gpuVendorID",
                "isGpuMultiTread",
                "memorySize",
                "screenSize",
                "engineName",
                "addressMAC",
                "packageVersion",
            ],
            pkg_list: vec![],
            pkg_str: String::from("/vK5WTh5SS3SAj8Zm0qPWg=="),
        })),
        _ => {
            error!("Unsupported platform");
            Json(Response::new(DeviceGetExtListResponseData {
                code: 401,
                msg: String::from("Unsupported platform"),
                ext_list: vec![],
                pkg_list: vec![],
                pkg_str: String::new(),
            }))
        }
    }
}

#[derive(Serialize)]
struct DeviceGetFPResponseData {}

async fn get_fp(body: String) -> Json<Response<DeviceGetFPResponseData>> {
    info!("POST /device-fp/api/getFp - {:?}", &body);

    Json(Response::new(DeviceGetFPResponseData {}))
}

async fn data_abtest_api(body: String) -> &'static str {
    info!("POST /data_abtest_api/config/experiment/list - {:?}", &body);

    r#"{"retcode":0,"success":true,"message":"","data":[{"code":1000,"type":1,"config_id":"6486","period_id":"6486_691","version":"1","configs":{"webViewRenderMethod":"none"},"sceneWhiteList":false,"experimentWhiteList":false},{"code":1000,"type":2,"config_id":"145","period_id":"6486_691","version":"1","configs":{"webViewRenderMethod":"none"},"sceneWhiteList":false,"experimentWhiteList":false}]}"#
}
