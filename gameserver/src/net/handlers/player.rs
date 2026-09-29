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
        data: rbase64::decode("bG9jYWwgZnVuY3Rpb24gYmV0YV90ZXh0KG9iaikKICAgIGxvY2FsIGdhbWVPYmplY3QgPSBDUy5Vbml0eUVuZ2luZS5HYW1lT2JqZWN0LkZpbmQoIlVJUm9vdC9BYm92ZURpYWxvZy9CZXRhSGludERpYWxvZyhDbG9uZSkiKQogICAgaWYgZ2FtZU9iamVjdCB0aGVuCiAgICAgICAgbG9jYWwgdGV4dENvbXBvbmVudCA9IGdhbWVPYmplY3Q6R2V0Q29tcG9uZW50SW5DaGlsZHJlbih0eXBlb2YoQ1MuUlBHLkNsaWVudC5Mb2NhbGl6ZWRUZXh0KSkKCiAgICAgICAgaWYgdGV4dENvbXBvbmVudCB0aGVuCiAgICAgICAgICAgIHRleHRDb21wb25lbnQudGV4dCA9CiAgICAgICAgICAgICAgICAiPGNvbG9yPSMwYmZmZTA+SG9yb3lvaS1zYW4g4LaePC9jb2xvcj4gfCAiIC4uCiAgICAgICAgICAgICAgICAiPGNvbG9yPSMwYjNjZmY+QWVvbjwvY29sb3I+IOKYhSAiIC4uCiAgICAgICAgICAgICAgICAiPGNvbG9yPSNmZjAwMDA+QWhhPC9jb2xvcj4iCgogICAgICAgICAgICBsb2NhbCB0bXBUZXh0ID0gdGV4dENvbXBvbmVudDpHZXRDb21wb25lbnRJbkNoaWxkcmVuKHR5cGVvZihDUy5UTVByby5UTVBfVGV4dCkpCgogICAgICAgICAgICBpZiB0bXBUZXh0IHRoZW4KICAgICAgICAgICAgICAgIGxvY2FsIG1hdGVyaWFsID0gdG1wVGV4dC5mb250TWF0ZXJpYWwKCiAgICAgICAgICAgICAgICBpZiBtYXRlcmlhbCB0aGVuCiAgICAgICAgICAgICAgICAgICAgbG9jYWwgZ2xvd0NvbG9yID0gQ1MuVW5pdHlFbmdpbmUuQ29sb3IoMC4wLCAwLjcsIDEuMCwgMS4wKQoKICAgICAgICAgICAgICAgICAgICBsb2NhbCBnbG93Q29sb3JJRCA9CiAgICAgICAgICAgICAgICAgICAgICAgIENTLlVuaXR5RW5naW5lLlNoYWRlci5Qcm9wZXJ0eVRvSUQoIl9HbG93Q29sb3IiKQoKICAgICAgICAgICAgICAgICAgICBsb2NhbCBnbG93UG93ZXJJRCA9CiAgICAgICAgICAgICAgICAgICAgICAgIENTLlVuaXR5RW5naW5lLlNoYWRlci5Qcm9wZXJ0eVRvSUQoIl9HbG93UG93ZXIiKQoKICAgICAgICAgICAgICAgICAgICBsb2NhbCBnbG93T3V0ZXJJRCA9CiAgICAgICAgICAgICAgICAgICAgICAgIENTLlVuaXR5RW5naW5lLlNoYWRlci5Qcm9wZXJ0eVRvSUQoIl9HbG93T3V0ZXIiKQoKICAgICAgICAgICAgICAgICAgICBpZiBtYXRlcmlhbDpIYXNQcm9wZXJ0eShnbG93Q29sb3JJRCkgdGhlbgogICAgICAgICAgICAgICAgICAgICAgICBtYXRlcmlhbDpTZXRDb2xvcihnbG93Q29sb3JJRCwgZ2xvd0NvbG9yKQogICAgICAgICAgICAgICAgICAgIGVuZAoKICAgICAgICAgICAgICAgICAgICBpZiBtYXRlcmlhbDpIYXNQcm9wZXJ0eShnbG93UG93ZXJJRCkgdGhlbgogICAgICAgICAgICAgICAgICAgICAgICBtYXRlcmlhbDpTZXRGbG9hdChnbG93UG93ZXJJRCwgMC4yNSkKICAgICAgICAgICAgICAgICAgICBlbmQKCiAgICAgICAgICAgICAgICAgICAgaWYgbWF0ZXJpYWw6SGFzUHJvcGVydHkoZ2xvd091dGVySUQpIHRoZW4KICAgICAgICAgICAgICAgICAgICAgICAgbWF0ZXJpYWw6U2V0RmxvYXQoZ2xvd091dGVySUQsIDAuMjUpCiAgICAgICAgICAgICAgICAgICAgZW5kCiAgICAgICAgICAgICAgICBlbmQKICAgICAgICAgICAgZW5kCiAgICAgICAgZW5kCiAgICBlbmQKZW5kCgpsb2NhbCBmdW5jdGlvbiB2ZXJzaW9uX3RleHQob2JqKQogICAgbG9jYWwgZ2FtZU9iamVjdCA9IENTLlVuaXR5RW5naW5lLkdhbWVPYmplY3QuRmluZCgiVmVyc2lvblRleHQiKQoKICAgIGlmIGdhbWVPYmplY3QgdGhlbgogICAgICAgIGxvY2FsIHRleHRDb21wb25lbnQgPQogICAgICAgICAgICBnYW1lT2JqZWN0OkdldENvbXBvbmVudEluQ2hpbGRyZW4odHlwZW9mKENTLlJQRy5DbGllbnQuTG9jYWxpemVkVGV4dCkpCgogICAgICAgIGlmIHRleHRDb21wb25lbnQgdGhlbgogICAgICAgICAgICB0ZXh0Q29tcG9uZW50LnRleHQgPQogICAgICAgICAgICAgICAgIjxjb2xvcj0jYmIwMGZmPuC4meC4teC5iOC4hOC4t+C4reC5gOC4p+C4reC4o+C5jOC4iuC4seC5iOC4meC4l+C4lOC4quC4reC4miDguKLguLHguIfguYTguKHguYjguYTguJTguYnguKPguLDguJTguLHguJrguITguLjguJPguKDguLLguJ7guILguK3guIfguYDguIHguKE8L2NvbG9yPiAiIC4uCiAgICAgICAgICAgICAgICAiPGNvbG9yPSNGRjAwMDA+SG88L2NvbG9yPiIgLi4KICAgICAgICAgICAgICAgICI8Y29sb3I9I0ZGN0YwMD5uazwvY29sb3I+IiAuLgogICAgICAgICAgICAgICAgIjxjb2xvcj0jRkZGRjAwPmFpPC9jb2xvcj4gIiAuLgogICAgICAgICAgICAgICAgIjxjb2xvcj0jMDBGRjAwPlN0PC9jb2xvcj4iIC4uCiAgICAgICAgICAgICAgICAiPGNvbG9yPSMwMDAwRkY+YXI8L2NvbG9yPiAiIC4uCiAgICAgICAgICAgICAgICAiPGNvbG9yPSM0QjAwODI+R2F5PC9jb2xvcj4iCiAgICAgICAgZW5kCiAgICBlbmQKZW5kCgp2ZXJzaW9uX3RleHQoKQpiZXRhX3RleHQoKQ==").unwrap(),
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
