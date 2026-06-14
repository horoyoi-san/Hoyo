import { useMemo } from "react";
import { calculateSubAffixValue } from "../utils/helpers";
import { CharacterDetails } from "../modules/character/utils/character-detail.type";
import { CharacterConfigStore, RelicConfigStore } from "../store/types";
import { LightconeDetails } from "../modules/character/utils/lightcone-detail.type";
import { AllRelicsData } from "../modules/relic/types/all-relics.type";
import {
  MainAffixData,
  SubAffixData,
} from "../modules/relic/types/affixes.type";
import { RelicSetData } from "../modules/relic/types/relic-set.type";

export const useCalculateStats = (
  charData: CharacterDetails,
  charConfig: CharacterConfigStore,
  lightconeData: LightconeDetails,
  userRelics: Record<string, RelicConfigStore>,
  allRelics: AllRelicsData,
  mainAffixes: MainAffixData,
  subAffixes: SubAffixData,
  relicSets: RelicSetData,
) => {
  return useMemo(() => {
    if (
      !charData ||
      !charConfig ||
      !allRelics ||
      !mainAffixes ||
      !subAffixes ||
      !relicSets
    ) {
      return null;
    }

    // --- 1. SETUP INITIAL ---
    const stats = {
      ratios: { hp: 0, atk: 0, def: 0, spd: 0 },
      totals: {
        hp: 0,
        atk: 0,
        def: 0,
        spd: 0,
        crit_rate: 0.05,
        crit_dmg: 0.5,
        break_effect: 0,
        energy_regen: 1.0,
        eff_hit: 0,
        eff_res: 0,
        heal_boost: 0,
        element_dmg: 0,
        elation_dmg: 0,
      },
    };

    // --- 2. BASE (Char + LC) ---
    const charPromo =
      charData.promotions[charConfig.promotion] || charData.promotions[0];
    const lcPromo =
      lightconeData && charConfig.lightcone.id
        ? lightconeData.promotion.values[charConfig.lightcone.promotion]
        : null;

    const baseRaw = {
      hp:
        charPromo.hp.base +
        charPromo.hp.step * (charConfig.level - 1) +
        (lcPromo?.hp?.base ?? 0) +
        (lcPromo?.hp?.step ?? 0) * (charConfig.lightcone.level - 1),
      atk:
        charPromo.atk.base +
        charPromo.atk.step * (charConfig.level - 1) +
        (lcPromo?.atk?.base ?? 0) +
        (lcPromo?.atk?.step ?? 0) * (charConfig.lightcone.level - 1),
      def:
        charPromo.def.base +
        charPromo.def.step * (charConfig.level - 1) +
        (lcPromo?.def?.base ?? 0) +
        (lcPromo?.def?.step ?? 0) * (charConfig.lightcone.level - 1),
      spd: charPromo.spd.base + charPromo.spd.step * (charConfig.level - 1),
    };

    // --- 3. TRACES ---
    Object.values(charData.skill_trees).forEach((node) => {
      node.status_add_list?.forEach((s) =>
        mapPropertyToStats(s.type, s.value, stats),
      );
    });

    // --- 3.5 LIGHTCONE ABILITY ---
    if (lightconeData && charConfig.lightcone.rank) {
      // get properties based on superimpose rank (rank 1 = index 0)
      const lcAbilityProps =
        lightconeData.rank.properties?.[charConfig.lightcone.rank - 1];
      lcAbilityProps?.forEach((p) => {
        mapPropertyToStats(p.type, p.value, stats);
      });
    }

    // --- 4. RELIC MAIN & SUB ---
    const activeSets: Record<number, number> = {}; // {set_id: count}

    Object.values(charConfig.relics).forEach((relicUid) => {
      if (!relicUid) return;
      const relic = userRelics[relicUid];
      if (!relic) return;

      const meta = allRelics[String(relic.relic_id)];
      if (!meta) return;

      // Track set bonus
      activeSets[meta.set_id] = (activeSets[meta.set_id] || 0) + 1;

      // Main Stat
      const mainGroup = mainAffixes[meta.main_affix_id];
      const mainInfo = mainGroup?.[relic.main_affix_id];
      if (mainInfo) {
        const val =
          mainInfo.BaseValue.Value + relic.level * mainInfo.LevelAdd.Value;
        mapPropertyToStats(mainInfo.Property, val, stats);
      }

      // Sub Stats
      relic.sub_affixes.forEach((sub) => {
        const subData = subAffixes[meta.rarity]?.[sub.sub_affix_id];
        if (subData) {
          const val = calculateSubAffixValue(
            subData.BaseValue.Value,
            subData.StepValue.Value,
            sub.step,
            sub.count,
          );
          mapPropertyToStats(subData.Property, val, stats);
        }
      });
    });

    // --- 5. SET BONUS ---
    Object.entries(activeSets).forEach(([setId, count]) => {
      const setData = relicSets[setId];
      if (!setData) return;
      setData.set_bonus.forEach(([reqCount, bonus]) => {
        if (count >= parseInt(reqCount)) {
          bonus.properties.forEach((p) =>
            mapPropertyToStats(p.type, p.value, stats),
          );
        }
      });
    });

    const finalSpd =
      (charPromo.spd.base + charPromo.spd.step * (charConfig.level - 1)) *
        (1 + stats.ratios.spd) +
      stats.totals.spd;

    // --- FINAL AGGREGATION ---
    return {
      hp: baseRaw.hp * (1 + stats.ratios.hp) + stats.totals.hp,
      atk: baseRaw.atk * (1 + stats.ratios.atk) + stats.totals.atk,
      def: baseRaw.def * (1 + stats.ratios.def) + stats.totals.def,
      spd: finalSpd,
      crit_rate: stats.totals.crit_rate,
      crit_dmg: stats.totals.crit_dmg,
      break_effect: stats.totals.break_effect,
      energy_regen: stats.totals.energy_regen,
      eff_hit: stats.totals.eff_hit,
      eff_res: stats.totals.eff_res,
      heal_boost: stats.totals.heal_boost,
      element_dmg: stats.totals.element_dmg,
      elation_dmg: stats.totals.elation_dmg,
      base: baseRaw,
    };
  }, [
    charData,
    charConfig,
    lightconeData,
    userRelics,
    allRelics,
    mainAffixes,
    subAffixes,
    relicSets,
  ]);
};

const mapPropertyToStats = (prop: string, val: number, stats: any) => {
  if (!prop) return;

  const normalizeKey = (p: string) => {
    const key = p
      .replace("AddedRatio", "")
      .replace("Delta", "")
      .replace("Base", "")
      .toLowerCase();

    if (key === "attack") return "atk";
    if (key === "defence") return "def";
    if (key === "speed") return "spd";
    return key;
  };

  // --- 1. HANDLE SPEED (FLAT & PERCENT) ---
  if (prop === "SpeedDelta") {
    stats.totals.spd += val; // Stat flat (+25, +4.6, etc)
    return;
  }
  if (prop === "SpeedAddedRatio") {
    stats.ratios.spd += val; // Percentage from LC or bonus set
    return;
  }

  // --- 2. HANDLE PERCENT BOOSTS (AddedRatio) ---
  if (prop.includes("AddedRatio")) {
    // Break Effect (BreakDamageAddedRatioBase)
    if (prop.includes("BreakDamage")) {
      stats.totals.break_effect += val;
      return;
    }

    if (prop.includes("ElationDamage")) {
      stats.totals.elation_dmg += val;
      return;
    }

    // Ele DMG
    const elements = [
      "Physical",
      "Fire",
      "Ice",
      "Thunder",
      "Wind",
      "Quantum",
      "Imaginary",
    ];
    const foundElement = elements.find((el) => prop.startsWith(el));
    if (foundElement) {
      stats.totals.element_dmg += val;
      return;
    }

    // HP%, ATK%, DEF%
    const key = normalizeKey(prop);
    if (stats.ratios[key] !== undefined) {
      stats.ratios[key] += val;
    }
  }

  // --- 3. HANDLE FLAT STATS (Delta) ---
  else if (prop.includes("Delta")) {
    const key = normalizeKey(prop);
    if (stats.totals[key] !== undefined) {
      stats.totals[key] += val;
    }
  }

  // --- 4. HANDLE BASE STATS (Crit, ERR, EHR) ---
  else {
    const mapping: Record<string, string> = {
      CriticalChanceBase: "crit_rate",
      CriticalDamageBase: "crit_dmg",
      SPRatioBase: "energy_regen",
      StatusProbabilityBase: "eff_hit",
      StatusResistanceBase: "eff_res",
      HealRatioBase: "heal_boost",
    };
    const key = mapping[prop];
    if (key) stats.totals[key] += val;
  }
};
