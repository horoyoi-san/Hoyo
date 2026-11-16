"use client";
import { useMemo, useState } from "react";
import {
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Search,
    CopyPlus,
} from "lucide-react";

import useUserDataStore from "@/stores/userDataStore";
import useLocaleStore from "@/stores/localeStore";
import { getLocaleName } from "@/helper";
import Image from "next/image";
import { useTranslations } from "next-intl";
import useGlobalStore from "@/stores/globalStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { MonsterDetail } from "@/types";
import { useShallow } from "zustand/react/shallow";

export default function CeBar() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearchWaveId, setShowSearchWaveId] = useState<number | null>(null);
    const { ce_config, setCeConfig } = useUserDataStore(
        useShallow((state) => ({
            ce_config: state.ce_config,
            setCeConfig: state.setCeConfig,
        }))
    )
    const { mapMonster, stage, damageType } = useDetailDataStore(
        useShallow((state) => ({
            mapMonster: state.mapMonster,
            stage: state.stage,
            damageType: state.damageType,
        }))
    )
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const transI18n = useTranslations("DataPage")
    const [showSearchStage, setShowSearchStage] = useState(false)
    const [stageSearchTerm, setStageSearchTerm] = useState("")
    const [stagePage, setStagePage] = useState(1)
    const { extraData, setExtraData } = useGlobalStore(
        useShallow((state) => ({
            extraData: state.extraData,
            setExtraData: state.setExtraData,
        }))
    )

    const pageSize = 30

    const pageSizeMonsters = 30
    const [monsterPage, setMonsterPage] = useState(1)

    const filteredMonsters = useMemo(() => {
        const newlistMonster = new Set<MonsterDetail>()
        for (const monster of Object.values(mapMonster)) {
            if (getLocaleName(locale, monster.Name).toLowerCase().includes(searchTerm.toLowerCase())) {
                newlistMonster.add(monster)
            }
            if (monster.ID.toString().includes(searchTerm.toLowerCase())) {
                newlistMonster.add(monster)
            }
        }
        return Array.from(newlistMonster)
    }, [locale, searchTerm, mapMonster]);

    const paginatedMonsters = useMemo(() =>
        filteredMonsters.slice((monsterPage - 1) * pageSizeMonsters, monsterPage * pageSizeMonsters),
        [filteredMonsters, monsterPage]
    )

    const hasMoreMonsterPages = useMemo(
        () => monsterPage * pageSizeMonsters < filteredMonsters.length,
        [monsterPage, filteredMonsters]
    )

    const stageList = useMemo(() => Object.values(stage).map((item) => ({
        id: item.ID.toString(),
        name: `${getLocaleName(locale, item.Name)} (${item.ID})`,
    })), [stage, locale])

    const filteredStages = useMemo(() => stageList.filter((s) =>
        s.name.toLowerCase().includes(stageSearchTerm.toLowerCase())
    ), [stageList, stageSearchTerm])

    const paginatedStages = useMemo(() => filteredStages.slice(
        (stagePage - 1) * pageSize,
        stagePage * pageSize
    ), [filteredStages, stagePage, pageSize])

    const hasMorePages = useMemo(() => stagePage * pageSize < filteredStages.length, [stagePage, filteredStages])



    return (
        <div className="z-4 pt-4 pb-2 h-full w-full space-y-4" onClick={() => {
            setShowSearchWaveId(null)
            setShowSearchStage(false)
        }}>

            <div className="w-full relative">
                <div className="flex items-center justify-center gap-2">
                    <button
                        className="btn btn-outline btn-warning w-full text-left flex items-center gap-2.5 rounded-xl shadow-xs"
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowSearchStage(!showSearchStage)
                        }}
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-left font-medium"> {transI18n("stage")}: {stageList.find((s) => s.id === ce_config.stage_id.toString())?.name || transI18n("selectStage")}</span>
                    </button>
                </div>
                {showSearchStage && (
                    <div onClick={(e) => e.stopPropagation()} className="absolute top-full mt-2 w-full z-50 rounded-2xl border border-base-content/15 bg-base-200/95 p-4 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-2">

                            <label className="input w-full">
                                <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <g
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        strokeWidth="2.5"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.3-4.3"></path>
                                    </g>
                                </svg>
                                <input
                                    value={stageSearchTerm}
                                    onChange={(e) => {
                                        setStageSearchTerm(e.target.value)
                                        setStagePage(1)
                                    }}
                                    type="search"
                                    required
                                    placeholder={transI18n("searchStage")}
                                />
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[48vh] overflow-y-auto pr-1">
                            {paginatedStages.length > 0 ? (
                                paginatedStages.map((stage) => (
                                    <button
                                        key={stage.id}
                                        className="btn btn-sm btn-outline justify-start"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (ce_config.stage_id !== Number(stage.id)) {
                                                setCeConfig({ ...ce_config, stage_id: Number(stage.id), cycle_count: 30 })
                                            }
                                            setShowSearchStage(false)
                                            setStageSearchTerm("")
                                        }}
                                    >
                                        <span className="truncate">{stage.name}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-sm text-center py-4">{transI18n("noStageFound")}</div>
                            )}
                        </div>
                        {paginatedStages.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                <button
                                    disabled={stagePage === 1}
                                    className="btn btn-sm btn-outline btn-success"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setStagePage(stagePage - 1)
                                    }}
                                >
                                    {transI18n("previous")}
                                </button>

                                <button
                                    disabled={!hasMorePages}
                                    className="btn btn-sm btn-outline btn-success"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setStagePage(stagePage + 1)
                                    }}
                                >
                                    {transI18n("next")}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="relative w-full space-y-4">
                {ce_config.monsters.map((wave, waveIndex) => (
                    <div key={waveIndex} className="rounded-2xl border border-warning/25 bg-base-100/35 p-4 shadow-lg backdrop-blur-sm">
                        <div className="w-full">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-base-content/10 pb-3">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-base-content">
                                    <span className="rounded-lg border border-info/20 bg-info/10 px-2.5 py-1 text-info">
                                        {transI18n("wave")} {waveIndex + 1}
                                    </span>
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        disabled={waveIndex === 0}
                                        onClick={(e) => {
                                            e.stopPropagation()

                                            const newCeConfig = structuredClone(ce_config)
                                            const waves = newCeConfig.monsters
                                            const temp = waves[waveIndex - 1]
                                            waves[waveIndex - 1] = waves[waveIndex]
                                            waves[waveIndex] = temp

                                            setCeConfig(newCeConfig)
                                        }}
                                        className="btn btn-sm btn-success"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>

                                    <button
                                        disabled={waveIndex === ce_config.monsters.length - 1}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const newCeConfig = structuredClone(ce_config)
                                            const waves = newCeConfig.monsters
                                            const temp = waves[waveIndex + 1]
                                            waves[waveIndex + 1] = waves[waveIndex]
                                            waves[waveIndex] = temp

                                            setCeConfig(newCeConfig)
                                        }}
                                        className="btn btn-sm btn-success">
                                        <ChevronDown className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const newCeConfig = structuredClone(ce_config)
                                            const waves = newCeConfig.monsters
                                            const temp = waves[waveIndex]
                                            newCeConfig.monsters.push([...temp])
                                            setCeConfig(newCeConfig)
                                        }}
                                        className="btn btn-sm btn-success">
                                        <CopyPlus className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const newCeConfig = structuredClone(ce_config)
                                            newCeConfig.monsters.splice(waveIndex, 1)
                                            setCeConfig(newCeConfig)
                                        }}
                                        className="btn btn-sm btn-error">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full h-full">
                                {wave.map((member, memberIndex) => (
                                    <div key={memberIndex} className="relative group z-7 w-full h-full">
                                        <div className="card h-full w-full rounded-xl border border-base-content/10 bg-base-100/55 shadow-md transition-all hover:border-primary/35 hover:shadow-lg">
                                            <div className="card-body p-4">
                                                <button
                                                    className="btn btn-xs btn-success absolute -top-2 right-12 opacity-50 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        const newCeConfig = structuredClone(ce_config)

                                                        newCeConfig.monsters[waveIndex].push({
                                                            monster_id: Number(member.monster_id),
                                                            level: member.level,
                                                            amount: member.amount,
                                                        })
                                                        setCeConfig(newCeConfig)
                                                    }}
                                                >
                                                    <CopyPlus className="w-3 h-3" />
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-error absolute -top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        const newCeConfig = structuredClone(ce_config)
                                                        newCeConfig.monsters[waveIndex].splice(memberIndex, 1)
                                                        setCeConfig(newCeConfig)
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>

                                                <div className="flex justify-center">
                                                    {mapMonster?.[member.monster_id.toString()]?.Image?.IconPath && <Image
                                                        unoptimized
                                                        src={`${process.env.CDN_URL}/${mapMonster?.[member.monster_id.toString()]?.Image?.IconPath}`}
                                                        alt={transI18n("enemy")}
                                                        width={376}
                                                        height={512}
                                                        className=" object-contain w-20 h-20 overflow-hidden"
                                                    />}
                                                </div>

                                                <div className="flex flex-wrap justify-center gap-1 mb-2">
                                                    {mapMonster?.[member.monster_id.toString()]?.StanceWeakList?.map((icon, iconIndex) => (
                                                        <Image
                                                            unoptimized
                                                            src={`${process.env.CDN_URL}/${damageType[icon]?.Icon}`}
                                                            alt={icon}
                                                            className="h-7 w-7 2xl:h-10 2xl:w-10 object-contain rounded-md border border-white/20 shadow-sm"
                                                            width={200}
                                                            height={200}
                                                            key={iconIndex}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="text-center flex flex-col items-center justify-center">
                                                    <div className="text-sm font-medium">
                                                        {getLocaleName(locale, mapMonster?.[member.monster_id.toString()]?.Name)}  {`(${member.monster_id})`}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1 mx-2">
                                                        <span className="text-sm">LV.</span>
                                                        <input
                                                            type="number"
                                                            className="text-center input input-sm"
                                                            value={member.level}

                                                            onChange={(e) => {
                                                                const val = Number(e.target.value)
                                                                if (isNaN(val) || val < 1 || val > 95) return
                                                                if (ce_config.monsters[waveIndex][memberIndex].level === val) return

                                                                const newCeConfig = structuredClone(ce_config)
                                                                newCeConfig.monsters[waveIndex][memberIndex].level = val
                                                                setCeConfig(newCeConfig)
                                                            }}
                                                        />
                                                    </div>
                                                    {(extraData?.theory_craft?.mode === true && (
                                                        <div className="flex items-center gap-1 mt-1 mx-2">
                                                            <span className="text-sm">HP</span>
                                                            <input
                                                                type="number"
                                                                className="text-center input input-sm"
                                                                value={extraData?.theory_craft?.hp?.[(waveIndex + 1).toString()]?.[memberIndex] || 0}

                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value)
                                                                    if (isNaN(val) || val < 0) return

                                                                    const newData = structuredClone(extraData)

                                                                    if (!newData?.theory_craft?.hp?.[(waveIndex + 1).toString()]) {
                                                                        newData.theory_craft!.hp![(waveIndex + 1).toString()] = []
                                                                    }

                                                                    newData.theory_craft!.hp![(waveIndex + 1).toString()][memberIndex] = val

                                                                    setExtraData(newData)
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div
                                    className="relative flex items-start justify-center w-full h-full"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        className="btn btn-outline btn-primary min-h-48 w-full h-full rounded-xl border-dashed bg-primary/5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (showSearchWaveId === waveIndex) {
                                                setShowSearchWaveId(null)
                                                return
                                            }

                                            setShowSearchWaveId(waveIndex)
                                        }}
                                    >
                                        <Plus className="w-8 h-8" />
                                    </button>

                                    {showSearchWaveId === waveIndex && (
                                        <div className="absolute top-full mt-2 z-50 w-72 rounded-2xl border border-base-content/15 bg-base-200/95 p-4 shadow-2xl backdrop-blur-xl">
                                            <div className="flex items-center gap-2 mb-2">

                                                <label className="input w-full">
                                                    <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                        <g
                                                            strokeLinejoin="round"
                                                            strokeLinecap="round"
                                                            strokeWidth="2.5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                        >
                                                            <circle cx="11" cy="11" r="8"></circle>
                                                            <path d="m21 21-4.3-4.3"></path>
                                                        </g>
                                                    </svg>
                                                    <input
                                                        type="search" className="grow"
                                                        placeholder={transI18n("searchMonster")}
                                                        value={searchTerm}
                                                        onChange={(e) => {
                                                            setSearchTerm(e.target.value)
                                                            setMonsterPage(1)
                                                        }}
                                                        autoFocus
                                                    />

                                                </label>

                                            </div>

                                            <div className="max-h-60 overflow-y-auto space-y-1">
                                                {paginatedMonsters.length > 0 ? (
                                                    paginatedMonsters.map((monster) => (
                                                        <div
                                                            key={monster.ID}
                                                            className="flex items-center gap-2 p-2 hover:bg-success/40 rounded cursor-pointer"
                                                            onClick={() => {
                                                                const newCeConfig = structuredClone(ce_config)
                                                                newCeConfig.monsters[waveIndex].push({
                                                                    monster_id: monster.ID,
                                                                    level: 95,
                                                                    amount: 1,
                                                                })
                                                                setCeConfig(newCeConfig)
                                                                setShowSearchWaveId(null)
                                                            }}
                                                        >
                                                            <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 shadow-sm">
                                                                {mapMonster?.[monster.ID.toString()]?.Image?.IconPath && (
                                                                    <Image
                                                                        unoptimized
                                                                        src={`${process.env.CDN_URL}/${mapMonster?.[monster.ID.toString()]?.Image?.IconPath}`}
                                                                        alt={transI18n("enemy")}
                                                                        width={376}
                                                                        height={512}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                )}
                                                            </div>
                                                            <span>{getLocaleName(locale, monster.Name)} {`(${monster.ID})`}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-center py-4">
                                                        {transI18n("noMonstersFound")}
                                                    </div>
                                                )}
                                            </div>

                                            {filteredMonsters.length > 0 && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                    <button
                                                        disabled={monsterPage === 1}
                                                        className="btn btn-sm btn-outline btn-success"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setMonsterPage(monsterPage - 1)
                                                        }}
                                                    >
                                                        {transI18n("previous")}
                                                    </button>

                                                    <button
                                                        disabled={!hasMoreMonsterPages}
                                                        className="btn btn-sm btn-outline btn-success"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setMonsterPage(monsterPage + 1)
                                                        }}
                                                    >
                                                        {transI18n("next")}
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => {
                        const newCeConfig = structuredClone(ce_config)
                        newCeConfig.monsters.push([])
                        setCeConfig(newCeConfig)
                    }}
                    className="btn btn-outline btn-warning w-full flex items-center justify-center gap-2 rounded-xl shadow-xs font-semibold"
                >
                    <Plus className="w-4 h-4" />
                    <span>{transI18n("addNewWave")}</span>
                </button>
            </div>
        </div>
    );
}
