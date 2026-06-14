export const SLOT_MAP: Record<number, string> = {
  1: "HEAD",
  2: "HAND",
  3: "BODY",
  4: "FOOT",
  5: "NECK",
  6: "OBJECT",
};

export const REVERSE_SLOT_MAP: Record<string, string> = {
  HEAD: "1",
  HAND: "2",
  BODY: "3",
  FOOT: "4",
  NECK: "5",
  OBJECT: "6",
};

export const STAT_TYPE_TO_ID: Record<string, number> = {
  HPDelta: 1,
  AttackDelta: 2,
  DefenceDelta: 3,
  HPAddedRatio: 4,
  AttackAddedRatio: 5,
  DefenceAddedRatio: 6,
  SpeedDelta: 7,
  CriticalChanceBase: 8,
  CriticalDamageBase: 9,
  StatusProbabilityBase: 10,
  StatusResistanceBase: 11,
  BreakDamageAddedRatioBase: 12,
};

export const MAIN_AFFIX_MAP: Record<number, Record<string, number>> = {
  51: { HPDelta: 1 },
  52: { AttackDelta: 1 },
  53: {
    HPAddedRatio: 1,
    AttackAddedRatio: 2,
    DefenceAddedRatio: 3,
    CriticalChanceBase: 4,
    CriticalDamageBase: 5,
    HealRatioBase: 6,
    StatusProbabilityBase: 7,
  },
  54: {
    HPAddedRatio: 1,
    AttackAddedRatio: 2,
    DefenceAddedRatio: 3,
    SpeedDelta: 4,
  },
  55: {
    HPAddedRatio: 1,
    AttackAddedRatio: 2,
    DefenceAddedRatio: 3,
    PhysicalAddedRatio: 4,
    FireAddedRatio: 5,
    IceAddedRatio: 6,
    ThunderAddedRatio: 7,
    WindAddedRatio: 8,
    QuantumAddedRatio: 9,
    ImaginaryAddedRatio: 10,
  },
  56: {
    BreakDamageAddedRatioBase: 1,
    SPRatioBase: 2,
    HPAddedRatio: 3,
    AttackAddedRatio: 4,
    DefenceAddedRatio: 5,
  },
};

export const TYPE_TO_GROUP: Record<number, number> = {
  1: 51,
  2: 52,
  3: 53,
  4: 54,
  5: 55,
  6: 56,
};

// HOYOLAB
export const HOYOLAB_TO_AFFIX_ID: Record<number, number> = {
  // MAIN STAT
  // 51 GROUP
  27: 1, // MAIN STAT HEAD -> HP FLAT

  // 52 GROUP
  29: 1, // MAIN STAT HAND -> ATK FLAT
};

export const HOYOLAB_TO_BODY: Record<number, number> = {
  // MAIN STAT BODY | 53 GROUP
  32: 1, // HP%
  33: 2, // ATK%
  34: 3, // DEF%
  52: 4, // CRIT RATE
  53: 5, // CRIT DMG
  55: 6, // HEALING BOOST
  56: 7, // EFFECT HIT RATE
};

export const HOYOLAB_TO_FOOT: Record<number, number> = {
  // MAIN STAT FOOT | 54 GROUP
  32: 1, // HP%
  33: 2, // ATK%
  34: 3, // DEF%
  51: 4, // SPD
};

export const HOYOLAB_TO_SPHERE: Record<number, number> = {
  // SPHERE | 55 GROUP
  32: 1, // HP%
  33: 2, // ATK%
  34: 3, // DEF%
  12: 4, // PHYSICAL
  14: 5, // FIRE
  16: 6, // ICE
  18: 7, // LIGHTNING
  20: 8, // WIND
  22: 9, // QUANTUM
  24: 10, // IMAGINARY
};

export const HOYOLAB_TO_LINK: Record<number, number> = {
  // LINK | 56 GROUP
  59: 1, // BREAK EFFECT
  54: 2, // ENERGY%
  32: 3, // HP%
  33: 4, // ATK%
  34: 5, // DEF%
};

export const HOYOLAB_TO_SUB_AFFIX_ID: Record<number, number> = {
  // SUB AFFIXES
  27: 1, // HP FLAT
  29: 2, // ATK FLAT
  31: 3, // DEF FLAT
  32: 4, // HP%
  33: 5, // ATK%
  34: 6, // DEF%
  51: 7, // SPD
  52: 8, // CRIT RATE
  53: 9, // CRIT DMG
  56: 10, // EFFECT HIT RATE
  57: 11, // EFFECT RES
  59: 12, // BREAK EFFECT
};
