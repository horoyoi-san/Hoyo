use super::*;

const SERVER_AVATAR_ICON: u32 = 201511;
const UI_TEXT_CONFIG_PATH: &str = "UID_Custom.json";

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(default)]
struct UiTextConfig {
    beta_text: String,
    version_text: String,
}

impl Default for UiTextConfig {
    fn default() -> Self {
        Self {
            beta_text: String::from(
                "<color=#0bffe0>Horoyoi-san ඞ</color> | <color=#0b3cff>Aeon</color> ★ <color=#ff0000>Aha</color>",
            ),
            version_text: String::from(
                "เวอร์ชันปัจจุบันคือเวอร์ชันทดสอบ ซึ่งไม่ได้บ่งบอกถึงคุณภาพสุดท้ายของเกม <color=#FF0000>Ho</color><color=#FF7F00>nk</color><color=#FFFF00>ai</color> <color=#00FF00>St</color><color=#0000FF>ar</color> <color=#4B0082>Gay</color>",
            ),
        }
    }
}

fn lua_string_literal(value: &str) -> String {
    let mut literal = String::from("\"");
    for character in value.chars() {
        match character {
            '\\' => literal.push_str("\\\\"),
            '"' => literal.push_str("\\\""),
            '\n' => literal.push_str("\\n"),
            '\r' => literal.push_str("\\r"),
            '\t' => literal.push_str("\\t"),
            character if character.is_control() && (character as u32) <= 255 => {
                literal.push_str(&format!("\\{:03}", character as u32));
            }
            character => literal.push(character),
        }
    }
    literal.push('"');
    literal
}

fn build_ui_text_script(config: &UiTextConfig) -> String {
    let beta_text = lua_string_literal(&config.beta_text);
    let version_text = lua_string_literal(&config.version_text);
    format!(
        r#"local function beta_text(obj)
    local gameObject = CS.UnityEngine.GameObject.Find("UIRoot/AboveDialog/BetaHintDialog(Clone)")
    if gameObject then
        local textComponent = gameObject:GetComponentInChildren(typeof(CS.RPG.Client.LocalizedText))
        if textComponent then
            textComponent.text = {beta_text}
        end
    end
end

local function version_text(obj)
    local gameObject = CS.UnityEngine.GameObject.Find("VersionText")
    if gameObject then
        local textComponent = gameObject:GetComponentInChildren(typeof(CS.RPG.Client.LocalizedText))
        if textComponent then
            textComponent.text = {version_text}
        end
    end
end

version_text()
beta_text()"#
    )
}

async fn load_ui_text_config() -> UiTextConfig {
    match tokio::fs::read_to_string(UI_TEXT_CONFIG_PATH).await {
        Ok(contents) => match serde_json::from_str(&contents) {
            Ok(config) => config,
            Err(err) => {
                tracing::warn!("Could not parse {UI_TEXT_CONFIG_PATH}; using built-in UI text: {err}");
                UiTextConfig::default()
            }
        },
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            let config = UiTextConfig::default();
            match serde_json::to_string_pretty(&config) {
                Ok(contents) => match tokio::fs::write(UI_TEXT_CONFIG_PATH, contents).await {
                    Ok(()) => tracing::info!("Created default {UI_TEXT_CONFIG_PATH}"),
                    Err(write_err) => tracing::warn!(
                        "Could not create {UI_TEXT_CONFIG_PATH}; using built-in UI text: {write_err}"
                    ),
                },
                Err(serialize_err) => tracing::warn!(
                    "Could not serialize default {UI_TEXT_CONFIG_PATH}: {serialize_err}"
                ),
            }
            config
        }
        Err(err) => {
            tracing::warn!("Could not read {UI_TEXT_CONFIG_PATH}; using built-in UI text: {err}");
            UiTextConfig::default()
        }
    }
}

pub async fn on_get_player_board_data_cs_req(
    _session: &mut PlayerSession,
    _req: &GetPlayerBoardDataCsReq,
    res: &mut GetPlayerBoardDataScRsp,
) {
    res.kninldpflma = vec![HeadIconData {
        id: SERVER_AVATAR_ICON,
    }];
    res.current_head_icon_id = SERVER_AVATAR_ICON;
}

pub async fn on_set_head_icon_cs_req(
    _session: &mut PlayerSession,
    req: &SetHeadIconCsReq,
    res: &mut SetHeadIconScRsp,
) {
    res.current_head_icon_id = SERVER_AVATAR_ICON;
    if req.id != SERVER_AVATAR_ICON {
        res.retcode = 3702;
    }
}

pub async fn on_get_basic_info_cs_req(
    _session: &mut PlayerSession,
    _body: &GetBasicInfoCsReq,
    res: &mut GetBasicInfoScRsp,
) {
    res.player_setting_info = Some(PlayerSettingInfo::default());
    res.gender = Gender::Woman as u32;
    res.is_gender_set = true;
}

pub async fn on_player_heart_beat_cs_req(
    session: &mut PlayerSession,
    body: &PlayerHeartBeatCsReq,
    res: &mut PlayerHeartBeatScRsp,
) {
    res.client_time_ms = body.client_time_ms;
    res.server_time_ms = body.client_time_ms;
    let ui_text = load_ui_text_config().await;
    res.download_data = Some(ClientDownloadData {
        version: 51,
        time: res.server_time_ms as i64,
        data: build_ui_text_script(&ui_text).into_bytes(),
        ..Default::default()
    });
    if let Err(err) = session.sync_player_if_data_changed().await {
        tracing::error!("Failed to auto-sync changed freesr-data.json: {err:#}");
    }
}

pub async fn on_player_login_finish_cs_req(
    session: &mut PlayerSession,
    _req: &PlayerLoginFinishCsReq,
    _res: &mut PlayerLoginFinishScRsp,
) -> Result<()> {
    session
        .send(ContentPackageSyncDataScNotify {
            data: Some(ContentPackageData {
                content_package_list: [
                    200001, 200002, 200003, 200004, 200005, 200006, 200007, 200008, 200009, 200010,
                    200011, 200012, 150017, 150015, 150021, 150018, 130011, 130012, 130013, 150025,
                    140006, 150026, 130014, 150034, 150029, 150035, 150041, 150039, 150045, 150057,
                    150042, 150067, 150064, 150063, 150024, 171002, 150068, 150070, 150071, 150073,
                    150074, 150075, 150076, 150077, 150078, 150079,
                ]
                .into_iter()
                .map(|v| ContentPackageInfo {
                    status: ContentPackageStatus::Finished.into(),
                    content_id: v,
                })
                .collect(),
                ..Default::default()
            }),
        })
        .await?;

    Ok(())
}
