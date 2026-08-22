// Sub-stat
// CriticalChanceBase CriticalDamageBase
// AttackAddedRatio AttackDelta HPAddedRatio HPDelta DefenceAddedRatio DefenceDelta SpeedDelta
// StatusProbabilityBase StatusResistanceBase
// BreakDamageAddedRatioBase

use std::collections::HashMap;

const OVERRIDES: &[(u32, &[(&str, f32)])] = &[
    // 1300
    (1309, &[("SpeedDelta", 1.0)]),
    // 1400
    (1409, &[("CriticalDamageBase", 1.0)]),
    // 1500
    (1506, &[("HPAddedRatio", 0.5), ("DefenceAddedRatio", 0.5)]),
    // --- edit / add rows below ---
    // (1234, &[("StatusProbabilityBase", 0.0)]),                 // remove Effect Hit
    // (8002, &[("AttackAddedRatio", 1.0), ("SpeedDelta", 1.0),   // define a collab/alt
    //          ("BreakDamageAddedRatioBase", 1.0)]),
];

pub(super) fn apply(avatar_id: u32, w: &mut HashMap<&'static str, f32>) {
    for &(id, adjustments) in OVERRIDES {
        if id != avatar_id {
            continue;
        }
        for &(prop, weight) in adjustments {
            if weight <= 0.0 {
                w.remove(prop);
            } else {
                w.insert(prop, weight);
            }
        }
    }
}
