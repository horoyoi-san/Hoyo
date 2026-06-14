import { useCalculateStats } from "@/src/hooks/use-calculate-stats.hook";
import { useCharacterStore } from "../../store/use-character.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { useUserStore } from "@/src/store/use-user.store";
import { useLightcones } from "../../hooks/use-lightcones.hook";
import { useMemo } from "react";
import { useGetMainAffixes } from "@/src/modules/relic/hooks/use-get-main-affixes.hook";
import { useGetSubAffixes } from "@/src/modules/relic/hooks/use-get-sub-affixes.hook";
import { useGetRelics } from "@/src/modules/relic/hooks/use-get-relics.hook";
import { useGetRelicSets } from "@/src/modules/relic/hooks/use-get-relic-sets.hook";

const StatsShowcase = () => {
  const charId = useCharacterStore((state) => state.id);
  const charData = useCharacterStore((state) => state.charData);
  const charConfig = useUserStore(
    (state) => state.characters[charId as string] ?? DEFAULT_CHAR_CONFIG,
  );
  const relics = useUserStore((state) => state.relics);

  const { data: allLightcones } = useLightcones();
  const { data: allRelics } = useGetRelics();
  const { data: mainAffixes } = useGetMainAffixes();
  const { data: subAffixes } = useGetSubAffixes();
  const { data: relicSets } = useGetRelicSets();

  const lightconeData = useMemo(() => {
    if (!allLightcones || !charConfig.lightcone.id) return;

    return allLightcones[charConfig.lightcone.id];
  }, [allLightcones, charConfig]);

  const stats = useCalculateStats(
    charData!,
    charConfig,
    lightconeData!,
    relics,
    allRelics!,
    mainAffixes!,
    subAffixes!,
    relicSets!,
  );

  const finalDisplayStats = useMemo(() => {
    if (!stats || !charData) return [];

    const list = [
      { name: "HP", val: Math.floor(stats.hp) },
      { name: "ATK", val: Math.floor(stats.atk) },
      { name: "DEF", val: Math.floor(stats.def) },
      { name: "SPD", val: stats.spd.toFixed(1) },
      { name: "CRIT Rate", val: (stats.crit_rate * 100).toFixed(1) + "%" },
      { name: "CRIT DMG", val: (stats.crit_dmg * 100).toFixed(1) + "%" },
      {
        name: `${charData.element} DMG Boost`,
        val: (stats.element_dmg * 100).toFixed(1) + "%",
        raw: stats.element_dmg,
      },
      {
        name: "Break Effect",
        val: (stats.break_effect * 100).toFixed(1) + "%",
        raw: stats.break_effect,
      },
      {
        name: "Energy Regen",
        val: (stats.energy_regen * 100).toFixed(1) + "%",
        raw: stats.energy_regen - 1,
      },
      {
        name: "Effect Hit Rate",
        val: (stats.eff_hit * 100).toFixed(1) + "%",
        raw: stats.eff_hit,
      },
      {
        name: "Effect RES",
        val: (stats.eff_res * 100).toFixed(1) + "%",
        raw: stats.eff_res,
      },
      {
        name: "Outgoing Healing",
        val: (stats.heal_boost * 100).toFixed(1) + "%",
        raw: stats.heal_boost,
      },
      {
        name: "Elation",
        val: (stats.elation_dmg * 100).toFixed(1) + "%",
        raw: stats.elation_dmg,
      },
    ];

    return list;
  }, [stats, charData]);

  if (!stats) return null;

  return (
    <div className="grid grid-rows-7 grid-flow-col gap-x-8 gap-y-3 pr-2">
      {finalDisplayStats.map((item) => (
        <div
          key={item.name}
          className="flex justify-between text-xs items-center border-b border-white/5 pb-1"
        >
          <p className="font-semibold tracking-wide">{item.name}</p>
          <p className="font-bold text-secondary">{item.val}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsShowcase;
