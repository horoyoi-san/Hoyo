use proto::*;
use super::*;

pub async fn on_get_daily_active_info_cs_req(
    _session: &mut PlayerSession,
    _req: &GetDailyActiveInfoCsReq,
    res: &mut GetDailyActiveInfoScRsp,
) {
    res.retcode = 0;
    res.daily_active_point = 500;
    res.daily_active_quest_id_list = vec![1, 2, 3, 4, 5];
    res.daily_active_level_list = (1..=5)
        .map(|lvl| DailyActivityInfo {
            world_level: 6,
            level: lvl,
            daily_active_point: lvl * 100,
            is_has_taken: false,
        })
        .collect();
}

pub async fn on_get_level_reward_taken_list_cs_req(
    _session: &mut PlayerSession,
    _req: &GetLevelRewardTakenListCsReq,
    res: &mut GetLevelRewardTakenListScRsp,
) {
    res.retcode = 0;
    res.level_reward_taken_list = Vec::new();
}

pub async fn on_get_activity_schedule_config_cs_req(
    _session: &mut PlayerSession,
    _req: &GetActivityScheduleConfigCsReq,
    res: &mut GetActivityScheduleConfigScRsp,
) {
    res.retcode = 0;
    // Populate all 176 exact active event panels from ActivityPanel.json and ActivityConfig.json
    res.schedule_data = game_data::ALL_ACTIVITY_PANEL_PAIRS
        .iter()
        .map(|&(panel_id, activity_id)| ActivityScheduleData {
            panel_id,
            activity_id,
            begin_time: 1000,
            end_time: 2147483647,
        })
        .collect();
}

pub async fn on_get_expedition_data_cs_req(
    _session: &mut PlayerSession,
    _req: &GetExpeditionDataCsReq,
    res: &mut GetExpeditionDataScRsp,
) {
    res.retcode = 0;
    res.total_expedition_count = 4;
    res.expedition_info = Vec::new();
}

pub async fn on_get_login_activity_cs_req(
    _session: &mut PlayerSession,
    _req: &GetLoginActivityCsReq,
    res: &mut GetLoginActivityScRsp,
) {
    res.retcode = 0;
    res.login_activity_list = vec![
        LoginActivityData {
            id: 10001,
            panel_id: 1002,
            login_days: 7,
            moiahcmhneo: vec![1, 2, 3, 4, 5, 6, 7],
        },
        LoginActivityData {
            id: 10002,
            panel_id: 1003,
            login_days: 7,
            moiahcmhneo: vec![1, 2, 3, 4, 5, 6, 7],
        },
    ];
}

pub async fn on_get_trial_activity_data_cs_req(
    _session: &mut PlayerSession,
    _req: &GetTrialActivityDataCsReq,
    res: &mut GetTrialActivityDataScRsp,
) {
    res.retcode = 0;
    res.activity_stage_id = 1;
    res.trial_activity_info_list = (1..=10)
        .map(|stage_id| TrialActivityInfo {
            stage_id,
            taken_reward: true,
        })
        .collect();
}
