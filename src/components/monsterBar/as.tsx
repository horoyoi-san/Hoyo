"use client"
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

export default function AsBar() {
    const { extraData } = useGlobalStore(
        useShallow((state) => ({ extraData: state.extraData }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const {
        as_config,
        setAsConfig
    } = useUserDataStore(
        useShallow((state) => ({
            as_config: state.as_config,
            setAsConfig: state.setAsConfig,
        }))
    )
    const { mapAS } = useDetailDataStore(
        useShallow((state) => ({

            mapAS: state.mapAS,

        }))
    )
    const transI18n = useTranslations("DataPage")

    const challengeSelected = useMemo(() => {
        return mapAS[as_config.event_id.toString()]?.Level.find((as) => as.ID === as_config.challenge_id)
    }, [as_config, mapAS])

    const eventSelected = useMemo(() => {
        return mapAS[as_config.event_id.toString()]
    }, [as_config, mapAS])


    const floorSideList = useMemo(() => {
        if (!eventSelected) return [];

        const floorList = [
            {
                id: "firstNode",
                name: transI18n("firstNode"),
                wave: transI18n("firstNodeEnemies")
            },
            {
                id: "secondNode",
                name: transI18n("secondNode"),
                wave: transI18n("secondNodeEnemies")
            },

        ]

        if (eventSelected?.Tierce && eventSelected.Tierce.PreChallenge === as_config.challenge_id) {
            floorList.push({
                id: "thirdNode",
                name: transI18n("thirdNode"),
                wave: transI18n("thirdNodeEnemies")
            })
        }
        return floorList
    }, [as_config.challenge_id, eventSelected, transI18n])

    const buffList = useMemo(() => {
        if (!eventSelected) return [];

        if (as_config.floor_side === "firstNode") {
            return eventSelected?.BuffList1 ?? [];
        }

        if (as_config.floor_side === "secondNode") {
            return eventSelected?.BuffList2 ?? [];
        }

        if (as_config.floor_side === "thirdNode" && eventSelected?.BuffList3) {
            return eventSelected?.BuffList3 ?? [];
        }

        return [];
    }, [as_config.floor_side, eventSelected]);


    if (!mapAS) return null
    return (
        <div className="pt-4 pb-2 relative space-y-4">

            <div className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
                <div className="mb-4 w-full">
                    <SelectCustomText
                        customSet={Object.values(mapAS).sort((a, b) => b.ID - a.ID).map((as) => ({
                            id: as.ID.toString(),
                            name: getLocaleName(locale, as.Name),
                            time: `${as.BeginTime} - ${as.EndTime}`,
                        }))}
                        excludeSet={[]}
                        selectedCustomSet={as_config.event_id.toString()}
                        placeholder={transI18n("selectASEvent")}
                        setSelectedCustomSet={(id) => setAsConfig({
                            ...as_config,
                            event_id: Number(id),
                            challenge_id: mapAS[Number(id)]?.Level.at(-1)?.ID || 0,
                            floor_side: "firstNode",
                            buff_id: 0
                        })}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">

                    <div className="flex items-center gap-2">
                        <label className="label">
                            <span className="label-text font-bold text-success">{transI18n("floor")}:{" "}</span>
                        </label>
                        <select
                            value={as_config.challenge_id}
                            className="select select-success"
                            onChange={(e) => setAsConfig({ ...as_config, challenge_id: Number(e.target.value) })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectFloor")}</option>
                            {eventSelected?.Level.map((as) => (
                                <option key={as.ID} value={as.ID}>{getLocaleName(locale, as.Name)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="label">
                            <span className="label-text font-bold text-success">{transI18n("side")}:{" "}</span>
                        </label>
                        <select
                            value={as_config.floor_side}
                            className="select select-success"
                            onChange={(e) => setAsConfig({ ...as_config, floor_side: e.target.value })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectSide")}</option>
                            {floorSideList.map((side) => {
                                return <option key={side.id} value={side.id}>{side.name}</option>
                            })}
                        </select>
                    </div>
                </div>
                <div className="label-text font-bold text-success mb-2">{transI18n("stageId")}: {as_config?.stage_id}</div>
                {eventSelected && (
                    <div className="mb-4 w-full">
                        <SelectCustomText
                            customSet={buffList.map((buff) => ({
                                id: buff.ID?.toString() || "",
                                name: getLocaleName(locale, buff?.Name) || "",
                                description: replaceByParam(getLocaleName(locale, buff?.Desc) || "", buff?.Param || []),
                            }))}
                            excludeSet={[]}
                            selectedCustomSet={as_config?.buff_id?.toString()}
                            placeholder={transI18n("selectBuff")}
                            setSelectedCustomSet={(id) => setAsConfig({ ...as_config, buff_id: Number(id) })}
                        />
                    </div>
                )}
                <div className="pt-3 border-t border-base-content/10 space-y-2">
                    <h2 className="text-xl font-bold text-info">{transI18n("turbulenceBuff")}</h2>
                    {challengeSelected ? (
                        challengeSelected.MazeBuff.map((buff, i) => (
                            <div
                                key={i}
                                className="text-sm text-base-content/85 leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: replaceByParam(
                                        getLocaleName(locale, buff?.Desc) || "",
                                        buff?.Param || []
                                    )
                                }}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-base-content/50 italic">{transI18n("noTurbulenceBuff")}</div>
                    )}
                </div>
            </div>

            {(as_config?.challenge_id ?? 0) !== 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {floorSideList.map((side, i) => {
                        const eventList = side.id === "firstNode"
                            ? challengeSelected?.EventList1
                            : side.id === "secondNode"
                                ? challengeSelected?.EventList2
                                : side.id === "thirdNode"
                                    ? eventSelected?.Tierce?.EventList
                                    : [];

                        if (!eventList || eventList.length === 0) return null;
                        const targetEvent = eventList[0];

                        return (
                            <div key={i} className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
                                <h2 className="text-2xl font-bold mb-4 text-info">{side.wave}</h2>

                                {targetEvent?.Invasion && (
                                    <VoracityCorrosionAlert
                                        invasion={targetEvent.Invasion}
                                        invasionPercent={extraData?.setting?.invasion_percent}
                                        locale={locale}
                                    />
                                )}

                                {targetEvent?.MonsterList?.map((wave, waveIndex) => (
                                    <div key={waveIndex} className="mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-xs font-bold text-base-content/70 uppercase tracking-wider">
                                                LV.{targetEvent.Level}
                                            </span>
                                            <h3 className="text-lg font-semibold text-info">{transI18n("wave")} {waveIndex + 1}</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            {Object.values(wave).filter((id) => Boolean(id) && Number(id) !== 0).map((waveValue, enemyIndex) => {
                                                const stageInvasion = targetEvent.Invasion ? {
                                                    ...targetEvent.Invasion,
                                                    MonsterList: Array.from(new Set([...(targetEvent.Invasion.MonsterList || []), waveValue])),
                                                } : null;
                                                return (
                                                    <MonsterCard
                                                        key={enemyIndex}
                                                        monsterId={waveValue}
                                                        level={targetEvent.Level}
                                                        eliteGroup={targetEvent.EliteGroup}
                                                        hardLevelGroup={targetEvent.HardLevelGroup}
                                                        invasion={stageInvasion}
                                                        invasionPercent={extraData?.setting?.invasion_percent}
                                                        locale={locale}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )})}
                </div>
            )}

        </div>
    )
}