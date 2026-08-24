use super::*;

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
        data: rbase64::decode("bG9jYWwgZnVuY3Rpb24gYmV0YV90ZXh0KG9iaikKICAgIGxvY2FsIGdhbWVPYmplY3QgPSBDUy5Vbml0eUVuZ2luZS5HYW1lT2JqZWN0LkZpbmQoIlVJUm9vdC9BYm92ZURpYWxvZy9CZXRhSGludERpYWxvZyhDbG9uZSkiKQogICAgaWYgZ2FtZU9iamVjdCB0aGVuCiAgICAgICAgbG9jYWwgdGV4dENvbXBvbmVudCA9IGdhbWVPYmplY3Q6R2V0Q29tcG9uZW50SW5DaGlsZHJlbih0eXBlb2YoQ1MuUlBHLkNsaWVudC5Mb2NhbGl6ZWRUZXh0KSkKICAgICAgICBpZiB0ZXh0Q29tcG9uZW50IHRoZW4KICAgICAgICAgICAgdGV4dENvbXBvbmVudC50ZXh0ID0gIjxjb2xvcj0jZmYwMDAwPkhvcm95b2ktc2FuIOC2njwvY29sb3I+IgogICAgICAgIGVuZAogICAgZW5kCmVuZAoKbG9jYWwgZnVuY3Rpb24gdmVyc2lvbl90ZXh0KG9iaikKICAgIGxvY2FsIGdhbWVPYmplY3QgPSBDUy5Vbml0eUVuZ2luZS5HYW1lT2JqZWN0LkZpbmQoIlZlcnNpb25UZXh0IikKICAgIGlmIGdhbWVPYmplY3QgdGhlbgogICAgICAgIGxvY2FsIHRleHRDb21wb25lbnQgPSBnYW1lT2JqZWN0OkdldENvbXBvbmVudEluQ2hpbGRyZW4odHlwZW9mKENTLlJQRy5DbGllbnQuTG9jYWxpemVkVGV4dCkpCiAgICAgICAgaWYgdGV4dENvbXBvbmVudCB0aGVuCiAgICAgICAgICAgIHRleHRDb21wb25lbnQudGV4dCA9ICI8Y29sb3I9I2JiMDBmZj7guJnguLXguYjguITguLfguK3guYDguKfguK3guKPguYzguIrguLHguYjguJnguJfguJTguKrguK3guJog4Lii4Lix4LiH4LmE4Lih4LmI4LmE4LiU4LmJ4Lij4Liw4LiU4Lix4Lia4LiE4Li44LiT4Lig4Liy4Lie4LiC4Lit4LiH4LmA4LiB4LihPC9jb2xvcj4gPGNvbG9yPSNGRjAwMDA+SG88L2NvbG9yPjxjb2xvcj0jRkY3RjAwPm5rPC9jb2xvcj48Y29sb3I9I0ZGRkYwMD5haTwvY29sb3I+IDxjb2xvcj0jMDBGRjAwPlN0PC9jb2xvcj48Y29sb3I9IzAwMDBGRj5hcjwvY29sb3I+IDxjb2xvcj0jNEIwMDgyPkdheTwvY29sb3I+IgogICAgICAgIGVuZAogICAgZW5kCmVuZAoKdmVyc2lvbl90ZXh0KCkKYmV0YV90ZXh0KCk=").unwrap(),
        ..Default::default()
    });
}

// หากมีการอัพเดท package ใหม่ ๆ ให้เพิ่ม ID ของ package เหล่านั้นใน ContentPackageSyncDataScNotify
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
