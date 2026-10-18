use axum::{http::StatusCode, Json};
use common::sr_tools::FreesrData;
use serde::{Deserialize, Serialize};
use tokio::fs;

pub const SRTOOLS_UPLOAD_ENDPOINT: &str = "/srtools";

#[derive(Debug, Deserialize)]
pub struct SrToolDataReq {
    #[allow(dead_code)]
    pub data: Option<FreesrData>,
}

#[derive(Debug, Serialize)]
pub struct SrToolDataRsp {
    pub message: String,
    pub status: u32,
}

pub async fn sr_tool_save(
    Json(json): Json<SrToolDataReq>,
) -> (StatusCode, Json<SrToolDataRsp>) {
    let Some(json) = json.data else {
        // RobinSR sends an empty POST as its connection check before sending
        // the actual data payload from the Sync action.
        return (
            StatusCode::OK,
            Json(SrToolDataRsp {
                message: String::from("OK"),
                status: 200,
            }),
        );
    };

    let json = match serde_json::to_string_pretty(&json) {
        Ok(json) => json,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(SrToolDataRsp {
                    message: format!("malformed json: {err}"),
                    status: 500,
                }),
            );
        }
    };

    let path = match std::env::current_dir() {
        Ok(directory) => directory.join("freesr-data.json"),
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(SrToolDataRsp {
                    message: format!("failed to resolve server working directory: {err}"),
                    status: 500,
                }),
            );
        }
    };

    if let Err(err) = fs::write(&path, json).await {
        tracing::error!("Failed to write freesr-data.json at {}: {err}", path.display());
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(SrToolDataRsp {
                message: format!("failed to write freesr-data.json at {}: {err}", path.display()),
                status: 500,
            }),
        );
    };

    tracing::info!("RobinSR updated {}", path.display());
    (
        StatusCode::OK,
        Json(SrToolDataRsp {
            message: format!("updated {}", path.display()),
            status: 200,
        }),
    )
}
