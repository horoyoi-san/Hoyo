/**
 * Stat calculation utilities ported from firefly_srtools_1.0.
 * Provides functions for computing promotion tiers, affix bonuses,
 * base stats, and formatted stat display values.
 */

import { mappingStats, ratioStats } from "./stat-mapping";

export interface MainAffixData {
  Property: string;
  BaseValue: number;
  LevelAdd: number;
}

export interface SubAffixData {
  Property: string;
  BaseValue: number;
  StepValue: number;
}

/** Compute the promotion tier (0–6) for a given character/lightcone level. */
export function calcPromotion(level: number): number {
  if (level < 20) return 0;
  if (level < 30) return 1;
  if (level < 40) return 2;
  if (level < 50) return 3;
  if (level < 60) return 4;
  if (level < 70) return 5;
  return 6;
}

/** Extract the numeric rarity (3/4/5) from a rarity string. */
export function calcRarity(rarity?: string): number {
  if (!rarity) return 1;
  if (rarity.includes("5")) return 5;
  if (rarity.includes("4")) return 4;
  if (rarity.includes("3")) return 3;
  return 1;
}

/** Calculate a main affix bonus value as a formatted display string. */
export function calcMainAffixBonus(
  affix?: MainAffixData,
  level?: number,
): string {
  if (!affix || typeof level !== "number") return "0";
  const value = affix.BaseValue + affix.LevelAdd * level;
  const statMeta = mappingStats[affix.Property];

  if (statMeta?.unit === "%") {
    return (value * 100).toFixed(1);
  }
  if (statMeta?.name === "SPD") {
    return value.toFixed(1);
  }

  return value.toFixed(0);
}

/** Calculate a sub-affix bonus value as a formatted display string. */
export const calcAffixBonus = (
  affix?: SubAffixData,
  stepCount?: number,
  rollCount?: number,
): string => {
  if (
    !affix ||
    typeof stepCount !== "number" ||
    typeof rollCount !== "number"
  )
    return "0";
  const statMeta = mappingStats[affix.Property];
  if (statMeta?.unit === "%") {
    return (
      (affix.BaseValue * rollCount + affix.StepValue * stepCount) *
      100
    ).toFixed(1);
  }
  if (statMeta?.name === "SPD") {
    return (
      affix.BaseValue * rollCount +
      affix.StepValue * stepCount
    ).toFixed(1);
  }
  return (
    affix.BaseValue * rollCount +
    affix.StepValue * stepCount
  ).toFixed(0);
};

/** Calculate a base stat value at a given level. */
export const calcBaseStat = (
  baseStat: number,
  stepStat: number,
  roundFixed: number,
  level: number,
): string => {
  const promotionStat = baseStat + stepStat * (level - 1);
  return promotionStat.toFixed(roundFixed);
};

/** Calculate a raw (unformatted) base stat value. */
export const calcBaseStatRaw = (
  baseStat?: number,
  stepStat?: number,
  level?: number,
): number => {
  if (
    typeof baseStat !== "number" ||
    typeof stepStat !== "number" ||
    typeof level !== "number"
  )
    return 0;
  return baseStat + stepStat * (level - 1);
};

/** Calculate raw sub-affix bonus, applying ratio multiplier if applicable. */
export const calcSubAffixBonusRaw = (
  affix?: SubAffixData,
  stepCount?: number,
  rollCount?: number,
  baseStat?: number,
): number => {
  if (
    !affix ||
    typeof stepCount !== "number" ||
    typeof rollCount !== "number" ||
    typeof baseStat !== "number"
  )
    return 0;
  if (ratioStats.includes(affix.Property)) {
    return (
      (affix.BaseValue * rollCount + affix.StepValue * stepCount) * baseStat
    );
  }
  return affix.BaseValue * rollCount + affix.StepValue * stepCount;
};

/** Calculate raw main affix bonus, applying ratio multiplier if applicable. */
export const calcMainAffixBonusRaw = (
  affix?: MainAffixData,
  level?: number,
  baseStat?: number,
): number => {
  if (!affix || typeof level !== "number" || typeof baseStat !== "number")
    return 0;
  const value = affix.BaseValue + affix.LevelAdd * level;

  if (ratioStats.includes(affix.Property)) {
    return baseStat * value;
  }

  return value;
};

/** Calculate raw bonus stat value (used for trace/eidolon bonuses). */
export const calcBonusStatRaw = (
  affix?: string,
  baseStat?: number,
  bonusValue?: number,
): number => {
  if (
    !affix ||
    typeof baseStat !== "number" ||
    typeof bonusValue !== "number"
  )
    return 0;
  if (ratioStats.includes(affix)) {
    return baseStat * bonusValue;
  }
  return bonusValue;
};
