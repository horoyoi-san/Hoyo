"use client";
import { useMemo } from "react";
import SelectCustomText from "../select/customSelectText";
import { getLocaleName, replaceByParam } from "@/helper";
import useLocaleStore from "@/stores/localeStore";
import useUserDataStore from "@/stores/userDataStore";
import { useTranslations } from "next-intl";
import useDetailDataStore from "@/stores/detailDataStore";
import useGlobalStore from "@/stores/globalStore";
import { useShallow } from "zustand/react/shallow";
import VoracityCorrosionAlert from "./voracityCorrosionAlert";
import MonsterCard from "./monsterCard";

export default function PeakBar() {
  const { extraData } = useGlobalStore(
    useShallow((state) => ({ extraData: state.extraData })),
  );
  const { locale } = useLocaleStore(
    useShallow((state) => ({ locale: state.locale })),
  );
  const { peak_config, setPeakConfig } = useUserDataStore(
    useShallow((state) => ({
      peak_config: state.peak_config,
      setPeakConfig: state.setPeakConfig,
    })),
  );
  const { mapPeak } =
    useDetailDataStore(
      useShallow((state) => ({
        mapPeak: state.mapPeak,
      })),
    );
  const transI18n = useTranslations("DataPage");

  const listFloor = useMemo(() => {
    const peak = mapPeak?.[peak_config?.event_id?.toString()];
    if (!peak) return [];

    return [...peak.PreLevel, peak.BossLevel].filter((it) => it != null);
  }, [peak_config, mapPeak]);
  const eventSelected = useMemo(() => {
    return mapPeak?.[peak_config?.event_id?.toString()];
  }, [peak_config, mapPeak]);

  const bossConfig = useMemo(() => {
    return mapPeak?.[peak_config?.event_id?.toString()]?.BossConfig;
  }, [peak_config, mapPeak]);

  const challengeSelected = useMemo(() => {
    const challenge = listFloor.find(peak => peak.ID === peak_config.challenge_id);
    if (
      challenge &&
      challenge.ID ===
        mapPeak?.[peak_config?.event_id?.toString()]?.BossLevel?.ID &&
      bossConfig &&
      peak_config?.boss_mode === "Hard"
    ) {
      return { challenge: bossConfig, isBoss: true };
    }
    return {
      challenge: challenge,
      isBoss:
        challenge?.ID ===
        mapPeak?.[peak_config?.event_id?.toString()]?.BossLevel?.ID,
    };
  }, [peak_config, listFloor, mapPeak, bossConfig]);


  if (!mapPeak) return null;

  return (
    <div className="pt-4 pb-2 relative space-y-4">
      <div className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
        <div className="mb-4 w-full">
          <SelectCustomText
            customSet={Object.values(mapPeak)
              .sort((a, b) => b.ID - a.ID)
              .map((peak) => ({
                id: peak.ID.toString(),
                name: `${getLocaleName(locale, peak.Name)} (${peak.ID})`,
              }))}
            excludeSet={[]}
            selectedCustomSet={peak_config.event_id.toString()}
            placeholder={transI18n("selectPEAKEvent")}
            setSelectedCustomSet={(id) => {
              const peakEvent = mapPeak?.[id];
              const defaultFloor = peakEvent ? [...(peakEvent.PreLevel || []), peakEvent.BossLevel].filter(Boolean)[0]?.ID || 0 : 0;
              setPeakConfig({
                ...peak_config,
                event_id: Number(id),
                challenge_id: defaultFloor,
                buff_id: 0,
              });
            }}
          />
        </div>
        <div
          className={`grid grid-cols-1 
                    ${eventSelected && eventSelected.BossLevel?.ID === peak_config.challenge_id ? "md:grid-cols-2" : ""}
                    gap-4 mb-2 justify-items-center items-center w-full`}
        >
          <div className="flex items-center gap-2 w-full">
            <label className="label">
              <span className="label-text font-bold text-success">
                {transI18n("floor")}:{" "}
              </span>
            </label>
            <select
              value={peak_config.challenge_id}
              className="select select-success w-full"
              onChange={(e) =>
                setPeakConfig({
                  ...peak_config,
                  challenge_id: Number(e.target.value),
                })
              }
            >
              <option value={0} disabled={true}>
                {transI18n("selectFloor")}
              </option>
              {listFloor.map((peak) => (
                <option key={peak.ID} value={peak.ID}>
                  {getLocaleName(locale, peak.Name)}
                </option>
              ))}
            </select>
          </div>
          {eventSelected &&
            eventSelected.BossLevel?.ID === peak_config.challenge_id && (
              <div className="flex items-center gap-2 w-full">
                <label className="label">
                  <span className="label-text font-bold text-success">
                    {transI18n("mode")}:{" "}
                  </span>
                </label>
                <select
                  value={peak_config.boss_mode}
                  className="select select-success w-full"
                  onChange={(e) =>
                    setPeakConfig({ ...peak_config, boss_mode: e.target.value })
                  }
                >
                  <option value={0} disabled={true}>
                    {transI18n("selectSide")}
                  </option>
                  <option value="Normal">{transI18n("normalMode")}</option>
                  <option value="Hard">{transI18n("hardMode")}</option>
                </select>
              </div>
            )}
        </div>
        <div className="label-text font-bold text-success mb-2">
          {transI18n("stageId")}: {peak_config?.stage_id}
        </div>
        {eventSelected &&
          eventSelected.BossLevel?.ID === peak_config.challenge_id &&
          bossConfig && (
            <div className="mb-4 w-full">
              <SelectCustomText
                customSet={bossConfig.BuffList.map((buff) => ({
                  id: buff.ID.toString(),
                  name: getLocaleName(locale, buff?.Name || ""),
                  description: replaceByParam(
                    getLocaleName(locale, buff?.Desc || ""),
                    buff?.Param || [],
                  ),
                }))}
                excludeSet={[]}
                selectedCustomSet={peak_config?.buff_id?.toString()}
                placeholder={transI18n("selectBuff")}
                setSelectedCustomSet={(id) =>
                  setPeakConfig({ ...peak_config, buff_id: Number(id) })
                }
              />
            </div>
          )}

        <div className="pt-3 border-t border-base-content/10 space-y-2">
          <h2 className="text-xl font-bold text-info">
            {transI18n("turbulenceBuff")}
          </h2>

          {challengeSelected?.challenge &&
          challengeSelected?.challenge?.MazeBuff?.length > 0 ? (
            challengeSelected.challenge.MazeBuff.map((subOption, index) => (
              <div key={index} className="space-y-1">
                <span className="font-bold text-success text-sm">
                  {index + 1}. {getLocaleName(locale, subOption.Name)}
                </span>
                <div
                  className="text-sm text-base-content/85 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: replaceByParam(
                      getLocaleName(locale, subOption.Desc),
                      subOption.Param || [],
                    ),
                  }}
                />
              </div>
            ))
          ) : (
            <div className="text-sm text-base-content/50 italic">
              {transI18n("noTurbulenceBuff")}
            </div>
          )}
        </div>
      </div>


      {(peak_config?.challenge_id ?? 0) !== 0 && (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-4 text-info">
              {getLocaleName(locale, challengeSelected?.challenge?.Name)}
            </h2>

            {challengeSelected?.challenge?.EventList?.[0]?.Invasion && (
              <VoracityCorrosionAlert
                invasion={challengeSelected.challenge.EventList[0].Invasion}
                invasionPercent={extraData?.setting?.invasion_percent}
                locale={locale}
              />
            )}

            {challengeSelected?.challenge &&
              Object.values(
                challengeSelected?.challenge?.EventList?.[0]?.Infinite || [],
              ).map((waveValue, waveIndex) => (
                <div key={waveIndex} className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-base-content/70 uppercase tracking-wider">
                      LV.{challengeSelected?.challenge?.EventList?.[0]?.Level}
                    </span>
                    <h3 className="text-lg font-semibold text-info">
                      {transI18n("wave")} {waveIndex + 1}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {Array.from(new Set(waveValue.MonsterList))
                      .filter((id) => Boolean(id) && Number(id) !== 0)
                      .map((monsterId, enemyIndex) => {
                        const count = waveValue.MonsterList.filter((id) => id === monsterId).length;
                        return (
                          <MonsterCard
                            key={enemyIndex}
                            monsterId={monsterId}
                            count={count}
                            level={
                              challengeSelected?.challenge?.EventList?.[0]
                                ?.Level || 0
                            }
                            eliteGroup={waveValue.EliteGroup}
                            hardLevelGroup={
                              challengeSelected?.challenge?.EventList?.[0]
                                ?.HardLevelGroup || 0
                            }
                            invasion={
                              challengeSelected?.challenge?.EventList?.[0]?.Invasion
                            }
                            invasionPercent={extraData?.setting?.invasion_percent}
                            locale={locale}
                          />
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
