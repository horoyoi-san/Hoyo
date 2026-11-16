import { mappingStats, ratioStats } from "@/constant/constant"
import { EliteData, HardLevelData, MainAffixData, MonsterDetail, SubAffixData} from "@/types"

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


export function calcRarity(rarity?: string) {
    if (!rarity) {
        return 1
    }
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

export function calcMainAffixBonus(affix?: MainAffixData, level?: number) {
    if (!affix || typeof level !== "number") return "0"
    const value = affix.BaseValue + affix.LevelAdd * level;
    const statMeta = mappingStats[affix.Property]

    if (statMeta?.unit === "%") {
        return (value * 100).toFixed(1);
    }
    if (statMeta?.name === "SPD") {
        return value.toFixed(1);
    }

    return value.toFixed(0);
}

export const calcAffixBonus = (affix?: SubAffixData, stepCount?: number, rollCount?: number) => {
    if (!affix || typeof stepCount !== "number" || typeof rollCount !== "number") return "0"
    const statMeta = mappingStats[affix.Property]
    if (statMeta?.unit === "%") {
        return ((affix.BaseValue * rollCount + affix.StepValue * stepCount) * 100).toFixed(1);
    }
    if (statMeta?.name === "SPD") {
        return (affix.BaseValue * rollCount + affix.StepValue * stepCount).toFixed(1);
    }
    return (affix.BaseValue * rollCount + affix.StepValue * stepCount).toFixed(0);
}

export const calcSubAffixRolls = (
    affix?: SubAffixData,
    displayedVal?: number | string,
    isRatio?: boolean
): { count: number; step: number } => {
    if (!affix) return { count: 1, step: 0 };
    const num = typeof displayedVal === "number" ? displayedVal : parseFloat(String(displayedVal || "0").replace("%", ""));
    if (isNaN(num) || num <= 0) return { count: 1, step: 0 };

    const ratio = isRatio ?? (
        ratioStats.includes(affix.Property) ||
        affix.Property.includes("Ratio") ||
        affix.Property.includes("Base") ||
        mappingStats[affix.Property]?.unit === "%"
    );
    const target = ratio ? num / 100 : num;

    let bestCount = 1;
    let bestStep = 0;
    let minDiff = Infinity;

    for (let count = 1; count <= 6; count++) {
        for (let step = 0; step <= 2 * count; step++) {
            const candidate = affix.BaseValue * count + affix.StepValue * step;
            const diff = Math.abs(candidate - target);
            if (diff < minDiff) {
                minDiff = diff;
                bestCount = count;
                bestStep = step;
            }
        }
    }

    return { count: bestCount, step: bestStep };
}

export const calcBaseStat = (baseStat: number, stepStat: number, roundFixed: number, level: number) => {
    const promotionStat = baseStat + stepStat * (level-1);
    return promotionStat.toFixed(roundFixed);
}

export const calcBaseStatRaw = (baseStat?: number, stepStat?: number, level?: number) => {
    if (typeof baseStat !== "number" || typeof stepStat !== "number" || typeof level !== "number") return 0
    return baseStat + stepStat * (level-1);
}

export const calcSubAffixBonusRaw = (affix?: SubAffixData, stepCount?: number, rollCount?: number, baseStat?: number) => {
    if (!affix || typeof stepCount !== "number" || typeof rollCount !== "number" || typeof baseStat !== "number") return 0
    if (ratioStats.includes(affix.Property)) {
        return (affix.BaseValue * rollCount + affix.StepValue * stepCount) * baseStat;
    }
    return affix.BaseValue * rollCount + affix.StepValue * stepCount;
}

export const calcMainAffixBonusRaw = (affix?: MainAffixData, level?: number, baseStat?: number) => {
    if (!affix || typeof level !== "number" || typeof baseStat !== "number") return 0
    const value = affix.BaseValue + affix.LevelAdd * level;

    if (ratioStats.includes(affix.Property)) {
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

export const calcMonsterStats = (
    monster: MonsterDetail, 
    eliteGroup: number, 
    hardLevelGroup: number, 
    level: number,
    hardLevelConfig: Record<string, Record<string, HardLevelData>>,
    eliteConfig: Record<string, EliteData>
) => {
    if (!monster?.Base || !monster?.Modify) {
        return {
            atk: 0,
            def: 0,
            hp: 0,
            spd: 0,
            stance: 0,
        }
    }

    let hardLevelRatio = {
        AttackRatio: 1,
        DefenceRatio:1,
        HPRatio: 1,
        SpeedRatio: 1,
        StanceRatio: 1
    } 
    if (hardLevelConfig?.[hardLevelGroup.toString()]?.[level.toString()]) {
        hardLevelRatio = hardLevelConfig?.[hardLevelGroup.toString()]?.[level.toString()]
    }
    let eliteRatio = {
        AttackRatio: 1,
        DefenceRatio:1,
        HPRatio: 1,
        SpeedRatio: 1,
        StanceRatio: 1
    } 
    if (eliteConfig?.[eliteGroup.toString()]) {
        eliteRatio = eliteConfig?.[eliteGroup.toString()]
    }

    const baseHp = monster.Base.HPBase * monster.Modify.HPModifyRatio * hardLevelRatio.HPRatio * eliteRatio.HPRatio
    const phaseRatios = monster.PhaseHPRatios && monster.PhaseHPRatios.length > 0 ? monster.PhaseHPRatios : [1]
    const phaseHps = phaseRatios.map((ratio) => baseHp * ratio)

    return {
        atk: monster.Base.AttackBase * monster.Modify.AttackModifyRatio * hardLevelRatio.AttackRatio * eliteRatio.AttackRatio,
        def: monster.Base.DefenceBase * monster.Modify.DefenceModifyRatio * hardLevelRatio.DefenceRatio * eliteRatio.DefenceRatio,
        hp: baseHp,
        phaseHps,
        spd: monster.Base.SpeedBase * monster.Modify.SpeedModifyRatio * hardLevelRatio.SpeedRatio * eliteRatio.SpeedRatio,
        stance: (monster.Base.StanceBase * monster.Modify.StanceModifyRatio * hardLevelRatio.StanceRatio * eliteRatio.StanceRatio) / 3,
    }
}
