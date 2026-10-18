use std::sync::Arc;

use crate::AppState;
use axum::extract::{Query, State};
use prost::Message;
use proto::{Dispatch, GateServer, RegionInfo};
use serde::Deserialize;
use tokio::sync::RwLock;
use tracing::instrument;

pub const QUERY_DISPATCH_ENDPOINT: &str = "/query_dispatch";
pub const QUERY_GATEWAY_ENDPOINT: &str = "/query_gateway";

#[tracing::instrument]
pub async fn query_dispatch() -> String {
    let rsp = Dispatch {
        retcode: 0,
        region_list: vec![RegionInfo {
            name: String::from("Aeon ★ Aha"),
            title: String::from("Aeon ★ Aha"),
            env_type: String::from("9"),
            dispatch_url: String::from("http://127.0.0.1:21000/query_gateway"),
            ..Default::default()
        }],
        ..Default::default()
    };

    let mut buff = Vec::new();
    rsp.encode(&mut buff).unwrap();

    rbase64::encode(&buff)
}

#[derive(Deserialize, Debug)]
pub struct QueryGatewayParameters {
    pub version: String,
    pub dispatch_seed: String,
}

#[instrument(skip(state))]
pub async fn query_gateway(
    State(state): State<Arc<RwLock<AppState>>>,
    parameters: Query<QueryGatewayParameters>,
) -> String {
    let mut lock = state.write().await;
    let config = lock
        .get_or_insert_hotfix(&parameters.version, &parameters.dispatch_seed)
        .await;

    let ex_resource_url = design_override_url(&parameters.version, &config.ex_resource_url)
        .unwrap_or_else(|| config.ex_resource_url.clone());
    tracing::info!("Ex Resource: {ex_resource_url}");

    let rsp = GateServer {
        ip: String::from("127.0.0.1"),
        port: 23301,
        asset_bundle_url: config.asset_bundle_url.clone(),
        asset_bundle_url_android: config.asset_bundle_url_android.clone(),
        ex_resource_url,
        lua_url: config.lua_url.clone(),
        ifix_version: String::from("0"),
        unk1: true,
        unk2: true,
        unk3: true,
        unk4: true,
        unk5: true,
        unk6: true,
        unk7: true,
        ..Default::default()
    };

    let mut buff = Vec::new();
    rsp.encode(&mut buff).unwrap();

    rbase64::encode(&buff)
}

fn design_override_url(version: &str, upstream: &str) -> Option<String> {
    if version.is_empty()
        || !version
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
    {
        return None;
    }
    let parsed = reqwest::Url::parse(upstream).ok()?;
    if parsed.scheme() != "https" {
        return None;
    }
    let cdn = parsed.path_segments()?.filter(|segment| !segment.is_empty()).last()?;
    if !cdn
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
    {
        return None;
    }
    let override_dir = crate::services::design_override::root_dir()
        .join(version)
        .join(cdn);
    if !override_dir.join("upstream.txt").is_file() {
        return None;
    }
    Some(format!(
        "http://127.0.0.1:21000/design_override/{version}/{cdn}"
    ))
}
