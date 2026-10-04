use super::*;

const SERVER_AVATAR_ICON: u32 = 201511;

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
    _session: &mut PlayerSession,
    body: &PlayerHeartBeatCsReq,
    res: &mut PlayerHeartBeatScRsp,
) {
    res.client_time_ms = body.client_time_ms;
    res.server_time_ms = body.client_time_ms;
    res.download_data = Some(ClientDownloadData {
        version: 51,
        time: res.server_time_ms as i64,
        data: rbase64::decode("bG9jYWwgZnVuY3Rpb24gYmV0YV90ZXh0KG9iaikKICAgIGxvY2FsIGdhbWVPYmplY3QgPSBDUy5Vbml0eUVuZ2luZS5HYW1lT2JqZWN0LkZpbmQoIlVJUm9vdC9BYm92ZURpYWxvZy9CZXRhSGludERpYWxvZyhDbG9uZSkiKQogICAgaWYgZ2FtZU9iamVjdCB0aGVuCiAgICAgICAgbG9jYWwgdGV4dENvbXBvbmVudCA9IGdhbWVPYmplY3Q6R2V0Q29tcG9uZW50SW5DaGlsZHJlbih0eXBlb2YoQ1MuUlBHLkNsaWVudC5Mb2NhbGl6ZWRUZXh0KSkKICAgICAgICBpZiB0ZXh0Q29tcG9uZW50IHRoZW4KICAgICAgICAgICAgdGV4dENvbXBvbmVudC50ZXh0ID0gIjxjb2xvcj0jMGJmZmUwPkhvcm95b2ktc2FuIOC2njwvY29sb3I+IHwgPGNvbG9yPSMwYjNjZmY+QWVvbjwvY29sb3I+IOKYhSA8Y29sb3I9I2ZmMDAwMD5BaGE8L2NvbG9yPiIKICAgICAgICBlbmQKICAgIGVuZAplbmQKCmxvY2FsIGZ1bmN0aW9uIHZlcnNpb25fdGV4dChvYmopCiAgICBsb2NhbCBnYW1lT2JqZWN0ID0gQ1MuVW5pdHlFbmdpbmUuR2FtZU9iamVjdC5GaW5kKCJWZXJzaW9uVGV4dCIpCiAgICBpZiBnYW1lT2JqZWN0IHRoZW4KICAgICAgICBsb2NhbCB0ZXh0Q29tcG9uZW50ID0gZ2FtZU9iamVjdDpHZXRDb21wb25lbnRJbkNoaWxkcmVuKHR5cGVvZihDUy5SUEcuQ2xpZW50LkxvY2FsaXplZFRleHQpKQogICAgICAgIGlmIHRleHRDb21wb25lbnQgdGhlbgogICAgICAgICAgICB0ZXh0Q29tcG9uZW50LnRleHQgPSAi4LmA4Lin4Lit4Lij4LmM4LiK4Lix4LiZ4Lib4Lix4LiI4LiI4Li44Lia4Lix4LiZ4LiE4Li34Lit4LmA4Lin4Lit4Lij4LmM4LiK4Lix4LiZ4LiX4LiU4Liq4Lit4LiaIOC4i+C4tuC5iOC4h+C5hOC4oeC5iOC5hOC4lOC5ieC4muC5iOC4h+C4muC4reC4geC4luC4tuC4h+C4hOC4uOC4k+C4oOC4suC4nuC4quC4uOC4lOC4l+C5ieC4suC4ouC4guC4reC4h+C5gOC4geC4oSA8Y29sb3I9I0ZGMDAwMD5IbzwvY29sb3I+PGNvbG9yPSNGRjdGMDA+bms8L2NvbG9yPjxjb2xvcj0jRkZGRjAwPmFpPC9jb2xvcj4gPGNvbG9yPSMwMEZGMDA+U3Q8L2NvbG9yPjxjb2xvcj0jMDAwMEZGPmFyPC9jb2xvcj4gPGNvbG9yPSM0QjAwODI+R2F5PC9jb2xvcj4iCiAgICAgICAgZW5kCiAgICBlbmQKZW5kCgp2ZXJzaW9uX3RleHQoKQpiZXRhX3RleHQoKQ==").unwrap(),
        ..Default::default()
    });
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
