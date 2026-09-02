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
        data: rbase64::decode("BAEcA2xvZwJDUwtVbml0eUVuZ2luZQtBcHBsaWNhdGlvbg90YXJnZXRGcmFtZVJhdGUPUXVhbGl0eVNldHRpbmdzCnZTeW5jQ291bnQIcGF0Y2hGcHMKR2FtZU9iamVjdARGaW5kKFVJUm9vdC9BYm92ZURpYWxvZy9CZXRhSGludERpYWxvZyhDbG9uZSkDUlBHBkNsaWVudA1Mb2NhbGl6ZWRUZXh0BnR5cGVvZhZHZXRDb21wb25lbnRJbkNoaWxkcmVuJjxjb2xvcj0jMDBlMWZmPnQubWUvbmVvbnRlYW0yNTwvY29sb3I+BHRleHQLVmVyc2lvblRleHQiPGNvbG9yPSMwMGUxZmY+Um9iaW5TUiEgfCA8L2NvbG9yPg88Y29sb3I9IzAwZTFmZj4KR2xvYmFsVmFycw1zX1ZlcnNpb25EYXRhF0dldFNlcnZlclBha1R5cGVWZXJzaW9uCDwvY29sb3I+C3BhdGNoQmV0YVdtBG1haW4GeHBjYWxsBQEBAAAAAAEWAAEAAAAEAQEYAAUAAAAAAgAAAAAACwwAAwACBADABAFoARABAAMEAAAADAAGAAUEAMAEAQAAEAEA0AcAAAAWAAEACAMCAwMDBAQCBADAAwUDBgQFBADAAwcABwgBGAAAAAAAAQAAAAABCAAAAAAJAAAAAAA2DAEDAAIEAMAPAAF2BAAAAAUBBQAVAAICDAQIAAcYAMAPAwQUCQAAAE0sAwIMAgsAAACgQBUCAgAUAACxDAAAABUAAAIFAQ0AEAEA1Q4AAAAMAQMAAgQAwA8AAXYEAAAABQEPABUAAgIMBAgABxgAwA8DBBQJAAAATSwDAgwCCwAAAKBAFQICABQAALEMAAAAFQAAAgUCEAAFAxEADAgIAAcYAMAPBwisEgAAAA8GByMTAAAAFAYGkRQAAAAVBgICBgQGAAUFFQA1AQIFEAEA1Q4AAAAWAAEAFgMCAwMDCQQCBADAAwoDCwMMAw0EBxgAwAMOAw8EAACgQAMQAxEDEgMTAxQDFQMWAxcDGAMZAAwaARgAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAQEBAAAAAAAAAAAAAQD8AAUOAAAAAAEAAQAAAAMJAAAAFQABARYAAQAAABkbARgAAAEaAAAAAAcAAAEAAAxFAAAARAAAAEQBAQBEAgIARAMDAEoAAgAMBAUAAABAQAYFAwAGBgAAFQQDARYAAQAGBgAGAQYCBgMDHAQAAEBABAABAgMBAAEYAAMDBQ0ABAAAAAAAAQAAAAAE").unwrap(),
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

pub async fn on_get_player_board_data_cs_req(
    _session: &mut PlayerSession,
    _req: &GetPlayerBoardDataCsReq,
    res: &mut GetPlayerBoardDataScRsp,
) {
    res.retcode = 0;
    res.signature = String::from("AstralOS Private Server");
    res.current_head_icon_id = 200001; // Default head icon in AvatarPlayerIcon.json
    res.current_personal_card_id = 253000; // Default card in PlayerPersonalCard.json

    res.display_avatar_vec = Some(DisplayAvatarVec {
        display_avatar_list: Vec::new(),
        is_display: true,
    });

    res.head_frame_info = Some(HeadFrameInfo {
        head_frame_item_id: 0,
        head_frame_expire_time: 0,
    });

    // Exact Unlocked Card Themes from PlayerPersonalCard.json
    res.unlocked_personal_card_list = game_data::ALL_CARD_IDS.to_vec();

    // Exact 217 Unlocked Head Icons from AvatarPlayerIcon.json
    res.unlocked_head_icon_list = game_data::ALL_HEAD_ICON_IDS
        .iter()
        .map(|&id| HeadIconData { id })
        .collect();
}

pub async fn on_set_head_icon_cs_req(
    _session: &mut PlayerSession,
    req: &SetHeadIconCsReq,
    res: &mut SetHeadIconScRsp,
) {
    res.retcode = 0;
    res.current_head_icon_id = req.id;
}

pub async fn on_set_personal_card_cs_req(
    _session: &mut PlayerSession,
    req: &SetPersonalCardCsReq,
    res: &mut SetPersonalCardScRsp,
) {
    res.retcode = 0;
    res.current_personal_card_id = req.card_id;
}

pub async fn on_set_signature_cs_req(
    _session: &mut PlayerSession,
    req: &SetSignatureCsReq,
    res: &mut SetSignatureScRsp,
) {
    res.retcode = 0;
    res.signature = req.signature.clone();
}

pub async fn on_set_display_avatar_cs_req(
    _session: &mut PlayerSession,
    req: &SetDisplayAvatarCsReq,
    res: &mut SetDisplayAvatarScRsp,
) {
    res.retcode = 0;
    res.display_avatar_vec = req.display_avatar_vec.clone();
}
