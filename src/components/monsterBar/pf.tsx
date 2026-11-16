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

export default function PfBar() {
    const { extraData } = useGlobalStore(
        useShallow((state) => ({ extraData: state.extraData }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const {
        pf_config,
        setPfConfig
    } = useUserDataStore(
        useShallow((state) => ({
            pf_config: state.pf_config,
            setPfConfig: state.setPfConfig,
        }))
    )
    const { mapPF } = useDetailDataStore(
        useShallow((state) => ({

            mapPF: state.mapPF,

        }))
    )

    const transI18n = useTranslations("DataPage")
    const challengeSelected = useMemo(() => {
        return mapPF[pf_config.event_id.toString()]?.Level.find((pf) => pf.ID === pf_config.challenge_id)
    }, [pf_config, mapPF])

    const eventSelected = useMemo(() => {
        return mapPF[pf_config.event_id.toString()]
    }, [pf_config, mapPF])

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

        if (eventSelected?.Tierce && eventSelected.Tierce.PreChallenge === pf_config.challenge_id) {
            floorList.push({
                id: "thirdNode",
                name: transI18n("thirdNode"),
                wave: transI18n("thirdNodeEnemies")
            })
        }
        return floorList
    }, [pf_config.challenge_id, eventSelected, transI18n])


    if (!mapPF) return null

    return (
        <div className="pt-4 pb-2 relative space-y-4">

            <div className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
                <div className="mb-4 w-full">
                    <SelectCustomText
                        customSet={Object.values(mapPF).sort((a, b) => b.ID - a.ID).map((pf) => ({
                            id: pf.ID.toString(),
                            name: getLocaleName(locale, pf.Name),
                            time: `${pf.BeginTime} - ${pf.EndTime}`,
                        }))}
                        excludeSet={[]}
                        selectedCustomSet={pf_config.event_id.toString()}
                        placeholder={transI18n("selectPFEvent")}
                        setSelectedCustomSet={(id) => setPfConfig({
                            ...pf_config,
                            event_id: Number(id),
                            challenge_id: mapPF[Number(id)]?.Level.slice(-1)[0]?.ID || 0,
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
                            value={pf_config.challenge_id}
                            className="select select-success"
                            onChange={(e) => setPfConfig({ ...pf_config, challenge_id: Number(e.target.value) })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectFloor")}</option>
                            {eventSelected?.Level.map((pf) => (
                                <option key={pf.ID} value={pf.ID}>{getLocaleName(locale, pf.Name)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="label">
                            <span className="label-text font-bold text-success">{transI18n("side")}:{" "}</span>
                        </label>
                        <select
                            value={pf_config.floor_side}
                            className="select select-success"
                            onChange={(e) => setPfConfig({ ...pf_config, floor_side: e.target.value })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectSide")}</option>
                            {floorSideList.map((side) => (
                                <option key={side.id} value={side.id}>{side.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="label-text font-bold text-success mb-2">{transI18n("stageId")}: {pf_config?.stage_id}</div>
                {eventSelected && (
                    <div className="mb-4 w-full">
                        <SelectCustomText
                            customSet={eventSelected.Option.map((buff) => ({
                                id: buff.ID?.toString() || "",
                                name: getLocaleName(locale, buff?.Name) || "",
                                description: replaceByParam(getLocaleName(locale, buff?.Desc) || "", buff?.Param || []),
                            }))}
                            excludeSet={[]}
                            selectedCustomSet={pf_config?.buff_id?.toString()}
                            placeholder={transI18n("selectBuff")}
                            setSelectedCustomSet={(id) => setPfConfig({ ...pf_config, buff_id: Number(id) })}
                        />
                    </div>
                )}
                <div className="pt-3 border-t border-base-content/10 space-y-2">
                    <h2 className="text-xl font-bold text-info">{transI18n("turbulenceBuff")}</h2>
                    {eventSelected && eventSelected.SubOption.length > 0 ? (
                        eventSelected.SubOption.map((subOption, index) => (
                            <div key={index} className="space-y-1">
                                <span className="font-bold text-success text-sm">{index + 1}. {getLocaleName(locale, subOption.Name)}</span>
                                <div
                                    className="text-sm text-base-content/85 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                        __html: replaceByParam(
                                            getLocaleName(locale, subOption.Desc) || "",
                                            subOption.Param || []
                                        )
                                    }}
                                />
                            </div>
                        ))
                    ) : eventSelected && challengeSelected && eventSelected.SubOption.length === 0 ? (
                        challengeSelected?.MazeBuff?.map((buff, i) => (
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

            {(pf_config?.challenge_id ?? 0) !== 0 && (
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

                                {targetEvent && Object.values(targetEvent.Infinite || []).map((waveValue, waveIndex) => (
                                    <div key={waveIndex} className="mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-xs font-bold text-base-content/70 uppercase tracking-wider">
                                                LV.{targetEvent.Level}
                                            </span>
                                            <h3 className="text-lg font-semibold text-info">{transI18n("wave")} {waveIndex + 1}</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            {Array.from(new Set(waveValue.MonsterList)).filter((id) => Boolean(id) && Number(id) !== 0).map((monsterId, enemyIndex) => {
                                                const count = waveValue.MonsterList.filter((id) => id === monsterId).length;
                                                return (
                                                    <MonsterCard
                                                        key={enemyIndex}
                                                        monsterId={monsterId}
                                                        count={count}
                                                        level={targetEvent.Level}
                                                        eliteGroup={waveValue.EliteGroup}
                                                        hardLevelGroup={targetEvent.HardLevelGroup}
                                                        invasion={targetEvent.Invasion}
                                                        invasionPercent={extraData?.setting?.invasion_percent}
                                                        locale={locale}
                                                    />
                                                );
                                            })}
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