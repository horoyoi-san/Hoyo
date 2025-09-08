"use client"
import { useEffect, useMemo } from "react";
import SelectCustomText from "../select/customSelectText";
import useEventStore from "@/stores/eventStore";
import { getLocaleName, replaceByParam } from "@/helper";
import useLocaleStore from "@/stores/localeStore";
import useUserDataStore from "@/stores/userDataStore";
import useMonsterStore from "@/stores/monsterStore";
import Image from "next/image";
import cloneDeep from 'lodash/cloneDeep'
import { useTranslations } from "next-intl";
import { MonsterStore } from "@/types";

export default function PeakBar() {
    const { PEAKEvent, mapPEAKInfo } = useEventStore()
    const { listMonster } = useMonsterStore()
    const { locale } = useLocaleStore()
    const {
        peak_config,
        setPeakConfig
    } = useUserDataStore()

    const transI18n = useTranslations("DataPage")

    const listFloor = useMemo(() => {
        if (!mapPEAKInfo?.[peak_config?.event_id?.toString()]) return []
        return [
            ...mapPEAKInfo[peak_config?.event_id?.toString()]?.PreLevel,
            mapPEAKInfo[peak_config?.event_id?.toString()]?.BossLevel,
        ]
    }, [peak_config, mapPEAKInfo])

    const eventSelected = useMemo(() => {
        return mapPEAKInfo?.[peak_config?.event_id?.toString()]
    }, [peak_config, mapPEAKInfo])

    const bossConfig = useMemo(() => {
        return mapPEAKInfo?.[peak_config?.event_id?.toString()]?.BossConfig;
    }, [peak_config, mapPEAKInfo])

    const challengeSelected = useMemo(() => {
        const challenge = cloneDeep(listFloor.find((peak) => peak.Id === peak_config.challenge_id))
        if (
            challenge
            && challenge.Id === mapPEAKInfo?.[peak_config?.event_id?.toString()]?.BossLevel?.Id
            && bossConfig
            && peak_config?.boss_mode === "Hard"
        ) {
            challenge.Name = bossConfig.HardName
            challenge.EventIDList = bossConfig.EventIDList
            challenge.InfiniteList = bossConfig.InfiniteList
            challenge.TagList = bossConfig.TagList
        }
        return challenge
    }, [peak_config, listFloor, mapPEAKInfo, bossConfig])

    useEffect(() => {
            if (!challengeSelected) return
            if (peak_config.event_id !== 0 && peak_config.challenge_id !== 0 && challengeSelected) {
                const newBattleConfig = cloneDeep(peak_config)
                newBattleConfig.cycle_count = 6
                newBattleConfig.blessings = []
                for (const value of challengeSelected.TagList) {
                    newBattleConfig.blessings.push({
                        id: Number(value.Id),
                        level: 1
                    })
                }
                if (peak_config.buff_id !== 0) {
                    newBattleConfig.blessings.push({
                        id: peak_config.buff_id,
                        level: 1
                    })
                }
                newBattleConfig.monsters = []
                newBattleConfig.stage_id = challengeSelected.EventIDList[0].StageID
                for (const wave of challengeSelected.EventIDList[0].MonsterList) {
                    if (!wave) continue
                    const newWave: MonsterStore[] = []
                    for (const value of Object.values(wave)) {
                        if (!value) continue
                        newWave.push({
                            monster_id: Number(value),
                            level: challengeSelected.EventIDList[0].Level,
                            amount: 1,
                        })
                    }
                    newBattleConfig.monsters.push(newWave)
                }

                setPeakConfig(newBattleConfig)
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            peak_config.event_id,
            peak_config.challenge_id,
            peak_config.buff_id,
            mapPEAKInfo,
        ])

    if (!PEAKEvent) return null

    return (
        <div className="container mx-auto px-4 py-8 relative">

            {/* Title Card */}
            <div className="rounded-xl p-4 mb-2 border border-warning">
                <div className="mb-4 w-full">
                    {PEAKEvent.map((peak) => (
                        <div key={peak.id}>{peak.id}</div>
                    ))}
                    <SelectCustomText
                        customSet={PEAKEvent.map((peak) => ({
                            id: peak.id,
                            name: `${getLocaleName(locale, peak)} (${peak.id}) `,
                        }))}
                        excludeSet={[]}
                        selectedCustomSet={peak_config.event_id.toString()}
                        placeholder={transI18n("selectASEvent")}
                        setSelectedCustomSet={(id) => setPeakConfig({ ...peak_config, event_id: Number(id), challenge_id: 0, buff_id: 0 })}
                    />
                </div>
                {/* Settings */}
                <div className={
                    `grid grid-cols-1 
                    ${eventSelected && eventSelected.BossLevel.Id === peak_config.challenge_id ? "md:grid-cols-2" : ""}
                    gap-4 mb-4 justify-items-center items-center w-full`}
                >

                    <div className="flex items-center gap-2 w-full">
                        <label className="label">
                            <span className="label-text font-bold text-success">{transI18n("floor")}:{" "}</span>
                        </label>
                        <select
                            value={peak_config.challenge_id}
                            className="select select-success w-full"
                            onChange={(e) => setPeakConfig({ ...peak_config, challenge_id: Number(e.target.value) })}
                        >
                            <option value={0} disabled={true}>{transI18n("selectFloor")}</option>
                            {listFloor.map((peak) => (
                                <option key={peak.Id} value={peak.Id}>{peak.Name}</option>
                            ))}
                        </select>
                    </div>
                    {eventSelected && eventSelected.BossLevel.Id === peak_config.challenge_id && (
                        <div className="flex items-center gap-2 w-full">
                            <label className="label">
                                <span className="label-text font-bold text-success">{transI18n("mode")}:{" "}</span>
                            </label>
                            <select
                                value={peak_config.boss_mode}
                                className="select select-success w-full"
                                onChange={(e) => setPeakConfig({ ...peak_config, boss_mode: e.target.value })}
                            >
                                <option value={0} disabled={true}>{transI18n("selectSide")}</option>
                                <option value="Normal">{transI18n("normalMode")}</option>
                                <option value="Hard">{transI18n("hardMode")}</option>
                            </select>
                        </div>
                    )}

                </div>
                {
                    eventSelected
                    && eventSelected.BossLevel.Id === peak_config.challenge_id
                    && bossConfig
                    && bossConfig.BuffList
                    && (
                        <div className="mb-4 w-full">
                            <SelectCustomText
                                customSet={
                                    Array.isArray(bossConfig.BuffList)
                                        ? bossConfig.BuffList.map((buff) => ({
                                            id: buff.Id.toString(),
                                            name: buff?.Name || "",
                                            description: replaceByParam(buff?.Desc || "", buff?.Param || []),
                                        }))
                                        : []
                                }
                                excludeSet={[]}
                                selectedCustomSet={peak_config?.buff_id?.toString()}
                                placeholder={transI18n("selectBuff")}
                                setSelectedCustomSet={(id) => setPeakConfig({ ...peak_config, buff_id: Number(id) })}
                            />
                        </div>
                    )
                }

                {/* Turbulence Buff */}

                <div className="bg-base-200/20 rounded-lg p-4 border border-purple-500/20">
                    <h2 className="text-2xl font-bold mb-2 text-info">
                        {transI18n("turbulenceBuff")}
                    </h2>

                    {challengeSelected && challengeSelected?.TagList?.length > 0 ? (
                        challengeSelected.TagList.map((subOption, index) => (
                            <div key={index}>
                                <label className="label">
                                    <span className="label-text font-bold text-success">
                                        {index + 1}. {subOption.Name}
                                    </span>
                                </label>
                                <div
                                    className="text-base"
                                    dangerouslySetInnerHTML={{
                                        __html: replaceByParam(
                                            subOption.Desc,
                                            subOption.Param || []
                                        )
                                    }}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="text-base">{transI18n("noTurbulenceBuff")}</div>
                    )}
                </div>
            </div>

            {/* Enemy Waves */}
            <div className="grid grid-cols-1 gap-4">

                <div className="rounded-xl p-4 mt-2 border border-warning">
                    <h2 className="text-2xl font-bold mb-6 text-info">{challengeSelected?.Name}</h2>

                    {challengeSelected && Object.values(challengeSelected.InfiniteList).map((waveValue, waveIndex) => (
                        <div key={waveIndex} className="mb-6">
                            <h3 className="text-lg font-semibold mb-t">{transI18n("wave")} {waveIndex + 1}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Array.from(new Set(waveValue.MonsterGroupIDList)).map((monsterId, enemyIndex) => (
                                    <div
                                        key={enemyIndex}
                                        className="rounded-xl p-2 border border-white/10 shadow-md hover:border-white/20 hover:shadow-lg transition"
                                    >

                                        <div className="flex items-center space-x-3">
                                            <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border border-white/10 shadow-sm">
                                                {listMonster.find((monster) => monster.child.includes(monsterId))?.icon && <Image
                                                    src={`https://api.hakush.in/hsr/UI/monstermiddleicon/${listMonster.find((monster) => monster.child.includes(monsterId))?.icon?.split("/")?.pop()?.replace(".png", "")}.webp`}
                                                    alt="Enemy Icon"
                                                    width={376}
                                                    height={512}
                                                    className="w-full h-full object-cover"
                                                />}
                                            </div>

                                            <div className="flex flex-col">
                                                <div className="text-sm font-semibold">Lv. {challengeSelected?.EventIDList[0].Level}</div>
                                                <div className="flex items-center space-x-1 mt-1">
                                                    {listMonster
                                                        .find((monster) => monster.child.includes(monsterId))
                                                        ?.weak?.map((icon, iconIndex) => (
                                                            <Image
                                                                src={`/icon/${icon.toLowerCase()}.webp`}
                                                                alt={icon}
                                                                className="h-[28px] w-[28px] 2xl:h-[40px] 2xl:w-[40px] object-contain rounded-md border border-white/20 shadow-sm"
                                                                width={200}
                                                                height={200}
                                                                key={iconIndex}
                                                            />
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}