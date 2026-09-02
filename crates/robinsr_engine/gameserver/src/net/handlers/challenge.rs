use proto::*;
use super::*;

pub async fn on_get_challenge_cs_req(
    _session: &mut PlayerSession,
    _req: &GetChallengeCsReq,
    res: &mut GetChallengeScRsp,
) {
    res.retcode = 0;
    
    // All 823 Exact Challenge Stages from ChallengeMazeConfig.json
    res.challenge_list = game_data::ALL_CHALLENGE_IDS
        .iter()
        .map(|&id| Challenge {
            challenge_id: id,
            star: 3,
            taken_reward: 7,
            score_id: 80000,
            score_two: 80000,
            record_id: 0,
            hgpkmhfpmbj: true,
            stage_info: None,
        })
        .collect();

    // Max levels - keep empty so challenge_list 3-star completion displays directly without Quick Unlock 2-star placeholder
    res.max_level_list = Vec::new();

    // All 106 Exact Groups from ChallengeGroupConfig.json
    res.challenge_group_list = game_data::ALL_CHALLENGE_GROUP_IDS
        .iter()
        .map(|&group_id| ChallengeGroup {
            group_id,
            taken_stars_count_reward: 0xFFFFFFFF,
        })
        .collect();

    // Group active and pass flags
    res.kkiafpfklge = game_data::ALL_CHALLENGE_GROUP_IDS
        .iter()
        .map(|&group_id| Fmdaaiklaja {
            group_id,
            jfkmnbhobcl: true,
            egllmgllhdl: true,
        })
        .collect();
}

pub async fn on_get_cur_challenge_cs_req(
    _session: &mut PlayerSession,
    _req: &GetCurChallengeCsReq,
    res: &mut GetCurChallengeScRsp,
) {
    res.retcode = 0;
}
