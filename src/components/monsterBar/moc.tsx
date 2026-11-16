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

export default function MocBar() {
    const { extraData } = useGlobalStore(
        useShallow((state) => ({ extraData: state.extraData }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const {
        moc_config,
        setMocConfig
    } = useUserDataStore(
        useShallow((state) => ({
            moc_config: state.moc_config,
            setMocConfig: state.setMocConfig,
        }))
    )
    const { mapMoc } = useDetailDataStore(
        useShallow((state) => ({

            mapMoc: state.mapMoc,

        }))
    )

    const transI18n = useTranslations("DataPage")

    const challengeSelected = useMemo(() => {
        return mapMoc[moc_config.event_id.toString()]?.Level.find((moc) => moc.ID === moc_config.challenge_id)
    }, [moc_config, mapMoc])

    const eventSelected = useMemo(() => {
        return mapMoc[moc_config.event_id.toString()]
    }, [moc_config, mapMoc])

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

        if (eventSelected?.Tierce && eventSelected.Tierce.PreChallenge === moc_config.challenge_id) {
            floorList.push({
                id: "thirdNode",
                name: transI18n("thirdNode"),
                wave: transI18n("thirdNodeEnemies")
            })
        }
        return floorList
    }, [moc_config.challenge_id, eventSelected, transI18n])


    if (!mapMoc) return null

    return (
        <div className="pt-4 pb-2 relative space-y-4">

            <div className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
                <div className="mb-4 w-full">
                    <SelectCustomText
                        customSet={Object.values(mapMoc).sort((a, b) => b.ID - a.ID).map((moc) => ({
                            id: moc.ID.toString(),
                            name: getLocaleName(locale, moc.Name),
                            time: `${moc.BeginTime} - ${moc.EndTime}`,
                        }))}
                        excludeSet={[]}
                        selectedCustomSet={moc_config.event_id.toString()}
                        placeholder={transI18n("selectMOCEvent")}
                        setSelectedCustomSet={(id) => setMocConfig({
                            ...moc_config,
                            event_id: Number(id),
                            challenge_id: mapMoc[Number(id)]?.Level.at(-1)?.ID || 0,
                            floor_side: "firstNode",
                        })}
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">

                    <div className="flex items-center gap-2">
                        <label className="label">
                            <span className="label-text font-bold text-success">{transI18n("floor")}:{" "}</span>
                        </label>
                        <select
                            value={moc_config.challenge_id}
                            className="select select-success"
                            onChange={(e) => setMocConfig({
                                ...moc_config,
                                challenge_id: Number(e.target.value)
                            })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectFloor")}</option>
                            {eventSelected?.Level?.map((moc) => (
                                <option key={moc.ID} value={moc.ID}>{getLocaleName(locale, moc.Name)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="label">
                            <span className="label-text font-bold text-success">{transI18n("side")}:{" "}</span>
                        </label>
                        <select
                            value={moc_config.floor_side}
                            className="select select-success"
                            onChange={(e) => setMocConfig({ ...moc_config, floor_side: e.target.value })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectSide")}</option>
                            {floorSideList.map((side) => (
                                <option key={side.id} value={side.id}>{side.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    

                    <div className="flex items-center gap-2">
                        <label className="label cursor-pointer">
                            <span
                                onClick={() => setMocConfig({ ...moc_config, use_cycle_count: !moc_config.use_cycle_count })}
                                className="label-text font-bold text-success cursor-pointer"
                            >
                                {transI18n("useCycleCount")} {" "}
                            </span>
                            <input
                                type="checkbox"
                                checked={moc_config.use_cycle_count}
                                onChange={(e) => setMocConfig({ ...moc_config, use_cycle_count: e.target.checked })}
                                className="checkbox checkbox-primary"
                            />
                        </label>
                    </div>
                </div>
                <div className="label-text font-bold text-success mb-2">{transI18n("stageId")}: {moc_config?.stage_id}</div>

                <div className="pt-3 border-t border-base-content/10 space-y-2">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={moc_config.use_turbulence_buff}
                            onChange={(e) => setMocConfig({ ...moc_config, use_turbulence_buff: e.target.checked })}
                            className="checkbox checkbox-primary"
                        />
                        <span
                            onClick={() => setMocConfig({ ...moc_config, use_turbulence_buff: !moc_config.use_turbulence_buff })}
                            className="font-bold text-success cursor-pointer">
                            {transI18n("useTurbulenceBuff")}
                        </span>
                    </div>
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

            {(moc_config?.challenge_id ?? 0) !== 0 && (
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
                                            {Object.values(wave).filter((id) => Boolean(id) && Number(id) !== 0).map((waveValue, enemyIndex) => (
                                                <MonsterCard
                                                    key={enemyIndex}
                                                    monsterId={waveValue}
                                                    level={targetEvent.Level}
                                                    eliteGroup={targetEvent.EliteGroup}
                                                    hardLevelGroup={targetEvent.HardLevelGroup}
                                                    invasion={targetEvent.Invasion}
                                                    invasionPercent={extraData?.setting?.invasion_percent}
                                                    locale={locale}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    )
}