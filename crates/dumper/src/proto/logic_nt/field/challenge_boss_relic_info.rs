use super::FieldLogic;

pub const CHALLENGE_BOSS_RELIC_INFO_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "ChallengeBossRelicInfo",
        FieldLogic::ByNumber(&[(1, "unique_id"), (2, "tid")]),
    ),
    (
        "ChallengeBossAvatarRelicInfo",
        FieldLogic::ByNumber(&[(1, "avatar_relic_slot_map")]),
    ),
    (
        "PlayerChallengeTierceRecord",
        FieldLogic::ByNumber(&[(2, "record_id"), (6, "finished_target_list")]),
    ),
];
