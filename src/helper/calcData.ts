import { mappingStats, ratioStats } from "@/constant/constant"
import { AffixDetail } from "@/types"

export function calcPromotion(level: number) {
    if (level < 20) {
        return 0
    }
    if (level < 30) {
        return 1
    }
    if (level < 40) {
        return 2
    }
    if (level < 50) {
        return 3
    }
    if (level < 60) {
        return 4
    }
    if (level < 70) {
        return 5
    }
    return 6
}


export function calcRarity(rarity: string) {
    if (rarity.includes("5")) {
        return 5
    }
    if (rarity.includes("4")) {
        return 4
    }
    if (rarity.includes("3")) {
        return 3
    }
    return 1
}

export function calcMainAffixBonus(affix?: AffixDetail, level?: number) {
    if (!affix || typeof level !== "number") return "0"
    const value = affix.base + affix.step * level;

    if (mappingStats?.[affix.property].unit === "%") {
        return (value * 100).toFixed(1);
    }
    if (mappingStats?.[affix.property].name === "SPD") {
        return value.toFixed(1);
    }

    return value.toFixed(0);
}

export const calcAffixBonus = (affix?: AffixDetail, stepCount?: number, rollCount?: number) => {
    if (!affix || typeof stepCount !== "number" || typeof rollCount !== "number") return "0"
    if (mappingStats?.[affix.property].unit === "%") {
        return ((affix.base * rollCount + affix.step * stepCount) * 100).toFixed(1);
    }
    if (mappingStats?.[affix.property].name === "SPD") {
        return (affix.base * rollCount + affix.step * stepCount).toFixed(1);
    }
    return (affix.base * rollCount + affix.step * stepCount).toFixed(0);
}

export const calcBaseStat = (baseStat: number, stepStat: number, roundFixed: number, level: number) => {
    const promotionStat = baseStat + stepStat * (level-1);
    return promotionStat.toFixed(roundFixed);
}

export const calcBaseStatRaw = (baseStat?: number, stepStat?: number, level?: number) => {
    if (typeof baseStat !== "number" || typeof stepStat !== "number" || typeof level !== "number") return 0
    return baseStat + stepStat * (level-1);
}

export const calcSubAffixBonusRaw = (affix?: AffixDetail, stepCount?: number, rollCount?: number, baseStat?: number) => {
    if (!affix || typeof stepCount !== "number" || typeof rollCount !== "number" || typeof baseStat !== "number") return 0
    if (ratioStats.includes(affix.property)) {
        return (affix.base * rollCount + affix.step * stepCount) * baseStat;
    }
    return affix.base * rollCount + affix.step * stepCount;
}

export const calcMainAffixBonusRaw = (affix?: AffixDetail, level?: number, baseStat?: number) => {
    if (!affix || typeof level !== "number" || typeof baseStat !== "number") return 0
    const value = affix.base + affix.step * level;

    if (ratioStats.includes(affix.property)) {
        return baseStat * value
    }

    return value
}

export const calcBonusStatRaw = (affix?: string, baseStat?: number, bonusValue?: number) => {
    if (!affix || typeof baseStat !== "number" || typeof bonusValue !== "number") return 0
    if (ratioStats.includes(affix)) {
        return baseStat * bonusValue
    }
    return bonusValue
}