use super::*;
use proto::*;
use std::collections::{BTreeMap, HashMap};
use std::sync::{LazyLock, Mutex};
use serde::Deserialize;
use prost::Message;
use common::resources::GAME_RES;
use common::structs::{AvatarJson, BattleType, BattleBuffJson, Monster};

pub fn is_challenge_scene(entry_id: u32) -> bool {
    if (3000000..=3999999).contains(&entry_id) || entry_id == 30002061 {
        return true;
    }
    GAME_RES
        .level_output_configs
        .get(&entry_id)
        .and_then(|v| v.values().next())
        .map(|loc| loc.plane_type == 4)
        .unwrap_or(false)
}

pub fn get_leave_destination(session: &PlayerSession) -> u32 {
    if session.challenge_state.return_entry_id != 0 && !is_challenge_scene(session.challenge_state.return_entry_id) {
        session.challenge_state.return_entry_id
    } else if let Some(json) = session.json_data.get() {
        if !is_challenge_scene(json.scene.entry_id) && json.scene.entry_id != 0 {
            json.scene.entry_id
        } else {
            100000104
        }
    } else {
        100000104
    }
}

#[derive(Deserialize, Clone, Debug, Default)]
pub struct ChallengeStageData {
    pub entrance: u32,
    pub entrance2: u32,
    pub group1: u32,
    pub group2: u32,
    pub monster1: u32,
    pub monster2: u32,
    pub event1: u32,
    pub event2: u32,
    pub buff: u32,
}

#[derive(Deserialize, Clone, Debug, Default)]
pub struct ChallengeTierceStageData {
    pub entrance: u32,
    pub group: u32,
    pub monster: u32,
    pub event: u32,
}

#[derive(Deserialize, Clone, Debug, Default)]
pub struct StageBattleData {
    pub level: u32,
    pub monsters: Vec<Vec<u32>>,
}

#[derive(Deserialize, Clone, Debug, Default)]
pub struct ChallengeConfigData {
    pub challenges: HashMap<u32, ChallengeStageData>,
    pub tierce: HashMap<u32, ChallengeTierceStageData>,
    pub stages: HashMap<u32, StageBattleData>,
}

pub static CHALLENGE_DATA: LazyLock<ChallengeConfigData> = LazyLock::new(|| {
    let paths = [
        "challenge_data.json",
        "bin/challenge_data.json",
        "crates/robinsr_engine/challenge_data.json",
        "../challenge_data.json",
    ];
    for path in paths {
        if let Ok(content) = std::fs::read_to_string(path) {
            match serde_json::from_str(&content) {
                Ok(data) => {
                    tracing::info!("Successfully loaded challenge_data.json from {path}");
                    return data;
                }
                Err(e) => {
                    tracing::error!("Failed to parse challenge_data.json at {path}: {e}");
                }
            }
        }
    }
    tracing::error!("challenge_data.json not found in any search path!");
    ChallengeConfigData::default()
});

pub static TIERCE_LINEUPS: LazyLock<Mutex<HashMap<u32, Vec<Vec<u32>>>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

pub static PEAK_LINEUPS: LazyLock<Mutex<HashMap<u32, Vec<u32>>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
pub static PEAK_HARD_MODES: LazyLock<Mutex<HashMap<u32, bool>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, Copy)]
pub struct PeakStageInfo {
    pub peak_id: u32,
    pub event_id: u32,
    pub hard_event_id: Option<u32>,
    pub monster_id: u32,
    pub default_buff: u32,
    pub is_boss: bool,
}

pub const ALL_PEAK_STAGES: &[PeakStageInfo] = &[
    // Group 1
    PeakStageInfo { peak_id: 101, event_id: 30501011, hard_event_id: None, monster_id: 3004012, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 102, event_id: 30501012, hard_event_id: None, monster_id: 3014020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 103, event_id: 30501013, hard_event_id: None, monster_id: 4033030, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 104, event_id: 30501021, hard_event_id: Some(30501022), monster_id: 4044010, default_buff: 3033006, is_boss: true },
    // Group 2
    PeakStageInfo { peak_id: 201, event_id: 30502011, hard_event_id: None, monster_id: 2013020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 202, event_id: 30502012, hard_event_id: None, monster_id: 2034010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 203, event_id: 30502013, hard_event_id: None, monster_id: 3004020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 204, event_id: 30502021, hard_event_id: Some(30502022), monster_id: 4015011, default_buff: 3033020, is_boss: true },
    // Group 3
    PeakStageInfo { peak_id: 301, event_id: 30503011, hard_event_id: None, monster_id: 4053020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 302, event_id: 30503012, hard_event_id: None, monster_id: 8024011, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 303, event_id: 30503013, hard_event_id: None, monster_id: 4064010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 304, event_id: 30503021, hard_event_id: Some(30503022), monster_id: 3025016, default_buff: 3033032, is_boss: true },
    // Group 4
    PeakStageInfo { peak_id: 401, event_id: 30504011, hard_event_id: None, monster_id: 3024030, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 402, event_id: 30504012, hard_event_id: None, monster_id: 4034010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 403, event_id: 30504013, hard_event_id: None, monster_id: 3024020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 404, event_id: 30504021, hard_event_id: Some(30504022), monster_id: 5014010, default_buff: 3033043, is_boss: true },
    // Group 5
    PeakStageInfo { peak_id: 501, event_id: 30505011, hard_event_id: None, monster_id: 5013040, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 502, event_id: 30505012, hard_event_id: None, monster_id: 4014030, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 503, event_id: 30505013, hard_event_id: None, monster_id: 4044010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 504, event_id: 30505021, hard_event_id: Some(30505022), monster_id: 5014020, default_buff: 3033048, is_boss: true },
    // Group 6
    PeakStageInfo { peak_id: 601, event_id: 30506011, hard_event_id: None, monster_id: 5023010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 602, event_id: 30506012, hard_event_id: None, monster_id: 5014010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 603, event_id: 30506013, hard_event_id: None, monster_id: 4034010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 604, event_id: 30506021, hard_event_id: Some(30506022), monster_id: 5024010, default_buff: 3033053, is_boss: true },
    // Group 7
    PeakStageInfo { peak_id: 701, event_id: 30507011, hard_event_id: None, monster_id: 5023020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 702, event_id: 30507012, hard_event_id: None, monster_id: 5014020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 703, event_id: 30507013, hard_event_id: None, monster_id: 4014020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 704, event_id: 30507021, hard_event_id: Some(30507022), monster_id: 8025010, default_buff: 3033060, is_boss: true },
    // Group 8
    PeakStageInfo { peak_id: 801, event_id: 30508011, hard_event_id: None, monster_id: 3024010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 802, event_id: 30508012, hard_event_id: None, monster_id: 1014010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 803, event_id: 30508013, hard_event_id: None, monster_id: 5024010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 804, event_id: 30508021, hard_event_id: Some(30508022), monster_id: 5014030, default_buff: 3033066, is_boss: true },
    // Group 9
    PeakStageInfo { peak_id: 901, event_id: 30509011, hard_event_id: None, monster_id: 8033020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 902, event_id: 30509012, hard_event_id: None, monster_id: 5014010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 903, event_id: 30509013, hard_event_id: None, monster_id: 4034010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 904, event_id: 30509021, hard_event_id: Some(30509022), monster_id: 4035010, default_buff: 3033073, is_boss: true },
    // Group 10
    PeakStageInfo { peak_id: 1001, event_id: 30510011, hard_event_id: None, monster_id: 5014020, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 1002, event_id: 30510012, hard_event_id: None, monster_id: 5024010, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 1003, event_id: 30510013, hard_event_id: None, monster_id: 3024030, default_buff: 0, is_boss: false },
    PeakStageInfo { peak_id: 1004, event_id: 30510021, hard_event_id: Some(30510022), monster_id: 5034010, default_buff: 3033082, is_boss: true },
];

pub fn get_peak_stage_info(peak_id: u32) -> Option<PeakStageInfo> {
    ALL_PEAK_STAGES.iter().find(|s| s.peak_id == peak_id).copied()
}




pub const ALL_CHALLENGE_STAGES: [u32; 819] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    21, 22, 23, 24, 25, 26, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    110, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 301, 302, 303, 304,
    305, 306, 307, 308, 309, 310, 401, 402, 403, 404, 405, 406, 407, 408, 409,
    410, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 601, 602, 603, 604,
    605, 606, 607, 608, 609, 610, 701, 702, 703, 704, 705, 706, 707, 708, 709,
    710, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 901, 902, 903, 904,
    905, 906, 907, 908, 909, 910, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009,
    1010, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1201, 1202, 1203, 1204,
    1205, 1206, 1207, 1208, 1209, 1210, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309,
    1310, 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408, 1409, 1410, 1501, 1502, 1503, 1504,
    1505, 1506, 1507, 1508, 1509, 1510, 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1608, 1609,
    1610, 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708, 1709, 1710, 1801, 1802, 1803, 1804,
    1805, 1806, 1807, 1808, 1809, 1810, 1901, 1902, 1903, 1904, 1905, 1906, 1907, 1908, 1909,
    1910, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2101, 2102, 2103, 2104,
    2105, 2106, 2107, 2108, 2109, 2110, 2201, 2202, 2203, 2204, 2205, 2206, 2207, 2208, 2209,
    2210, 2301, 2302, 2303, 2304, 2305, 2306, 2307, 2308, 2309, 2310, 2401, 2402, 2403, 2404,
    2405, 2406, 2407, 2408, 2409, 2410, 2501, 2502, 2503, 2504, 2505, 2506, 2507, 2508, 2509,
    2510, 2601, 2602, 2603, 2604, 2605, 2606, 2607, 2608, 2609, 2610, 2701, 2702, 2703, 2704,
    2705, 2706, 2707, 2708, 2709, 2710, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809,
    2810, 2811, 2812, 2901, 2902, 2903, 2904, 2905, 2906, 2907, 2908, 2909, 2910, 2911, 2912,
    3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3101, 3102, 3103,
    3104, 3105, 3106, 3107, 3108, 3109, 3110, 3111, 3112, 3201, 3202, 3203, 3204, 3205, 3206,
    3207, 3208, 3209, 3210, 3211, 3212, 3301, 3302, 3303, 3304, 3305, 3306, 3307, 3308, 3309,
    3310, 3311, 3312, 3401, 3402, 3403, 3404, 3405, 3406, 3407, 3408, 3409, 3410, 3411, 3412,
    3501, 3502, 3503, 3504, 3505, 3506, 3507, 3508, 3509, 3510, 3511, 3512, 3601, 3602, 3603,
    3604, 3605, 3606, 3607, 3608, 3609, 3610, 3611, 3612, 3701, 3702, 3703, 3704, 3705, 3706,
    3707, 3708, 3709, 3710, 3711, 3712, 3801, 3802, 3803, 3804, 3805, 3806, 3807, 3808, 3809,
    3810, 3811, 3812, 3901, 3902, 3903, 3904, 3905, 3906, 3907, 3908, 3909, 3910, 3911, 3912,
    4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011, 4012, 4101, 4102, 4103,
    4104, 4105, 4106, 4107, 4108, 4109, 4110, 4111, 4112, 4201, 4202, 4203, 4204, 4205, 4206,
    4207, 4208, 4209, 4210, 4211, 4212, 4301, 4302, 4303, 4304, 4305, 4306, 4307, 4308, 4309,
    4310, 4311, 4312, 4401, 4402, 4403, 4404, 4405, 4406, 4407, 4408, 4409, 4410, 4411, 4412,
    4501, 4502, 4503, 4504, 4505, 4506, 4507, 4508, 4509, 4510, 4511, 4512, 4601, 4602, 4603,
    4604, 4605, 4606, 4607, 4608, 4609, 4610, 4611, 4612, 4701, 4702, 4703, 4704, 4705, 4706,
    4707, 4708, 4709, 4710, 4711, 4712, 4801, 4802, 4803, 4804, 4805, 4806, 4807, 4808, 4809,
    4810, 4811, 4812, 4901, 4902, 4903, 4904, 4905, 4906, 4907, 4908, 4909, 4910, 4911, 4912,
    5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011, 5012, 5101, 5102, 5103,
    5104, 5105, 5106, 5107, 5108, 5109, 5110, 5111, 5112, 5201, 5202, 5203, 5204, 5205, 5206,
    5207, 5208, 5209, 5210, 5211, 5212, 5301, 5302, 5303, 5304, 5305, 5306, 5307, 5308, 5309,
    5310, 5311, 5312, 5401, 5402, 5403, 5404, 5405, 5406, 5407, 5408, 5409, 5410, 5411, 5412,
    5501, 5502, 5503, 5504, 5505, 5506, 5507, 5508, 5509, 5510, 5511, 5512, 20011, 20012, 20013,
    20014, 20021, 20022, 20023, 20024, 20031, 20032, 20033, 20034, 20041, 20042, 20043, 20044, 20051, 20052,
    20053, 20054, 20061, 20062, 20063, 20064, 20071, 20072, 20073, 20074, 20081, 20082, 20083, 20084, 20091,
    20092, 20093, 20094, 20101, 20102, 20103, 20104, 20111, 20112, 20113, 20114, 20121, 20122, 20123, 20124,
    20131, 20132, 20133, 20134, 20141, 20142, 20143, 20144, 20151, 20152, 20153, 20154, 20161, 20162, 20163,
    20164, 20171, 20172, 20173, 20174, 20181, 20182, 20183, 20184, 20191, 20192, 20193, 20194, 20201, 20202,
    20203, 20204, 20211, 20212, 20213, 20214, 20221, 20222, 20223, 20224, 20231, 20232, 20233, 20234, 20241,
    20242, 20243, 20244, 20251, 20252, 20253, 20254, 20261, 20262, 20263, 20264, 20271, 20272, 20273, 20274,
    30011, 30012, 30013, 30014, 30021, 30022, 30023, 30024, 30031, 30032, 30033, 30034, 30041, 30042, 30043,
    30044, 30051, 30052, 30053, 30054, 30061, 30062, 30063, 30064, 30071, 30072, 30073, 30074, 30081, 30082,
    30083, 30084, 30091, 30092, 30093, 30094, 30101, 30102, 30103, 30104, 30111, 30112, 30113, 30114, 30121,
    30122, 30123, 30124, 30131, 30132, 30133, 30134, 30141, 30142, 30143, 30144, 30151, 30152, 30153, 30154,
    30161, 30162, 30163, 30164, 30171, 30172, 30173, 30174, 30181, 30182, 30183, 30184, 30191, 30192, 30193,
    30194, 30201, 30202, 30203, 30204, 30211, 30212, 30213, 30214,
];

fn get_challenge_groups() -> Vec<u32> {
    let mut groups = Vec::new();
    for g in 1..=120 {
        groups.push(g);
    }
    groups.push(900);
    for g in 1001..=1036 {
        groups.push(g);
    }
    for g in 2001..=2027 {
        groups.push(g);
    }
    for g in 3001..=3021 {
        groups.push(g);
    }
    for base in [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 20000, 21000, 30000, 40000, 50000, 60000] {
        for offset in 1..=50 {
            groups.push(base + offset);
        }
    }
    groups.sort();
    groups.dedup();
    groups
}

fn get_challenge_list() -> Vec<Challenge> {
    let mut list = Vec::new();

    let make_challenge = |id: u32| Challenge {
        challenge_id: id,
        star: 7, // 7 = (1 << 0) | (1 << 1) | (1 << 2) -> Bitmask for all 3 stars!
        taken_reward: 7, // 7 = (1 << 0) | (1 << 1) | (1 << 2) -> All 3 star rewards claimed
        record_id: 1, // Non-zero record confirms stage cleared
        hgpkmhfpmbj: false, // NOT first open (already cleared, allows unlocking next stages)
        score_two: if (20000..30000).contains(&id) {
            80000
        } else if id >= 30000 {
            4000
        } else {
            0
        },
        score_id: if (20000..30000).contains(&id) {
            80000
        } else if id >= 30000 {
            4000
        } else {
            0
        },
        ..Default::default()
    };

    // All 790 Stages across all modes (Jarilo 1-15, Luofu 1-6, MoC 1-12, Pure Fiction 1-4, Apocalyptic Shadow 1-4)
    for &id in &ALL_CHALLENGE_STAGES {
        list.push(make_challenge(id));
    }

    list
}

pub async fn on_get_challenge_cs_req(
    _session: &mut PlayerSession,
    _req: &GetChallengeCsReq,
    res: &mut GetChallengeScRsp,
) {
    res.retcode = 0;
    res.challenge_group_list = get_challenge_groups()
        .into_iter()
        .map(|group_id| ChallengeGroup {
            group_id,
            taken_stars_count_reward: 0,
        })
        .collect();
    res.kkiafpfklge = Vec::new();
    res.challenge_list = get_challenge_list();

    let mut max_levels = Vec::new();

    // Map max_level for every stage (matches himeko-nova-sr logic)
    for &id in &ALL_CHALLENGE_STAGES {
        let (level, r_type) = if id >= 30000 {
            (4, 101913) // Apocalyptic Shadow Tierce
        } else if id >= 20000 {
            (4, 101404) // Pure Fiction
        } else {
            (12, 101212) // MoC 12 floors
        };

        max_levels.push(ChallengeHistoryMaxLevel {
            level,
            hnhcfjjnjce: false,
            reward_display_type: r_type,
        });
    }

    // Include max level entries for Forgotten Hall story groups (Jarilo-VI 15, Luofu 6)
    max_levels.push(ChallengeHistoryMaxLevel {
        level: 15,
        hnhcfjjnjce: false,
        reward_display_type: 101015,
    });
    max_levels.push(ChallengeHistoryMaxLevel {
        level: 6,
        hnhcfjjnjce: false,
        reward_display_type: 101021,
    });

    res.max_level_list = max_levels;
}

pub async fn on_get_cur_challenge_cs_req(
    _session: &mut PlayerSession,
    _req: &GetCurChallengeCsReq,
    res: &mut GetCurChallengeScRsp,
) {
    res.retcode = 0;
    res.cur_challenge = None;
    res.lineup_list = Vec::new();
}

pub async fn on_get_activity_schedule_config_cs_req(
    _session: &mut PlayerSession,
    _req: &GetActivityScheduleConfigCsReq,
    res: &mut GetActivityScheduleConfigScRsp,
) {
    res.retcode = 0;

    let mut schedule_list = Vec::new();

    // Real activity panels from client game data
    for &(act_id, panel_id) in ALL_ACTIVITY_PANEL_PAIRS {
        schedule_list.push(ActivityScheduleData {
            activity_id: act_id,
            panel_id,
            begin_time: 0,
            end_time: 1924992000,
        });
    }

    // Apocalyptic Shadow & Challenge Peak Activities (21001..=21030, panel 21001, and sub-modules 2100101..=2101001)
    for act_id in 21001..=21030 {
        schedule_list.push(ActivityScheduleData {
            activity_id: act_id,
            panel_id: 21001,
            begin_time: 0,
            end_time: 4294967295,
        });
    }
    for i in 1..=10 {
        schedule_list.push(ActivityScheduleData {
            activity_id: 2100000 + i * 100 + 1, // 2100101, 2100201, ...
            panel_id: 21001,
            begin_time: 0,
            end_time: 4294967295,
        });
        schedule_list.push(ActivityScheduleData {
            activity_id: 2100000 + i * 100 + 1,
            panel_id: 21000 + i,
            begin_time: 0,
            end_time: 4294967295,
        });
    }

    res.schedule_data = schedule_list;
}

pub async fn send_scene_entity_move_sc_notify(
    session: &PlayerSession,
    entity_id: u32,
    entry_id: u32,
    motion: &MotionInfo,
) -> Result<()> {
    session.send(SceneEntityMoveScNotify {
        motion: Some(motion.clone()),
        client_pos_version: 0,
        entity_id,
        entry_id,
    }).await?;

    Ok(())
}

pub async fn handle_start_challenge_tierce(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = match StartChallengeTierceCsReq::decode(payload) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to decode StartChallengeTierceCsReq: {e}");
            return Ok(());
        }
    };
    tracing::info!(
        "handle_start_challenge_tierce: challenge_id={}, stage_index={}, is_single_stage={}, stages_count={}",
        req.challenge_id, req.stage_index, req.is_single_stage, req.stage_info_list.len()
    );

    if !req.stage_info_list.is_empty() {
        let mut stages = Vec::new();
        for stage_info in &req.stage_info_list {
            let avatars: Vec<u32> = stage_info.lineup.iter().map(|a| a.id).collect();
            stages.push(avatars);
        }
        if let Ok(mut map) = TIERCE_LINEUPS.lock() {
            map.insert(req.challenge_id, stages);
        }
    }

    let req_buff_id = req.stage_info_list
        .get(req.stage_index as usize)
        .map(|s| s.buff_id)
        .unwrap_or(0);

    let mut chosen_avatars: Vec<u32> = req.stage_info_list
        .get(req.stage_index as usize)
        .map(|s| s.lineup.iter().map(|a| a.id).collect())
        .unwrap_or_default();

    if chosen_avatars.is_empty() {
        if let Ok(map) = TIERCE_LINEUPS.lock() {
            if let Some(list) = map.get(&req.challenge_id) {
                if let Some(avatars) = list.get(req.stage_index as usize) {
                    chosen_avatars = avatars.clone();
                }
            }
        }
    }

    if chosen_avatars.is_empty() {
        if let Some(json) = session.json_data.get() {
            chosen_avatars = json.lineups.values().copied().filter(|&id| id != 0).collect();
        }
    }

    if chosen_avatars.is_empty() {
        chosen_avatars = vec![1304, 1313, 1406, 1004];
    }

    let return_entry = session.json_data.get()
        .map(|j| j.scene.entry_id)
        .filter(|&id| !is_challenge_scene(id) && id != 0)
        .unwrap_or(100000104);
    session.challenge_state.return_entry_id = return_entry;

    let (entrance, group, monster, event, buff) = if req.stage_index == 2 {
        if let Some(t) = CHALLENGE_DATA.tierce.get(&req.challenge_id) {
            (t.entrance, t.group, t.monster, t.event, req_buff_id)
        } else if let Some(c) = CHALLENGE_DATA.challenges.get(&req.challenge_id) {
            (c.entrance2, c.group2, c.monster2, c.event2, if req_buff_id != 0 { req_buff_id } else { c.buff })
        } else {
            (3012602, 7, 2034012, 420554, 0)
        }
    } else if req.stage_index == 1 {
        let base_id = if req.challenge_id > 1 && !CHALLENGE_DATA.challenges.contains_key(&req.challenge_id) {
            req.challenge_id - 1
        } else {
            req.challenge_id
        };
        if let Some(c) = CHALLENGE_DATA.challenges.get(&base_id) {
            (c.entrance2, c.group2, c.monster2, c.event2, if req_buff_id != 0 { req_buff_id } else { c.buff })
        } else {
            (3000301, 8, 3003015, 420494, 0)
        }
    } else {
        let base_id = if req.challenge_id > 1 && !CHALLENGE_DATA.challenges.contains_key(&req.challenge_id) {
            req.challenge_id - 1
        } else {
            req.challenge_id
        };
        if let Some(c) = CHALLENGE_DATA.challenges.get(&base_id) {
            (c.entrance, c.group1, c.monster1, c.event1, if req_buff_id != 0 { req_buff_id } else { c.buff })
        } else {
            (3000101, 2, 8013010, 30001011, 0)
        }
    };
    let is_pf = (20000..30000).contains(&req.challenge_id);
    let is_as = req.challenge_id >= 30000;

    session.challenge_state.is_in_challenge = true;
    session.challenge_state.challenge_id = req.challenge_id;
    session.challenge_state.challenge_mode = if is_pf { 1 } else if is_as { 2 } else { 0 };
    session.challenge_state.node = (req.stage_index as u8) + 1;
    session.challenge_state.event_id = event;
    session.challenge_state.monster_id = monster;
    session.challenge_state.buff_id = buff;
    session.challenge_state.avatar_ids = chosen_avatars.clone();

    if let Some(json) = session.json_data.get_mut() {
        let mut custom_lineup = BTreeMap::new();
        for (i, &aid) in chosen_avatars.iter().enumerate() {
            custom_lineup.insert(i as u32, aid);
        }
        json.battle_config.custom_battle_lineup = Some(custom_lineup);
        json.battle_config.stage_id = event;
        json.battle_config.cycle_count = if is_pf { 4 } else { 30 };
        json.battle_config.battle_type = if is_pf { BattleType::PF } else if is_as { BattleType::AS } else { BattleType::Default };

        if let Some(sb) = CHALLENGE_DATA.stages.get(&event) {
            json.battle_config.monsters = sb.monsters.iter().map(|wave| {
                wave.iter().map(|&mid| Monster {
                    level: sb.level,
                    monster_id: mid,
                    max_hp: 0,
                }).collect()
            }).collect();
        }

        let mut blessings = Vec::new();
        if buff != 0 {
            blessings.push(BattleBuffJson {
                id: buff,
                level: 1,
                dynamic_key: None,
                dynamic_values: Vec::new(),
            });
        }
        if req_buff_id != 0 && req_buff_id != buff {
            blessings.push(BattleBuffJson {
                id: req_buff_id,
                level: 1,
                dynamic_key: None,
                dynamic_values: Vec::new(),
            });
        }
        json.battle_config.blessings = blessings;

        let _ = json.save_persistent().await;
    }

    let (scene_info, motion) = load_challenge_scene(session, entrance, group, monster, event, &chosen_avatars).await?;

    let extra_lineup_type = match req.stage_index {
        0 => ExtraLineupType::LineupChallenge,
        1 => ExtraLineupType::LineupChallenge2,
        2 => ExtraLineupType::LineupChallenge3,
        _ => ExtraLineupType::LineupChallenge,
    };
    let lineup_info = AvatarJson::to_challenge_lineup_info(&chosen_avatars, extra_lineup_type);

    let tierce_challenge_info = ChallengeTierceChallengeInfo {
        stage_index: req.stage_index,
        challenge_id: req.challenge_id,
        is_single_stage: req.is_single_stage,
        lineup_list: vec![lineup_info],
    };

    session.send(StartChallengeTierceScRsp {
        challenge_tierce_info: Some(tierce_challenge_info),
        scene: Some(scene_info),
        retcode: 0,
    }).await?;

    for (i, _) in chosen_avatars.iter().enumerate() {
        let _ = send_scene_entity_move_sc_notify(session, (i as u32) + 1, entrance, &motion).await;
    }

    Ok(())
}

pub async fn handle_start_challenge(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = match StartChallengeCsReq::decode(payload) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to decode StartChallengeCsReq: {e}");
            return Ok(());
        }
    };
    tracing::info!("handle_start_challenge: challenge_id={}", req.challenge_id);

    let mut chosen_avatars: Vec<u32> = req.avatar_lineup_first.iter().map(|a| a.id).collect();
    if chosen_avatars.is_empty() {
        chosen_avatars = req.first_lineup.clone();
    }
    if chosen_avatars.is_empty() {
        if let Some(json) = session.json_data.get() {
            chosen_avatars = json.lineups.values().copied().filter(|&id| id != 0).collect();
        }
    }
    if chosen_avatars.is_empty() {
        chosen_avatars = vec![1304, 1313, 1406, 1004];
    }

    let return_entry = session.json_data.get()
        .map(|j| j.scene.entry_id)
        .filter(|&id| !is_challenge_scene(id) && id != 0)
        .unwrap_or(100000104);
    session.challenge_state.return_entry_id = return_entry;

    let (entrance, group, monster, event, buff) = if let Some(c) = CHALLENGE_DATA.challenges.get(&req.challenge_id) {
        (c.entrance, c.group1, c.monster1, c.event1, c.buff)
    } else {
        (3000101, 2, 8013010, 30001011, 0)
    };

    let is_pf = (20000..30000).contains(&req.challenge_id);
    let is_as = req.challenge_id >= 30000;

    session.challenge_state.is_in_challenge = true;
    session.challenge_state.challenge_id = req.challenge_id;
    session.challenge_state.challenge_mode = if is_pf { 1 } else if is_as { 2 } else { 0 };
    session.challenge_state.node = 1;
    session.challenge_state.event_id = event;
    session.challenge_state.monster_id = monster;
    session.challenge_state.buff_id = buff;
    session.challenge_state.avatar_ids = chosen_avatars.clone();

    if let Some(json) = session.json_data.get_mut() {
        let mut custom_lineup = BTreeMap::new();
        for (i, &aid) in chosen_avatars.iter().enumerate() {
            custom_lineup.insert(i as u32, aid);
        }
        json.battle_config.custom_battle_lineup = Some(custom_lineup);
        json.battle_config.stage_id = event;
        json.battle_config.cycle_count = if is_pf { 4 } else { 30 };
        json.battle_config.battle_type = if is_pf { BattleType::PF } else if is_as { BattleType::AS } else { BattleType::Default };

        if let Some(sb) = CHALLENGE_DATA.stages.get(&event) {
            json.battle_config.monsters = sb.monsters.iter().map(|wave| {
                wave.iter().map(|&mid| Monster {
                    level: sb.level,
                    monster_id: mid,
                    max_hp: 0,
                }).collect()
            }).collect();
        }

        if buff != 0 {
            json.battle_config.blessings = vec![BattleBuffJson {
                id: buff,
                level: 1,
                dynamic_key: None,
                dynamic_values: Vec::new(),
            }];
        }

        let _ = json.save_persistent().await;
    }

    let (scene_info, motion) = load_challenge_scene(session, entrance, group, monster, event, &chosen_avatars).await?;

    let lineup_info = AvatarJson::to_challenge_lineup_info(&chosen_avatars, ExtraLineupType::LineupChallenge);

    let cur_challenge = CurChallenge {
        challenge_id: req.challenge_id,
        status: 1, // CHALLENGE_DOING
        round_count: 0,
        score_id: if (20000..30000).contains(&req.challenge_id) { 40000 } else { 0 },
        score_two: 0,
        extra_lineup_type: ExtraLineupType::LineupChallenge as i32,
        ..Default::default()
    };

    session.send(StartChallengeScRsp {
        retcode: 0,
        lineup_list: vec![lineup_info],
        cur_challenge: Some(cur_challenge),
        scene: Some(scene_info),
    }).await?;

    for (i, _) in chosen_avatars.iter().enumerate() {
        let _ = send_scene_entity_move_sc_notify(session, (i as u32) + 1, entrance, &motion).await;
    }

    Ok(())
}

pub async fn handle_set_challenge_tierce_lineup(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let req = match SetChallengeTierceLineupCsReq::decode(payload) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to decode SetChallengeTierceLineupCsReq: {e}");
            return Ok(());
        }
    };
    tracing::info!(
        "handle_set_challenge_tierce_lineup: challenge_id={}, stages={}",
        req.challenge_id, req.stage_info_list.len()
    );

    if !req.stage_info_list.is_empty() {
        let mut stages = Vec::new();
        for stage_info in &req.stage_info_list {
            let avatars: Vec<u32> = stage_info.lineup.iter().map(|a| a.id).collect();
            stages.push(avatars);
        }
        if let Ok(mut map) = TIERCE_LINEUPS.lock() {
            map.insert(req.challenge_id, stages);
        }
    }

    session.send(SetChallengeTierceLineupScRsp {
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_restart_challenge_tierce(session: &mut PlayerSession) -> Result<()> {
    let challenge_id = session.challenge_state.challenge_id;
    let node = session.challenge_state.node;
    let stage_index = if node > 0 { (node - 1) as u32 } else { 0 };
    tracing::info!("handle_restart_challenge_tierce: challenge_id={challenge_id}, stage_index={stage_index}");

    let mut chosen_avatars = session.challenge_state.avatar_ids.clone();
    if chosen_avatars.is_empty() {
        if let Ok(map) = TIERCE_LINEUPS.lock() {
            if let Some(list) = map.get(&challenge_id) {
                if let Some(avatars) = list.get(stage_index as usize) {
                    chosen_avatars = avatars.clone();
                }
            }
        }
    }
    if chosen_avatars.is_empty() {
        if let Some(json) = session.json_data.get() {
            chosen_avatars = json.lineups.values().copied().filter(|&id| id != 0).collect();
        }
    }
    if chosen_avatars.is_empty() {
        chosen_avatars = vec![1304, 1313, 1406, 1004];
    }

    let (entrance, group, monster, event, _buff) = if stage_index == 1 {
        if let Some(c) = CHALLENGE_DATA.challenges.get(&challenge_id) {
            (c.entrance2, c.group2, c.monster2, c.event2, c.buff)
        } else {
            (3000301, 8, 3003015, 420494, 0)
        }
    } else {
        if let Some(c) = CHALLENGE_DATA.challenges.get(&challenge_id) {
            (c.entrance, c.group1, c.monster1, c.event1, c.buff)
        } else {
            (3000101, 2, 8013010, 30001011, 0)
        }
    };

    let (scene_info, motion) = load_challenge_scene(session, entrance, group, monster, event, &chosen_avatars).await?;

    session.send(RestartChallengeTierceScRsp {
        retcode: 0,
        scene: Some(scene_info),
    }).await?;

    for (i, _) in chosen_avatars.iter().enumerate() {
        let _ = send_scene_entity_move_sc_notify(session, (i as u32) + 1, entrance, &motion).await;
    }

    Ok(())
}

pub async fn handle_start_next_challenge_tierce(session: &mut PlayerSession) -> Result<()> {
    let challenge_id = session.challenge_state.challenge_id;
    tracing::info!("handle_start_next_challenge_tierce: challenge_id={challenge_id}");

    let mut chosen_avatars = Vec::new();
    if let Ok(map) = TIERCE_LINEUPS.lock() {
        if let Some(list) = map.get(&challenge_id) {
            if let Some(avatars) = list.get(1) {
                chosen_avatars = avatars.clone();
            }
        }
    }
    if chosen_avatars.is_empty() {
        if let Some(json) = session.json_data.get() {
            chosen_avatars = json.lineups.values().copied().filter(|&id| id != 0).collect();
        }
    }
    if chosen_avatars.is_empty() {
        chosen_avatars = vec![1304, 1313, 1406, 1004];
    }

    let (entrance, group, monster, event, buff) = if let Some(c) = CHALLENGE_DATA.challenges.get(&challenge_id) {
        (c.entrance2, c.group2, c.monster2, c.event2, c.buff)
    } else {
        (3000301, 8, 3003015, 420494, 0)
    };

    session.challenge_state.node = 2;
    session.challenge_state.event_id = event;
    session.challenge_state.monster_id = monster;
    session.challenge_state.buff_id = buff;
    session.challenge_state.avatar_ids = chosen_avatars.clone();

    if let Some(json) = session.json_data.get_mut() {
        let mut custom_lineup = BTreeMap::new();
        for (i, &aid) in chosen_avatars.iter().enumerate() {
            custom_lineup.insert(i as u32, aid);
        }
        json.battle_config.custom_battle_lineup = Some(custom_lineup);
        json.battle_config.stage_id = event;
        json.battle_config.cycle_count = 30;
        json.battle_config.battle_type = BattleType::AS;

        if let Some(sb) = CHALLENGE_DATA.stages.get(&event) {
            json.battle_config.monsters = sb.monsters.iter().map(|wave| {
                wave.iter().map(|&mid| Monster {
                    level: sb.level,
                    monster_id: mid,
                    max_hp: 0,
                }).collect()
            }).collect();
        }

        if buff != 0 {
            json.battle_config.blessings = vec![BattleBuffJson {
                id: buff,
                level: 1,
                dynamic_key: None,
                dynamic_values: Vec::new(),
            }];
        }

        let _ = json.save_persistent().await;
    }

    let (scene_info, motion) = load_challenge_scene(session, entrance, group, monster, event, &chosen_avatars).await?;
    let lineup_info = AvatarJson::to_challenge_lineup_info(&chosen_avatars, ExtraLineupType::LineupChallenge2);

    let tierce_challenge_info = ChallengeTierceChallengeInfo {
        stage_index: 1,
        challenge_id,
        is_single_stage: false,
        lineup_list: vec![lineup_info],
    };

    session.send(StartNextChallengeTierceScRsp {
        challenge_tierce_info: Some(tierce_challenge_info),
        scene: Some(scene_info),
        retcode: 0,
    }).await?;

    for (i, _) in chosen_avatars.iter().enumerate() {
        let _ = send_scene_entity_move_sc_notify(session, (i as u32) + 1, entrance, &motion).await;
    }

    Ok(())
}

pub async fn handle_leave_challenge(session: &mut PlayerSession) -> Result<()> {
    let dest_entry = get_leave_destination(session);
    session.challenge_state.reset();

    if let Some(json) = session.json_data.get_mut() {
        json.battle_config.custom_battle_lineup = None;
        let _ = json.save_persistent().await;
    }

    let scene_info = match load_scene(session, dest_entry, true, None).await {
        Ok(s) => s,
        Err(_) => load_scene(session, 100000104, true, None).await.unwrap_or_default(),
    };

    let lineup_info = session.json_data.get()
        .map(|json| AvatarJson::to_lineup_info(&json.lineups))
        .unwrap_or_default();

    let _ = session.send(QuitBattleScNotify {}).await;
    let _ = session.send(EnterSceneByServerScNotify {
        reason: EnterSceneReason::None as i32,
        lineup: Some(lineup_info),
        scene: Some(scene_info),
    }).await;

    session.send(LeaveChallengeScRsp {
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_leave_challenge_tierce(session: &mut PlayerSession) -> Result<()> {
    let dest_entry = get_leave_destination(session);
    session.challenge_state.reset();

    if let Some(json) = session.json_data.get_mut() {
        json.battle_config.custom_battle_lineup = None;
        let _ = json.save_persistent().await;
    }

    let scene_info = match load_scene(session, dest_entry, true, None).await {
        Ok(s) => s,
        Err(_) => load_scene(session, 100000104, true, None).await.unwrap_or_default(),
    };

    let lineup_info = session.json_data.get()
        .map(|json| AvatarJson::to_lineup_info(&json.lineups))
        .unwrap_or_default();

    let _ = session.send(QuitBattleScNotify {}).await;
    let _ = session.send(EnterSceneByServerScNotify {
        reason: EnterSceneReason::None as i32,
        lineup: Some(lineup_info),
        scene: Some(scene_info),
    }).await;

    session.send(LeaveChallengeTierceScRsp {
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_get_challenge_tierce_data(session: &PlayerSession) -> Result<()> {
    const TIERCE_CHALLENGES: [(u32, &[u32], u32); 13] = [
        // MoC (Memory of Chaos) Stage 5
        (5213, &[601, 602, 603, 600], 4000),
        (5313, &[601, 602, 603, 600], 4000),
        (5413, &[601, 602, 603, 600], 4000),
        (5513, &[601, 602, 603, 600], 4000),
        // Apocalyptic Shadow Tierce (all cycles)
        (30185, &[5001, 5002, 5003, 5000], 4000),
        (30195, &[5001, 5002, 5003, 5000], 4000),
        (30205, &[5001, 5002, 5003, 5000], 4000),
        (30215, &[5001, 5002, 5003, 5000], 4000),
        (30225, &[5001, 5002, 5003, 5000], 4000),
        // Pure Fiction Tierce (all cycles)
        (20245, &[4001, 4002, 4003, 4000], 40000),
        (20255, &[4001, 4002, 4003, 4000], 40000),
        (20265, &[4001, 4002, 4003, 4000], 40000),
        (20275, &[4001, 4002, 4003, 4000], 40000),
    ];

    let default_nodes: [&[u32]; 3] = [
        &[1304, 1313, 1406, 1004], // Node 1
        &[1212, 1205, 1215, 1217], // Node 2
        &[1308, 1218, 1112, 1006], // Node 3
    ];

    let mut challenge_info_list = Vec::new();

    for (challenge_id, targets, score) in TIERCE_CHALLENGES {
        let saved_lineups = TIERCE_LINEUPS.lock().ok().and_then(|m| m.get(&challenge_id).cloned());

        let mut stage_info_list = Vec::new();
        let mut result_list = Vec::new();

        for stage_idx in 0..3u32 {
            let avatars: Vec<u32> = saved_lineups.as_ref()
                .and_then(|list| list.get(stage_idx as usize))
                .cloned()
                .unwrap_or_else(|| default_nodes[stage_idx as usize].to_vec());

            let lineup = avatars.into_iter().map(|aid| AvatarLineup {
                id: aid,
                avatar_type: 1,
                assist_uid: 0,
            }).collect();

            stage_info_list.push(ChallengeTierceStageInfo {
                stage_index: stage_idx,
                lineup,
                buff_id: 0,
                peak_avatar_id_list: Vec::new(),
            });

            result_list.push(proto::ChallengeTierceStageData {
                stage_index: stage_idx,
                score_id: score,
                end_status: 1, // BattleEndWin
            });
        }

        challenge_info_list.push(ChallengeTierceData {
            challenge_id,
            is_passed: true,
            result_list,
            stage_info_list,
            finished_target_list: targets.to_vec(),
        });
    }

    session.send(GetChallengeTierceDataScRsp {
        challenge_info_list,
        retcode: 0,
    }).await?;

    Ok(())
}

pub async fn handle_get_challenge_peak_data(session: &PlayerSession) -> Result<()> {
    let mut challenge_peak_groups = Vec::new();
    let target_pre = vec![3001, 3002, 3000];
    let target_king = vec![3003, 3004, 3005];
    let taken_star_rewards = (1..=12).collect::<Vec<_>>();
    let default_avatar_list = vec![1304, 1313, 1406, 1004];

    for group in ALL_PEAK_GROUPS {
        let mut peaks = Vec::new();
        for &pre_id in group.pre_level_ids {
            let saved_avatars = PEAK_LINEUPS.lock().ok()
                .and_then(|m| m.get(&pre_id).cloned())
                .unwrap_or_else(|| default_avatar_list.clone());

            peaks.push(ChallengePeak {
                finished_target_list: target_pre.clone(),
                has_passed: true,
                peak_avatar_id_list: saved_avatars,
                peak_id: pre_id,
                cycles_used: 1,
            });
        }

        let boss_avatars = PEAK_LINEUPS.lock().ok()
            .and_then(|m| m.get(&group.boss_level_id).cloned())
            .unwrap_or_else(|| default_avatar_list.clone());

        let boss_clearance = ChallengePeakBossClearance {
            buff_id: group.buff_id,
            peak_avatar_id_list: boss_avatars.clone(),
            best_cycle_count: 0,
            has_passed: true,
            lampcacochp: boss_avatars,
        };

        let peak_boss = ChallengePeakBoss {
            hard_mode: Some(boss_clearance.clone()),
            easy_mode: Some(boss_clearance),
            hard_mode_has_passed: true,
            finished_target_list: target_king.clone(),
        };

        challenge_peak_groups.push(ChallengePeakGroup {
            peak_group_id: group.group_id,
            obtained_stars: 9,
            count_of_peaks: 3,
            taken_star_rewards: taken_star_rewards.clone(),
            peaks,
            disable_hard_mode: false,
            peak_boss: Some(peak_boss),
        });
    }

    session.send(GetChallengePeakDataScRsp {
        retcode: 0,
        challenge_peak_groups,
        current_peak_group_id: 1,
    }).await?;

    Ok(())
}

pub async fn handle_set_challenge_peak_mob_lineup_avatar(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let req = match SetChallengePeakMobLineupAvatarCsReq::decode(payload) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to decode SetChallengePeakMobLineupAvatarCsReq: {e}");
            return Ok(());
        }
    };
    tracing::info!(
        "handle_set_challenge_peak_mob_lineup_avatar: peak_group_id={}, lineup_len={}",
        req.peak_group_id, req.lineup_list.len()
    );

    if let Ok(mut map) = PEAK_LINEUPS.lock() {
        for item in &req.lineup_list {
            map.insert(item.peak_id, item.peak_avatar_id_list.clone());
        }
    }

    let mut update_peaks = Vec::new();
    for item in &req.lineup_list {
        update_peaks.push(ChallengePeak {
            finished_target_list: vec![3001, 3002, 3000],
            has_passed: true,
            peak_avatar_id_list: item.peak_avatar_id_list.clone(),
            peak_id: item.peak_id,
            cycles_used: 1,
        });
    }

    let update = ChallengePeakGroup {
        peak_group_id: req.peak_group_id,
        count_of_peaks: 3,
        obtained_stars: 9,
        peaks: update_peaks,
        taken_star_rewards: (1..=12).collect(),
        disable_hard_mode: false,
        peak_boss: None,
    };

    session.send(ChallengePeakGroupDataUpdateScNotify {
        challenge_peak_group: Some(update),
    }).await?;

    session.send(SetChallengePeakMobLineupAvatarScRsp {
        retcode: 0,
    }).await?;

    Ok(())
}

pub async fn handle_set_challenge_peak_boss_hard_mode(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let req = match SetChallengePeakBossHardModeCsReq::decode(payload) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to decode SetChallengePeakBossHardModeCsReq: {e}");
            return Ok(());
        }
    };
    tracing::info!(
        "handle_set_challenge_peak_boss_hard_mode: peak_group_id={}, is_hard_mode={}",
        req.peak_group_id, req.is_hard_mode
    );

    if let Ok(mut map) = PEAK_HARD_MODES.lock() {
        map.insert(req.peak_group_id, req.is_hard_mode);
    }

    session.send(SetChallengePeakBossHardModeScRsp {
        retcode: 0,
        peak_group_id: req.peak_group_id,
        is_hard_mode: req.is_hard_mode,
    }).await?;

    Ok(())
}

pub async fn handle_restart_challenge_peak(session: &mut PlayerSession) -> Result<()> {
    tracing::info!("handle_restart_challenge_peak");
    let event = session.challenge_state.event_id;
    let monster = session.challenge_state.monster_id;
    let avatars = session.challenge_state.avatar_ids.clone();

    if event != 0 && monster != 0 && !avatars.is_empty() {
        let entrance = 30002061;
        let group = 2;
        if let Ok((scene_info, motion)) = load_challenge_scene(session, entrance, group, monster, event, &avatars).await {
            let lineup_info = AvatarJson::to_challenge_lineup_info(&avatars, ExtraLineupType::LineupChallenge);
            let _ = session.send(EnterSceneByServerScNotify {
                reason: EnterSceneReason::None as i32,
                lineup: Some(lineup_info),
                scene: Some(scene_info),
            }).await;
            for (i, _) in avatars.iter().enumerate() {
                let _ = send_scene_entity_move_sc_notify(session, (i as u32) + 1, entrance, &motion).await;
            }
        }
    }

    session.send(ReStartChallengePeakScRsp {
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_take_challenge_peak_reward(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let req = TakeChallengePeakRewardCsReq::decode(payload).unwrap_or(TakeChallengePeakRewardCsReq {
        normal_reward_id_list: Vec::new(),
        peak_group_id: 0,
    });
    tracing::info!("handle_take_challenge_peak_reward: peak_group_id={}", req.peak_group_id);

    session.send(TakeChallengePeakRewardScRsp {
        retcode: 0,
        peak_group_id: req.peak_group_id,
        peak_reward_group_list: Vec::new(),
    }).await?;

    Ok(())
}

pub async fn handle_start_challenge_peak(session: &mut PlayerSession, payload: &[u8]) -> Result<()> {
    let req = match StartChallengePeakCsReq::decode(payload) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to decode StartChallengePeakCsReq: {e}");
            return Ok(());
        }
    };
    tracing::info!(
        "handle_start_challenge_peak: peak_id={}, boss_buff_id={}, avatars={:?}",
        req.peak_id, req.boss_buff_id, req.peak_avatar_id_list
    );

    let group_id = req.peak_id / 100;
    let is_hard_mode = PEAK_HARD_MODES.lock().ok()
        .and_then(|m| m.get(&group_id).copied())
        .unwrap_or(false);

    let stage_info = get_peak_stage_info(req.peak_id).unwrap_or(PeakStageInfo {
        peak_id: req.peak_id,
        event_id: 30501011,
        hard_event_id: None,
        monster_id: 3004012,
        default_buff: 0,
        is_boss: false,
    });

    let mut chosen_avatars = if !req.peak_avatar_id_list.is_empty() {
        req.peak_avatar_id_list.clone()
    } else if let Some(avatars) = PEAK_LINEUPS.lock().ok().and_then(|m| m.get(&req.peak_id).cloned()) {
        avatars
    } else if let Some(json) = session.json_data.get() {
        json.lineups.values().copied().filter(|&id| id != 0).collect()
    } else {
        vec![1304, 1313, 1406, 1004]
    };

    if chosen_avatars.is_empty() {
        chosen_avatars = vec![1304, 1313, 1406, 1004];
    }

    let (entrance, group) = (3013501, 8);
    let monster = stage_info.monster_id;
    let event = if stage_info.is_boss && is_hard_mode {
        stage_info.hard_event_id.unwrap_or(stage_info.event_id + 1)
    } else {
        stage_info.event_id
    };
    let buff = if req.boss_buff_id != 0 {
        req.boss_buff_id
    } else {
        stage_info.default_buff
    };

    let return_entry = session.json_data.get()
        .map(|j| j.scene.entry_id)
        .filter(|&id| !is_challenge_scene(id) && id != 0)
        .unwrap_or(100000104);
    session.challenge_state.return_entry_id = return_entry;
    session.challenge_state.is_in_challenge = true;
    session.challenge_state.challenge_mode = 3;
    session.challenge_state.event_id = event;
    session.challenge_state.monster_id = monster;
    session.challenge_state.buff_id = buff;
    session.challenge_state.avatar_ids = chosen_avatars.clone();

    if let Some(json) = session.json_data.get_mut() {
        let mut custom_lineup = BTreeMap::new();
        for (i, &aid) in chosen_avatars.iter().enumerate() {
            custom_lineup.insert(i as u32, aid);
        }
        json.battle_config.custom_battle_lineup = Some(custom_lineup);
        json.battle_config.stage_id = event;
        json.battle_config.cycle_count = 30;
        json.battle_config.battle_type = BattleType::AA;

        // Load monster waves from StageConfig
        if let Some(stage_entry) = common::structs::CHALLENGE_RES.stages.get(&event) {
            let monster_waves: Vec<Vec<Monster>> = stage_entry.monster_list.iter().map(|wave| {
                wave.iter().map(|&id| Monster {
                    monster_id: id,
                    level: stage_entry.level,
                    max_hp: 0,
                }).collect()
            }).collect();
            json.battle_config.monsters = monster_waves;
        } else if let Some(stage_data) = CHALLENGE_DATA.stages.get(&event) {
            let monster_waves: Vec<Vec<Monster>> = stage_data.monsters.iter().map(|wave| {
                wave.iter().map(|&id| Monster {
                    monster_id: id,
                    level: stage_data.level,
                    max_hp: 0,
                }).collect()
            }).collect();
            json.battle_config.monsters = monster_waves;
        } else {
            json.battle_config.monsters = vec![vec![Monster {
                monster_id: monster,
                level: if is_hard_mode { 120 } else { 100 },
                max_hp: 0,
            }]];
        }

        if buff != 0 {
            json.battle_config.blessings = vec![BattleBuffJson {
                id: buff,
                level: 1,
                dynamic_key: None,
                dynamic_values: Vec::new(),
            }];
        } else {
            json.battle_config.blessings = Vec::new();
        }

        let _ = json.save_persistent().await;
    }

    let (scene_info, motion) = load_challenge_scene(session, entrance, group, monster, event, &chosen_avatars).await?;
    let lineup_info = AvatarJson::to_challenge_lineup_info(&chosen_avatars, ExtraLineupType::LineupChallenge);

    session.send(EnterSceneByServerScNotify {
        reason: EnterSceneReason::None as i32,
        lineup: Some(lineup_info),
        scene: Some(scene_info),
    }).await?;

    for (i, _) in chosen_avatars.iter().enumerate() {
        let _ = send_scene_entity_move_sc_notify(session, (i as u32) + 1, entrance, &motion).await;
    }

    session.send(StartChallengePeakScRsp {
        retcode: 0,
    }).await?;

    Ok(())
}

pub async fn handle_leave_challenge_peak(session: &mut PlayerSession) -> Result<()> {
    let dest_entry = get_leave_destination(session);
    session.challenge_state.reset();

    if let Some(json) = session.json_data.get_mut() {
        json.battle_config.custom_battle_lineup = None;
        let _ = json.save_persistent().await;
    }

    let scene_info = match load_scene(session, dest_entry, true, None).await {
        Ok(s) => s,
        Err(_) => load_scene(session, 100000104, true, None).await.unwrap_or_default(),
    };

    let lineup_info = session.json_data.get()
        .map(|json| AvatarJson::to_lineup_info(&json.lineups))
        .unwrap_or_default();

    let _ = session.send(QuitBattleScNotify {}).await;
    let _ = session.send(EnterSceneByServerScNotify {
        reason: EnterSceneReason::None as i32,
        lineup: Some(lineup_info),
        scene: Some(scene_info),
    }).await;

    session.send(LeaveChallengePeakScRsp {
        retcode: 0,
    }).await?;
    Ok(())
}

pub async fn handle_get_cur_challenge(session: &PlayerSession) -> Result<()> {
    session.send_raw(NetPacket {
        cmd_type: 1771,
        head: Vec::new(),
        body: vec![0x68, 0x00], // tag 13: retcode = 0
    }).await?;
    Ok(())
}

pub async fn handle_take_challenge_reward(session: &PlayerSession, payload: &[u8]) -> Result<()> {
    let req = TakeChallengeRewardCsReq::decode(&payload[..]).unwrap_or(TakeChallengeRewardCsReq { group_id: 0 });
    session.send(TakeChallengeRewardScRsp {
        group_id: req.group_id,
        retcode: 0,
        taken_reward_list: Vec::new(),
    }).await?;
    Ok(())
}
