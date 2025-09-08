"use client"

import { useTranslations } from "next-intl";
import useAvatarStore from "@/stores/avatarStore";
import { useCallback, useMemo } from "react";
import { traceButtonsInfo, traceLink } from "@/constant/traceConstant";
import useUserDataStore from "@/stores/userDataStore";
import useLocaleStore from "@/stores/localeStore";
import Image from "next/image";
import { replaceByParam } from "@/helper";
import { mappingStats } from "@/constant/constant";
import { StatusAddType } from "@/types";
import cloneDeep from "lodash/cloneDeep";
import { toast } from "react-toastify";

export default function SkillsInfo() {
    const transI18n = useTranslations("DataPage")
    const { theme } = useLocaleStore()
    const { avatarSelected, mapAvatarInfo, skillSelected, setSkillSelected } = useAvatarStore()
    const { avatars, setAvatar } = useUserDataStore()

    const traceButtons = useMemo(() => {
        if (!avatarSelected) return
        return traceButtonsInfo[avatarSelected.baseType]
    }, [avatarSelected])

    const avatarInfo = useMemo(() => {
        if (!avatarSelected) return
        return mapAvatarInfo[avatarSelected.id]
    }, [avatarSelected, mapAvatarInfo])

    const avatarData = useMemo(() => {
        if (!avatarSelected) return
        return avatars[avatarSelected.id]
    }, [avatarSelected, avatars])

    const avatarSkillTree = useMemo(() => {
        if (!avatarSelected || !avatars[avatarSelected.id]) return {}
        if (avatars[avatarSelected.id].enhanced) {
            return avatarInfo?.Enhanced[avatars[avatarSelected.id].enhanced.toString()].SkillTrees || {}
        }
        return avatarInfo?.SkillTrees || {}
    }, [avatarSelected, avatarInfo, avatars])

    const skillInfo = useMemo(() => {
        if (!avatarSelected || !skillSelected) return
        return avatarSkillTree?.[skillSelected || ""]?.["1"]
    }, [avatarSelected, avatarSkillTree, skillSelected])

    const getImageSkill = useCallback((icon: string | undefined, status: StatusAddType | undefined) => {
        if (!icon) return
        if (icon.startsWith("SkillIcon")) {
            if (Number(avatarSelected?.id) > 8000 && Number(avatarSelected?.id) % 2 === 0) {
                return `https://homdgcat.wiki/images/skillicons/avatar/${Number(avatarSelected?.id) - 1}/${icon.replaceAll(avatarSelected?.id || "", (Number(avatarSelected?.id) - 1).toString())}`
            }
            return `https://homdgcat.wiki/images/skillicons/avatar/${avatarSelected?.id}/${icon}`
        } else if (status && mappingStats[status.PropertyType]) {
            return mappingStats[status.PropertyType].icon
        }
        else if (icon.startsWith("Icon")) {
            return `https://api.hakush.in/hsr/UI/trace/${icon.replace(".png", ".webp")}`
        }
    }, [avatarSelected])

    const getTraceBuffDisplay = useCallback((status: StatusAddType) => {
        const dataDisplay = mappingStats[status.PropertyType]
        if (!dataDisplay) return ""
        if (dataDisplay.unit === "%") {
            return `${(status.Value * 100).toFixed(1)}${dataDisplay.unit}`
        }
        if (dataDisplay.name === "SPD") {
            return `${status.Value.toFixed(1)}${dataDisplay.unit}`
        }
        return `${status.Value.toFixed(0)}${dataDisplay.unit}`
    }, [])

    const dataLevelUpSkill = useMemo(() => {
        const skillIds: number[] = skillInfo?.LevelUpSkillID || []
        if (!avatarSelected || !avatarInfo || !avatarData) return
        let result = Object.values(avatarInfo.Skills || {})?.filter((skill) => skillIds.includes(skill.Id))
        if (avatarData.enhanced) {
            result = Object.values(avatarInfo.Enhanced[avatarData.enhanced.toString()].Skills || {})?.filter((skill) => skillIds.includes(skill.Id))
        }
        if (result && result.length > 0) {
            return {
                isServant: false, 
                data: result,
                servantData: null,
            }
        }
        const resultServant = Object.entries(avatarInfo.Memosprite?.Skills || {})
            ?.filter(([skillId]) => skillIds.includes(Number(skillId)))
            ?.map(([skillId, skillData]) => ({
                Id: Number(skillId),
                ...skillData,
            }))
        if (resultServant && resultServant.length > 0) {
            return {
                isServant: true,
                data: resultServant,
                servantData: avatarInfo.Memosprite,
            }
        }
        return undefined
    }, [skillInfo?.LevelUpSkillID, avatarSelected, avatarInfo, avatarData])


    const handlerMaxAll = () => {
        if (!avatarInfo || !avatarData || !avatarSkillTree) {
            toast.error(transI18n("maxAllFailed"))
            return
        }
        const newData = cloneDeep(avatarData)
        newData.data.skills = Object.values(avatarSkillTree).reduce((acc, dataPointEntry) => {
            const firstEntry = Object.values(dataPointEntry)[0];
            if (firstEntry) {
                acc[firstEntry.PointID] = firstEntry.MaxLevel;
            }
            return acc;
        }, {} as Record<string, number>)
        toast.success(transI18n("maxAllSuccess"))
        setAvatar(newData)
    }

    const handlerChangeStatusTrace = (status: boolean) => {
        if (!avatarData || !skillInfo) return
        const newData = cloneDeep(avatarData)
        newData.data.skills[skillInfo?.PointID] = status ? 1 : 0

        if (!status && traceLink?.[avatarSelected?.baseType || ""]?.[skillSelected || ""]) {
            traceLink[avatarSelected?.baseType || ""][skillSelected || ""].forEach((pointId) => {
                if (avatarSkillTree?.[pointId]?.["1"]) {
                    newData.data.skills[avatarSkillTree?.[pointId]?.["1"].PointID] = 0
                }
            })
        }
        setAvatar(newData)
    }

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-xl p-6 shadow-lg">
                    <h2 className="flex items-center gap-2 text-2xl font-bold mb-6 text-base-content">
                        <div className="w-2 h-6 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                        {transI18n("skills")}
                    </h2>
                    <div className="flex flex-col items-center">
                        <button className="btn btn-success" onClick={handlerMaxAll}>{transI18n("maxAll")}</button>
                        {traceButtons && avatarInfo && (
                            <div className="grid col-span-4 relative w-full aspect-square">
                                <Image
                                    src={`/skilltree/${avatarSelected?.baseType?.toUpperCase()}.webp`}
                                    alt=""
                                    width={612}
                                    priority={true}
                                    height={612}
                                    style={{
                                        filter: (theme === "winter" || theme === "cupcake") ? "invert(1)" : "none"
                                    }}
                                    className={`w-full h-full object-cover rounded-xl`}
                                />
                                {traceButtons.map((btn, index) => (
                                    <div
                                        key={`${btn.id} + ${index}`}
                                        id={btn.id}
                                        className={`
                                            absolute rounded-full border border-black 
                                            bg-no-repeat bg-contain 
                                            cursor-pointer transition-all duration-200 ease-in-out 
                                            shadow-[0_0_5px_white] flex justify-center items-center 
                                            hover:scale-110
                                            ${btn.size === "small" ? "w-[2vw] h-[2vw] bg-white" : ""}
                                            ${btn.size === "medium" ? "w-[3vw] h-[3vw] bg-white" : ""}
                                            ${btn.size === "big" ? "w-[3.5vw] h-[3.5vw] bg-black" : ""}
                                            ${skillSelected === btn.id ? "border-4 border-primary" : ""}
                                            ${avatarData?.data.skills?.[avatarSkillTree?.[btn.id]?.["1"]?.PointID] === 0 ? "opacity-50 cursor-not-allowed" : ""}
                                        `}
                                        onClick={() => {
                                            setSkillSelected(btn.id === skillSelected ? null : btn.id)
                                        }}
                                        style={{
                                            left: `calc(${btn.left} - var(--size-${btn.size}) / 2)`,
                                            top: `calc(${btn.top} - var(--size-${btn.size}) / 2)`,
                                        }}
                                    >
                                        <Image
                                            src={getImageSkill(avatarInfo?.SkillTrees?.[btn.id]?.["1"]?.Icon, avatarSkillTree?.[btn.id]?.["1"]?.StatusAddList[0]) || ""}
                                            alt={btn.id.replaceAll("Point", "")}
                                            priority={true}
                                            width={124}
                                            height={124}
                                            style={{
                                                filter: btn.size !== "big"
                                                    ? 'brightness(0%)'
                                                    : 'brightness(200%)'
                                            }}
                                        />
                                        {btn.size === "big" && (
                                            <p className="text-xs md:text-base font-bold text-center rounded-full absolute bottom-[-1.4vw] left-1/2 transform -translate-x-1/2">{`${avatarData?.data.skills?.[avatarSkillTree?.[btn.id]?.["1"]?.PointID]}/${avatarSkillTree?.[btn.id]?.["1"]?.MaxLevel}`}</p>
                                        )}
                                    </div>


                                ))}
                            </div>
                        )}
                    </div>

                </div>
                <div className="bg-base-100 rounded-xl p-6 shadow-lg">
                    <h2 className="flex items-center gap-2 text-2xl font-bold mb-6 text-base-content">
                        <div className="w-2 h-6 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                        {transI18n("details")}
                    </h2>
                    {skillSelected && avatarInfo?.SkillTrees && avatarData && (
                        <div>
                            {skillInfo?.MaxLevel && skillInfo?.MaxLevel > 1 ? (
                                <div>
                                    <div className="font-bold text-success">{transI18n("level")}</div>
                                    <div className="w-full max-w-xs">
                                        <input type="range"
                                            min={1}
                                            max={skillInfo?.MaxLevel || 1}
                                            value={avatarData?.data.skills?.[skillInfo?.PointID] || 1}
                                            onChange={(e) => {
                                                const newData = cloneDeep(avatarData)
                                                newData.data.skills[skillInfo?.PointID] = parseInt(e.target.value)
                                                setAvatar(newData)
                                            }}
                                            className="range range-success"
                                            step="1" />
                                        <div className="flex justify-between px-2.5 mt-2 text-xs">
                                            {Array.from({ length: skillInfo?.MaxLevel }, (_, index) => index + 1).map((index) => (
                                                <span key={index}>{index}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : skillInfo?.MaxLevel && skillInfo?.MaxLevel === 1 && traceButtons?.find((btn) => btn.id === skillSelected)?.size !== "big" ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={avatarData?.data.skills?.[skillInfo?.PointID] === 1}
                                        className="toggle toggle-success"
                                        onChange={(e) => {
                                            handlerChangeStatusTrace(e.target.checked)
                                        }}
                                    />
                                    <div className="font-bold text-success">
                                        {avatarData?.data.skills?.[skillInfo?.PointID] === 1 ? transI18n("active") : transI18n("inactive")}
                                    </div>
                                </div>
                            ) : (
                                null
                            )}

                            {((skillInfo?.PointName && skillInfo?.PointDesc) ||
                                (skillInfo?.PointName && skillInfo?.StatusAddList.length > 0))
                                && (
                                    <div className="text-xl font-bold flex items-center gap-2 mt-2">
                                        {skillInfo.PointName}
                                        {skillInfo.StatusAddList.length > 0 && (
                                            <div>
                                                {skillInfo.StatusAddList.map((status, index) => (
                                                    <div key={index}>
                                                        <div className="text-xl font-bold">{getTraceBuffDisplay(status)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                            {skillInfo?.PointDesc && (
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: replaceByParam(
                                            skillInfo?.PointDesc || "",
                                            skillInfo?.ParamList || []
                                        )
                                    }}
                                />
                            )}

                            {skillInfo?.LevelUpSkillID
                                && skillInfo?.LevelUpSkillID.length > 0
                                && dataLevelUpSkill
                                && (
                                    <div className="mt-2 flex flex-col gap-2">

                                        {dataLevelUpSkill?.data?.map((skill, index) => (
                                            <div key={index}>

                                                <div className="text-xl font-bold text-primary">
                                                    {transI18n(dataLevelUpSkill.isServant ? `${skill?.Type ? "severaltalent" : "servantskill"}` : `${skill?.Type ? skill?.Type.toLowerCase() : "talent"}`)}
                                                    {` (${transI18n(skill.Tag.toLowerCase())})`}
                                                </div>

                                                <div className="text-lg font-bold" dangerouslySetInnerHTML={{ __html: replaceByParam(skill.Name, []) }}>

                                                </div>

                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: replaceByParam(
                                                            skill.Desc || skill.SimpleDesc,
                                                            skill.Level[avatarData?.data.skills?.[skillInfo?.PointID]?.toString() || ""]?.ParamList || []
                                                        )
                                                    }}
                                                />
                                            </div>
                                        ))}

                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}