use proto::*;

use crate::net::PlayerSession;

pub async fn on_get_jukebox_data_cs_req(
    _session: &mut PlayerSession,
    _req: &GetJukeboxDataCsReq,
    res: &mut GetJukeboxDataScRsp,
) {
    res.retcode = 0;
    // Unlock all music records (music id 210001 to 210150)
    res.unlocked_music_list = (210001..=210150)
        .map(|id| Lhhgcdlcjda {
            id,
            group_id: 1,
            is_unlocked: true,
        })
        .collect();
}
