"use client";

import Image from "next/image";
import { calcMonsterStats, getLocaleName } from "@/helper";
import { useTranslations } from "next-intl";
import { Invasion } from "@/types";
import useDetailDataStore from "@/stores/detailDataStore";
import { useShallow } from "zustand/react/shallow";

interface MonsterCardProps {
  monsterId: number | string;
  count?: number;
  level: number;
  eliteGroup: number;
  hardLevelGroup: number;
  invasion?: Invasion | null;
  invasionPercent?: number;
  locale: string;
}

export default function MonsterCard({
  monsterId,
  count,
  level,
  eliteGroup,
  hardLevelGroup,
  invasion,
  invasionPercent,
  locale,
}: MonsterCardProps) {
  const transI18n = useTranslations("DataPage");
  const { mapMonster, damageType, eliteConfig, hardLevelConfig } =
    useDetailDataStore(
      useShallow((state) => ({
        mapMonster: state.mapMonster,
        damageType: state.damageType,
        eliteConfig: state.eliteConfig,
        hardLevelConfig: state.hardLevelConfig,
      })),
    );

  const numId = Number(monsterId);
  if (!monsterId || numId === 0 || isNaN(numId)) {
    return null;
  }

  const monster = mapMonster?.[monsterId.toString()];
  if (!monster) {
    return null;
  }

  const monsterStats = calcMonsterStats(
    monster,
    eliteGroup,
    hardLevelGroup,
    level,
    hardLevelConfig,
    eliteConfig,
  );

  const isContaminated = Boolean(
    invasion &&
      (invasion.MonsterList?.includes(numId) ||
        invasion.MonsterInvasionList?.some((m) => m.MonsterID === numId)),
  );

  const voracityPercent =
    invasionPercent ?? (invasion?.MazeBuff?.Param?.[1] || 0.4);
  const basePhaseHp = monsterStats.phaseHps?.[0] || monsterStats.hp;
  const voracityHp = basePhaseHp * voracityPercent;
  const monsterName =
    getLocaleName(locale, monster?.Name) ||
    monster?.Name?.[locale] ||
    monster?.Name?.["en"] ||
    monster?.Name?.["vi"] ||
    monster?.Name?.["cn"] ||
    "Enemy";

  if (isContaminated) {
    return (
      <div className="relative flex flex-col w-[calc(50%-6px)] min-w-[136px] max-w-[200px] rounded-xl border border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.25)] bg-gradient-to-b from-[#240c13] via-[#17070b] to-[#100407] overflow-hidden">
        <div className="bg-[#3a121c]/90 border-b border-rose-500/40 py-1 px-1.5 flex items-center justify-center gap-1.5 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.9)] shrink-0 animate-pulse" />
          <span className="text-[11px] font-bold text-rose-200 tracking-tight">
            {transI18n("corrosionLv")} {invasion?.ID}
          </span>
        </div>

        <div className="relative w-full h-18 sm:h-20 flex items-center justify-center p-1.5 bg-rose-950/20">
          <span className="badge badge-warning badge-xs font-bold absolute top-1.5 left-1.5 z-10 text-[9px] px-1">
            Lv.{level}
          </span>

          {count && count > 1 && (
            <span className="badge badge-xs bg-indigo-950/90 text-indigo-200 border border-indigo-400/30 absolute top-1.5 right-1.5 font-bold z-10 text-[9px] px-1">
              x{count}
            </span>
          )}

          {monster?.Image?.IconPath ? (
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-rose-500/40 shadow-sm overflow-hidden bg-base-100">
              <Image
                unoptimized
                src={`${process.env.CDN_URL}/${monster.Image.IconPath}`}
                alt={monsterName}
                width={140}
                height={140}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-13 h-13 rounded-full bg-base-300 flex items-center justify-center text-xs text-base-content/50">
              {transI18n("enemy")}
            </div>
          )}
        </div>

        <div className="px-2 pt-1 text-center min-h-[2.2rem] flex items-center justify-center">
          <span
            className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-tight"
            title={monsterName}
          >
            {monsterName}
          </span>
        </div>

        <div className="px-1.5 py-0.5 flex items-center justify-center gap-1 min-h-[22px]">
          {monster?.StanceWeakList?.map((icon, iconIndex) => (
            <Image
              key={iconIndex}
              unoptimized
              src={`${process.env.CDN_URL}/${damageType[icon]?.Icon}`}
              alt={icon}
              width={22}
              height={22}
              className="h-4 w-4 object-contain drop-shadow-xs"
            />
          ))}
        </div>

        <div className="px-2 pb-2.5 pt-1 flex flex-col space-y-1 text-center">
          {monsterStats.phaseHps && monsterStats.phaseHps.length > 1 ? (
            <div className="text-xs font-medium text-rose-100/95 leading-tight space-y-0.5">
              {monsterStats.phaseHps.map((php, idx) => (
                <div key={idx}>
                  P{idx + 1} {Math.round(php).toLocaleString()}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs font-semibold text-rose-100">
              HP {Math.round(monsterStats.hp).toLocaleString()}
            </div>
          )}

          <div className="pt-0.5 border-t border-rose-500/30">
            <div className="text-[10px] font-semibold text-rose-300">
              {transI18n("voracityHp")}
            </div>
            <div className="text-xs font-bold text-rose-100">
              +{Math.round(voracityHp).toLocaleString()}
            </div>
            <div className="text-[10px] font-medium text-rose-200/90">
              ({Math.round(voracityPercent * 100)}%)
            </div>
          </div>

          <div className="pt-0.5 text-[10px] text-rose-200/75 space-y-0.5">
            <div>
              {transI18n("speed")} {Math.round(monsterStats.spd)}
            </div>
            <div>
              {transI18n("toughness")} {monsterStats.stance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-[calc(50%-6px)] min-w-[136px] max-w-[200px] bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden">
      <div className="relative w-full h-18 sm:h-20 bg-base-200/60 flex items-center justify-center p-1.5">
        <span className="badge badge-warning badge-xs font-bold absolute top-1.5 left-1.5 z-10 text-[9px] px-1">
          Lv.{level}
        </span>

        {count && count > 1 && (
          <span className="badge badge-xs bg-indigo-950/90 text-indigo-200 border border-indigo-400/30 font-bold absolute top-1.5 right-1.5 z-10 text-[9px] px-1">
            x{count}
          </span>
        )}

        {monster?.Image?.IconPath ? (
          <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-base-content/15 shadow-xs overflow-hidden bg-base-100">
            <Image
              unoptimized
              src={`${process.env.CDN_URL}/${monster.Image.IconPath}`}
              alt={monsterName}
              width={140}
              height={140}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-13 h-13 rounded-full bg-base-300 flex items-center justify-center text-xs text-base-content/50">
            {transI18n("enemy")}
          </div>
        )}
      </div>

      <div className="px-2 pt-1 text-center min-h-[2.2rem] flex items-center justify-center">
        <span
          className="text-xs sm:text-[13px] font-bold text-base-content line-clamp-2 leading-tight"
          title={monsterName}
        >
          {monsterName}
        </span>
      </div>

      <div className="px-1.5 py-0.5 flex items-center justify-center gap-1 min-h-[22px]">
        {monster?.StanceWeakList?.map((icon, iconIndex) => (
          <Image
            key={iconIndex}
            unoptimized
            src={`${process.env.CDN_URL}/${damageType[icon]?.Icon}`}
            alt={icon}
            width={22}
            height={22}
            className="h-4 w-4 object-contain drop-shadow-xs"
          />
        ))}
      </div>

      <div className="px-2 pb-2.5 pt-1 flex flex-col space-y-1 text-center">
        {monsterStats.phaseHps && monsterStats.phaseHps.length > 1 ? (
          <div className="text-xs font-medium text-base-content/90 leading-tight space-y-0.5">
            {monsterStats.phaseHps.map((php, idx) => (
              <div key={idx}>
                P{idx + 1} {Math.round(php).toLocaleString()}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold text-base-content">
            HP {Math.round(monsterStats.hp).toLocaleString()}
          </div>
        )}

        <div className="pt-0.5 text-[10px] text-base-content/70 space-y-0.5">
          <div>
            {transI18n("speed")} {Math.round(monsterStats.spd)}
          </div>
          <div>
            {transI18n("toughness")} {monsterStats.stance.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
