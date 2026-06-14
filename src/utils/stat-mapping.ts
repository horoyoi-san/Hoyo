/**
 * Stat mapping constants ported from firefly_srtools_1.0.
 * Maps internal stat property names to display names, icons, and units.
 */

export interface StatMeta {
  name: string;
  icon: string;
  unit: string;
  baseStat: string;
}

export const mappingStats: Record<string, StatMeta> = {
  HPDelta: {
    name: "HP",
    icon: "spriteoutput/ui/avatar/icon/IconMaxHP.png",
    unit: "",
    baseStat: "HP",
  },
  AttackDelta: {
    name: "ATK",
    icon: "spriteoutput/ui/avatar/icon/IconAttack.png",
    unit: "",
    baseStat: "ATK",
  },
  HPAddedRatio: {
    name: "HP",
    icon: "spriteoutput/ui/avatar/icon/IconMaxHP.png",
    unit: "%",
    baseStat: "HP",
  },
  AttackAddedRatio: {
    name: "ATK",
    icon: "spriteoutput/ui/avatar/icon/IconAttack.png",
    unit: "%",
    baseStat: "ATK",
  },
  DefenceDelta: {
    name: "DEF",
    icon: "spriteoutput/ui/avatar/icon/IconDefence.png",
    unit: "",
    baseStat: "DEF",
  },
  DefenceAddedRatio: {
    name: "DEF",
    icon: "spriteoutput/ui/avatar/icon/IconDefence.png",
    unit: "%",
    baseStat: "DEF",
  },
  SpeedAddedRatio: {
    name: "SPD",
    icon: "spriteoutput/ui/avatar/icon/IconSpeed.png",
    unit: "%",
    baseStat: "SPD",
  },
  BaseSpeed: {
    name: "SPD",
    icon: "spriteoutput/ui/avatar/icon/IconSpeed.png",
    unit: "",
    baseStat: "SPD",
  },
  CriticalChanceBase: {
    name: "CRIT Rate",
    icon: "spriteoutput/ui/avatar/icon/IconCriticalChance.png",
    unit: "%",
    baseStat: "CRITRate",
  },
  CriticalDamageBase: {
    name: "CRIT DMG",
    icon: "spriteoutput/ui/avatar/icon/IconCriticalDamage.png",
    unit: "%",
    baseStat: "CRITDmg",
  },
  HealRatioBase: {
    name: "Outgoing Healing Boost",
    icon: "spriteoutput/ui/avatar/icon/IconHealRatio.png",
    unit: "%",
    baseStat: "HealBoost",
  },
  StatusProbabilityBase: {
    name: "Effect Hit Rate",
    icon: "spriteoutput/ui/avatar/icon/IconStatusProbability.png",
    unit: "%",
    baseStat: "EffectHitRate",
  },
  StatusResistanceBase: {
    name: "Effect RES",
    icon: "spriteoutput/ui/avatar/icon/IconStatusResistance.png",
    unit: "%",
    baseStat: "EffectRES",
  },
  BreakDamageAddedRatioBase: {
    name: "Break Effect",
    icon: "spriteoutput/ui/avatar/icon/IconBreakUp.png",
    unit: "%",
    baseStat: "BreakEffect",
  },
  SpeedDelta: {
    name: "SPD",
    icon: "spriteoutput/ui/avatar/icon/IconSpeed.png",
    unit: "",
    baseStat: "SPD",
  },
  PhysicalAddedRatio: {
    name: "Physical DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconPhysicalAddedRatio.png",
    unit: "%",
    baseStat: "PhysicalAdd",
  },
  FireAddedRatio: {
    name: "Fire DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconFireAddedRatio.png",
    unit: "%",
    baseStat: "FireAdd",
  },
  IceAddedRatio: {
    name: "Ice DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconIceAddedRatio.png",
    unit: "%",
    baseStat: "IceAdd",
  },
  ThunderAddedRatio: {
    name: "Thunder DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconThunderAddedRatio.png",
    unit: "%",
    baseStat: "ThunderAdd",
  },
  WindAddedRatio: {
    name: "Wind DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconWindAddedRatio.png",
    unit: "%",
    baseStat: "WindAdd",
  },
  QuantumAddedRatio: {
    name: "Quantum DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconQuantumAddedRatio.png",
    unit: "%",
    baseStat: "QuantumAdd",
  },
  ImaginaryAddedRatio: {
    name: "Imaginary DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconImaginaryAddedRatio.png",
    unit: "%",
    baseStat: "ImaginaryAdd",
  },
  ElationDamageAddedRatioBase: {
    name: "Elation DMG Boost",
    icon: "spriteoutput/ui/avatar/icon/IconJoy.png",
    unit: "%",
    baseStat: "ElationAdd",
  },
  SPRatioBase: {
    name: "Energy Regeneration Rate",
    icon: "spriteoutput/ui/avatar/icon/IconEnergyRecovery.png",
    unit: "%",
    baseStat: "EnergyRate",
  },
};

/** Stats that use a ratio (percentage) applied to a base stat value */
export const ratioStats = [
  "HPAddedRatio",
  "AttackAddedRatio",
  "DefenceAddedRatio",
  "SpeedAddedRatio",
];

/** Maps numeric relic slot IDs to named slot identifiers */
export const mappingRelicSlot: Record<string, string> = {
  "1": "HEAD",
  "2": "HAND",
  "3": "BODY",
  "4": "FOOT",
  "5": "NECK",
  "6": "OBJECT",
};
