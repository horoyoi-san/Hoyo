import { calcBaseStatRaw } from "@/helper";
import type { LightConeDetail, LightconeStore } from "@/types";

export function getLightconeStats(
    detail: LightConeDetail | undefined,
    lightcone: LightconeStore | null | undefined
) {
    if (!detail || !lightcone) return [];

    const promotion = detail.Stats[String(lightcone.promotion)]
        ? lightcone.promotion
        : Object.values(detail.Stats).find((stat) => stat.Promotion === lightcone.promotion)?.Promotion;
    const stat = detail.Stats[String(promotion ?? "")];
    if (!stat) return [];

    return [
        { key: "HP", value: calcBaseStatRaw(stat.BaseHP, stat.BaseHPAdd, lightcone.level) },
        { key: "ATK", value: calcBaseStatRaw(stat.BaseAttack, stat.BaseAttackAdd, lightcone.level) },
        { key: "DEF", value: calcBaseStatRaw(stat.BaseDefence, stat.BaseDefenceAdd, lightcone.level) },
    ];
}
