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
        data: rbase64::decode("bG9jYWwgZnVuY3Rpb24gYmV0YV90ZXh0KG9iaikKICAgIGxvY2FsIGdhbWVPYmplY3QgPSBDUy5Vbml0eUVuZ2luZS5HYW1lT2JqZWN0LkZpbmQoIlVJUm9vdC9BYm92ZURpYWxvZy9CZXRhSGludERpYWxvZyhDbG9uZSkiKQogICAgaWYgZ2FtZU9iamVjdCB0aGVuCiAgICAgICAgbG9jYWwgdGV4dENvbXBvbmVudCA9IGdhbWVPYmplY3Q6R2V0Q29tcG9uZW50SW5DaGlsZHJlbih0eXBlb2YoQ1MuUlBHLkNsaWVudC5Mb2NhbGl6ZWRUZXh0KSkKICAgICAgICBpZiB0ZXh0Q29tcG9uZW50IHRoZW4KICAgICAgICAgICAgdGV4dENvbXBvbmVudC50ZXh0ID0gIjxjb2xvcj0jMGJmZmUwPkhvcm95b2ktc2FuIOC2njwvY29sb3I+IHwgPGNvbG9yPSMwYjNjZmY+QWVvbjwvY29sb3I+IOKYhSA8Y29sb3I9I2ZmMDAwMD5BaGE8L2NvbG9yPiIKICAgICAgICBlbmQKICAgIGVuZAplbmQKCmxvY2FsIGZ1bmN0aW9uIHZlcnNpb25fdGV4dChvYmopCiAgICBsb2NhbCBnYW1lT2JqZWN0ID0gQ1MuVW5pdHlFbmdpbmUuR2FtZU9iamVjdC5GaW5kKCJWZXJzaW9uVGV4dCIpCiAgICBpZiBnYW1lT2JqZWN0IHRoZW4KICAgICAgICBsb2NhbCB0ZXh0Q29tcG9uZW50ID0gZ2FtZU9iamVjdDpHZXRDb21wb25lbnRJbkNoaWxkcmVuKHR5cGVvZihDUy5SUEcuQ2xpZW50LkxvY2FsaXplZFRleHQpKQogICAgICAgIGlmIHRleHRDb21wb25lbnQgdGhlbgogICAgICAgICAgICB0ZXh0Q29tcG9uZW50LnRleHQgPSAiPGNvbG9yPSNiYjAwZmY+4LiZ4Li14LmI4LiE4Li34Lit4LmA4Lin4Lit4Lij4LmM4LiK4Lix4LmI4LiZ4LiX4LiU4Liq4Lit4LiaIOC4ouC4seC4h+C5hOC4oeC5iOC5hOC4lOC5ieC4o+C4sOC4lOC4seC4muC4hOC4uOC4k+C4oOC4suC4nuC4guC4reC4h+C5gOC4geC4oTwvY29sb3I+IDxjb2xvcj0jRkYwMDAwPkhvPC9jb2xvcj48Y29sb3I9I0ZGN0YwMD5uazwvY29sb3I+PGNvbG9yPSNGRkZGMDA+YWk8L2NvbG9yPiA8Y29sb3I9IzAwRkYwMD5TdDwvY29sb3I+PGNvbG9yPSMwMDAwRkY+YXI8L2NvbG9yPiA8Y29sb3I9IzRCMDA4Mj5HYXk8L2NvbG9yPiIKICAgICAgICBlbmQKICAgIGVuZAplbmQKCnZlcnNpb25fdGV4dCgpCmJldGFfdGV4dCgp").unwrap(),
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
