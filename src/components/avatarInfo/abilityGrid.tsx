"use client"

import Image from "next/image"
import { createPortal } from "react-dom"
import { useState } from "react"
import { getLocaleName, replaceByParam } from "@/helper"
import type { SkillDetail } from "@/types"
import { useTranslations } from "next-intl"

type Props = {
    skills: SkillDetail[]
    skillLevels: Record<string, number>
    locale: string
    ultimateCost: number | null
    pathIcon?: string
}

type SkillSlot = "basic" | "talent" | "ultimate" | "skill" | "technique"
type PositionedSkill = {
    skill: SkillDetail
    level: number
    slot: SkillSlot | null
}
type TooltipState = {
    skill: SkillDetail
    level: number
    left: number
    top: number
}

const slotPosition: Record<SkillSlot, { column: number; row: number }> = {
    basic: { column: 1, row: 1 },
    talent: { column: 3, row: 1 },
    ultimate: { column: 2, row: 2 },
    skill: { column: 1, row: 3 },
    technique: { column: 3, row: 3 },
}

function getSkillSlot(skill: SkillDetail): SkillSlot | null {
    switch (skill.AttackType) {
        case "Normal":
            return "basic"
        case "Ultra":
            return "ultimate"
        case "BPSkill":
            return "skill"
        case "Maze":
            return "technique"
        case "Unknown":
            return skill.TypeDesc.en?.toLowerCase() === "talent" ? "talent" : null
        default:
            return null
    }
}

export default function AbilityGrid({ skills, skillLevels, locale, ultimateCost, pathIcon }: Props) {
    const transI18n = useTranslations("DataPage")
    const [activeTooltip, setActiveTooltip] = useState<TooltipState | null>(null)

    const skillsBySlot = new Map<SkillSlot, PositionedSkill>()
    for (const skill of skills) {
        if (skill.AttackType === "MazeNormal" || skill.TypeDesc.en?.toLowerCase() === "innate trace") continue

        const level = Math.max(1, ...skill.RatedSkillTreeID.map((pointId) => skillLevels[String(pointId)] ?? 0))
        const slot = getSkillSlot(skill)
        if (slot && !skillsBySlot.has(slot)) skillsBySlot.set(slot, { skill, level, slot })
    }
    const visibleSkills = [...skillsBySlot.values()]

    const openTooltip = (skill: SkillDetail, level: number, button: HTMLButtonElement) => {
        const rect = button.getBoundingClientRect()
        const width = Math.min(352, window.innerWidth - 24)
        const height = Math.min(480, window.innerHeight - 24)
        const left = window.innerWidth >= 768
            ? Math.max(12, Math.min(rect.left - width - 12, window.innerWidth - width - 12))
            : 12
        const top = Math.max(
            12,
            Math.min(rect.top + rect.height / 2 - height / 2, window.innerHeight - height - 12)
        )
        setActiveTooltip({ skill, level, left, top })
    }

    const renderSkillButton = ({ skill, level, slot }: PositionedSkill) => {
        const skillName = getLocaleName(locale, skill.Name)
        const position = slot ? slotPosition[slot] : undefined
        const button = (
            <button
                key={skill.ID}
                type="button"
                aria-label={`${getLocaleName(locale, skill.TypeDesc)}: ${skillName}`}
                aria-expanded={activeTooltip?.skill.ID === skill.ID}
                onMouseEnter={(event) => openTooltip(skill, level, event.currentTarget)}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(event) => openTooltip(skill, level, event.currentTarget)}
                onBlur={() => setActiveTooltip(null)}
                onClick={(event) => openTooltip(skill, level, event.currentTarget)}
                className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-center text-[11px] font-semibold leading-tight text-base-content transition hover:bg-base-100/10 focus-visible:outline-2 focus-visible:outline-primary"
                style={position ? { gridColumn: position.column, gridRow: position.row } : undefined}
            >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/50 bg-[#131720]/90 p-1 shadow-[0_0_12px_rgba(242,190,103,0.2)]">
                    <Image
                        src={`${process.env.CDN_URL}/${skill.Icon}`}
                        alt=""
                        width={52}
                        height={52}
                        unoptimized
                        className="h-full w-full rounded-full object-contain"
                    />
                </span>
                <span className="max-w-20">{getLocaleName(locale, skill.TypeDesc) || skillName}</span>
            </button>
        )

        return button
    }

    const activeSkill = activeTooltip?.skill
    const activeDescription = activeSkill
        ? getLocaleName(locale, activeSkill.Desc) || getLocaleName(locale, activeSkill.SimpleDesc)
        : ""
    const activeParams = activeSkill?.Level[String(activeTooltip?.level ?? 1)]?.Param ?? activeSkill?.Level["1"]?.Param ?? []

    return (
        <>
            <div className="relative mx-auto grid min-h-[250px] w-full max-w-[19rem] grid-cols-3 grid-rows-3 items-center justify-items-center gap-x-2 gap-y-2">
                {pathIcon && (
                    <Image
                        src={`${process.env.CDN_URL}/${pathIcon}`}
                        alt=""
                        width={160}
                        height={160}
                        unoptimized
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.1]"
                    />
                )}
                {visibleSkills.filter((item) => item.slot).map(renderSkillButton)}
            </div>
            {visibleSkills.some((item) => !item.slot) && (
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {visibleSkills.filter((item) => !item.slot).map(renderSkillButton)}
                </div>
            )}
            {activeTooltip && activeSkill && typeof document !== "undefined" && createPortal(
                <div
                    role="tooltip"
                    className="pointer-events-none fixed z-[10000] max-h-[min(75vh,30rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-white/10 bg-[#15171c] text-white shadow-2xl"
                    style={{ left: activeTooltip.left, top: activeTooltip.top }}
                >
                    <div className="px-4 pt-3">
                        <span className="inline-flex rounded-sm bg-emerald-700/80 px-2 py-0.5 text-[11px] font-bold">
                            {getLocaleName(locale, activeSkill.TypeDesc)}
                        </span>
                        <div className="mt-2 flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold">{getLocaleName(locale, activeSkill.Name)}</h3>
                            <span className="shrink-0 text-[11px] text-white/70">Lv. {activeTooltip.level}</span>
                        </div>
                        {getLocaleName(locale, activeSkill.Tag) && (
                            <p className="text-[11px] text-amber-200/80">[{getLocaleName(locale, activeSkill.Tag)}]</p>
                        )}
                    </div>
                    {(activeSkill.AttackType === "Ultra" && ultimateCost != null || activeSkill.StanceDamageDisplay > 0) && (
                        <div className="mx-4 mt-2 border-y border-white/10 text-[11px]">
                            {activeSkill.AttackType === "Ultra" && ultimateCost != null && (
                                <div className="flex justify-between gap-3 py-1">
                                    <span>{transI18n("energyCost")}</span>
                                    <span className="font-mono text-amber-300">{ultimateCost}</span>
                                </div>
                            )}
                            {activeSkill.StanceDamageDisplay > 0 && (
                                <div className="flex justify-between gap-3 py-1">
                                    <span>{transI18n("toughnessReduction")}</span>
                                    <span className="font-mono text-amber-300">{activeSkill.StanceDamageDisplay}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div
                        className="px-4 py-3 text-xs leading-relaxed text-white/90"
                        dangerouslySetInnerHTML={{ __html: replaceByParam(activeDescription, activeParams) }}
                    />
                </div>,
                document.body
            )}
        </>
    )
}
