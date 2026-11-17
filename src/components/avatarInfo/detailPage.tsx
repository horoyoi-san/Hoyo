"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Image as ImageIcon, Maximize2, Plus, Sparkles, Star, User, X, Zap } from "lucide-react"
import ParseText from "../parseText"
import AbilityGrid from "./abilityGrid"
import useCurrentDataStore from "@/stores/currentDataStore"
import useDetailDataStore from "@/stores/detailDataStore"
import useLocaleStore from "@/stores/localeStore"
import useUserDataStore from "@/stores/userDataStore"
import { calcCharacterTotalStats, calcPromotion, calcRarity, getDamageTypeIconPath } from "@/helper"
import { getLocaleName, getNameChar } from "@/helper/getName"
import { getSkillTree } from "@/helper/getSkillTree"
import { useShallow } from "zustand/react/shallow"
import type { CalculatedStat } from "@/helper/calcCharacterStats"

type ArtType = "gacha" | "cutinCard" | "cutinFigure" | "portrait"
type DetailTab = "stats" | "ability"

const artOptions: { value: ArtType; label: string; Icon: typeof Sparkles }[] = [
    { value: "gacha", label: "Splash Art", Icon: Sparkles },
    { value: "cutinCard", label: "Card Art", Icon: ImageIcon },
    { value: "cutinFigure", label: "Cutout", Icon: User },
    { value: "portrait", label: "Portrait", Icon: Maximize2 },
]

const summaryStatKeys = ["HP", "ATK", "DEF", "SPD", "CRITRate", "CRITDmg"]
const baseStatKeys = new Set(["HP", "ATK", "DEF", "SPD"])

export default function DetailPage() {
    const avatarSelected = useCurrentDataStore((state) => state.avatarSelected)
    const router = useRouter()
    const {
        mapAvatar,
        mapLightCone,
        baseType,
        damageType,
        mainAffix,
        subAffix,
        mapRelicSet,
    } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            mapLightCone: state.mapLightCone,
            baseType: state.baseType,
            damageType: state.damageType,
            mainAffix: state.mainAffix,
            subAffix: state.subAffix,
            mapRelicSet: state.mapRelicSet,
        }))
    )
    const { locale } = useLocaleStore(useShallow((state) => ({ locale: state.locale })))
    const transI18n = useTranslations("DataPage")
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    )
    const [isArtModalOpen, setIsArtModalOpen] = useState(false)
    const [artType, setArtType] = useState<ArtType>("gacha")
    const [detailTab, setDetailTab] = useState<DetailTab>("stats")
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
    const [showCharacterSettings, setShowCharacterSettings] = useState(false)

    const userAvatar = avatars[avatarSelected?.ID ?? ""]
    const avatarProfile = useMemo(() => {
        if (!userAvatar) return undefined
        return userAvatar.profileList?.[userAvatar.profileSelect] ?? userAvatar.profileList?.[0]
    }, [userAvatar])
    const lightcone = avatarProfile?.lightcone ?? null
    const lightconeDetail = useMemo(() => {
        if (!mapLightCone || !lightcone?.item_id) return null
        return mapLightCone[lightcone.item_id.toString()] ?? null
    }, [lightcone, mapLightCone])
    const characterStats = useMemo(() => calcCharacterTotalStats({
        avatarSelected,
        avatarData: userAvatar,
        avatarProfile,
        mapAvatar,
        mapLightCone,
        mainAffix,
        subAffix,
        mapRelicSet,
        transI18n,
    }), [
        avatarSelected,
        userAvatar,
        avatarProfile,
        mapAvatar,
        mapLightCone,
        mainAffix,
        subAffix,
        mapRelicSet,
        transI18n,
    ])
    const abilityList = useMemo(() => {
        if (!avatarSelected) return []
        const skills = userAvatar?.enhanced
            ? avatarSelected.Enhanced?.[userAvatar.enhanced]?.Skills ?? avatarSelected.Skills
            : avatarSelected.Skills
        return Object.values(skills ?? {})
    }, [avatarSelected, userAvatar])

    const formatStatValue = (stat: CalculatedStat) =>
        stat.unit === "%"
            ? `${(stat.value * 100).toFixed(stat.round)}${stat.unit}`
            : `${stat.value.toFixed(stat.round)}${stat.unit}`

    const renderStatRow = (key: string) => {
        const stat = characterStats?.[key]
        if (!stat) return null

        return (
            <div key={key} className="flex min-w-0 items-center justify-between gap-2 border-b border-base-content/10 py-0.5 text-[11px] even:bg-base-100/15">
                <div className="flex min-w-0 items-center gap-2">
                    <Image
                        src={`${process.env.CDN_URL}/${stat.icon}`}
                        unoptimized
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4 shrink-0 object-contain theme-stat-icon"
                    />
                    <span className="truncate font-medium">{stat.name}</span>
                </div>
                <span className="shrink-0 font-mono font-semibold text-primary">{formatStatValue(stat)}</span>
            </div>
        )
    }

    const handleShowLightcone = () => {
        if (!avatarSelected) return
        router.push("/lightcone", { scroll: false })
    }

    useEffect(() => {
        if (!isArtModalOpen) return
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsArtModalOpen(false)
        }
        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [isArtModalOpen])

    if (!avatarSelected || !userAvatar) return null

    const openArt = () => {
        setArtType("gacha")
        setIsArtModalOpen(true)
    }
    const artImagePath =
        artType === "cutinFigure" && avatarSelected.Image.AvatarCutinImgPath
            ? avatarSelected.Image.AvatarCutinImgPath
            : artType === "cutinCard" && avatarSelected.Image.AvatarCutinFrontImgPath
                ? avatarSelected.Image.AvatarCutinFrontImgPath
                : artType === "portrait"
                    ? avatarSelected.Image.AvatarIconPath
                    : avatarSelected.Image.AvatarGachaResultImgPath || avatarSelected.Image.AvatarIconPath
    const artImageSrc = `${process.env.CDN_URL}/${artImagePath}`

    return (
        <div className="w-full">
            <div className="detail-page-layout grid min-h-[560px] w-full grid-cols-1 gap-10 lg:h-[calc(100dvh-13rem)] lg:min-h-[420px]">
                <section
                    className="group relative flex min-h-[440px] items-center justify-center overflow-x-clip overflow-y-visible lg:h-full lg:min-h-0 lg:overflow-x-visible"
                    aria-label={getNameChar(locale, transI18n, avatarSelected)}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(63,91,157,0.2),transparent_68%)]" />
                    {avatarSelected.Image.AvatarCutinBgImgPath && (
                        <Image
                            src={`${process.env.CDN_URL}/${avatarSelected.Image.AvatarCutinBgImgPath}`}
                            alt=""
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 70vw, 100vw"
                            className="pointer-events-none translate-y-16 scale-[1.1] object-contain opacity-55"
                        />
                    )}
                    {avatarSelected.Image.AvatarCutinImgPath ? (
                        <Image
                            src={`${process.env.CDN_URL}/${avatarSelected.Image.AvatarCutinImgPath}`}
                            alt={getNameChar(locale, transI18n, avatarSelected)}
                            fill
                            unoptimized
                            priority
                            sizes="(min-width: 1280px) 70vw, 100vw"
                            className="pointer-events-none translate-y-16 scale-[1.2] object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]"
                        />
                    ) : (
                        <Image
                            src={`${process.env.CDN_URL}/${avatarSelected.Image.AvatarGachaResultImgPath || avatarSelected.Image.AvatarIconPath}`}
                            alt={getNameChar(locale, transI18n, avatarSelected)}
                            fill
                            unoptimized
                            priority
                            sizes="(min-width: 1280px) 70vw, 100vw"
                            className="pointer-events-none translate-y-16 scale-[1.2] object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]"
                        />
                    )}
                    <button
                        type="button"
                        onClick={openArt}
                        aria-label="View character artwork"
                        title="View character artwork"
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/45 text-white/80 opacity-70 backdrop-blur-md transition hover:scale-105 hover:opacity-100"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </button>
                </section>

                <aside className="flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0">
                    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-transparent p-1">
                        <div className="mb-2 border-b border-base-content/10 pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h2 className="flex items-center gap-2 truncate text-lg font-bold text-base-content">
                                        <Star aria-hidden="true" className="h-4 w-4 shrink-0" />
                                        <ParseText locale={locale} text={getNameChar(locale, transI18n, avatarSelected)} />
                                    </h2>
                                    <div className="mt-1 flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/10 px-1.5 py-0.5 text-[11px]">
                                        {baseType?.[avatarSelected.BaseType]?.Icon && (
                                            <Image
                                                src={`${process.env.CDN_URL}/${baseType[avatarSelected.BaseType].Icon}`}
                                                alt=""
                                                width={16}
                                                height={16}
                                                unoptimized
                                                className="h-4 w-4 object-contain"
                                            />
                                        )}
                                        <span className="font-medium text-base-content/70">
                                            {transI18n(avatarSelected.BaseType.toLowerCase())}
                                        </span>
                                    </div>
                                    <span
                                        className="mt-1.5 flex items-center gap-[3px]"
                                        role="img"
                                        aria-label={`${calcRarity(avatarSelected.Rarity)} stars`}
                                    >
                                        {Array.from({ length: calcRarity(avatarSelected.Rarity) }, (_, index) => (
                                            <Image
                                                key={index}
                                                src="/theme/icon/misc/PromotionLvStepFrame.webp"
                                                alt=""
                                                width={9}
                                                height={16}
                                                unoptimized
                                                className="h-4 w-[9px] object-fill"
                                                style={{
                                                    filter: "brightness(0) saturate(100%) invert(77%) sepia(65%) saturate(630%) hue-rotate(2deg) brightness(103%) contrast(101%)",
                                                }}
                                            />
                                        ))}
                                    </span>
                                </div>
                                {damageType?.[avatarSelected.DamageType]?.Icon && (
                                    <Image
                                        src={getDamageTypeIconPath(avatarSelected.DamageType)}
                                        alt=""
                                        width={28}
                                        height={28}
                                        unoptimized
                                        className="mt-1 h-7 w-7 shrink-0 object-contain"
                                    />
                                )}
                            </div>
                            <div className="mt-1 border-b border-base-content/30 pb-1 text-[11px] font-semibold text-base-content/80">
                                Lv. {userAvatar.level} / 80
                            </div>
                        </div>

                        {showCharacterSettings ? (
                            <div className="mt-2 flex flex-col gap-4 rounded-xl border border-base-content/10 bg-base-100/10 p-3">
                                <h3 className="text-xs font-bold">{transI18n("characterSettings")}</h3>
                                <div className="space-y-1 border-t border-base-content/10 pt-3">
                                    <div className="flex items-center justify-between text-[11px] font-semibold">
                                        <span>{transI18n("characterLevel")}</span>
                                        <span className="font-mono text-primary">Lv. {userAvatar.level} / 80</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="80"
                                        aria-label={transI18n("characterLevel")}
                                        value={userAvatar.level}
                                        onChange={(event) => {
                                            const level = Math.min(80, Math.max(1, Number.parseInt(event.target.value, 10) || 1))
                                            setAvatar({ ...userAvatar, level, promotion: calcPromotion(level) })
                                        }}
                                        className="range range-primary range-xs w-full"
                                    />
                                </div>
                                <div className="space-y-1 border-t border-base-content/10 pt-3">
                                    <div className="flex items-center justify-between text-[11px] font-semibold">
                                        <span>{transI18n("ultimateEnergy")}</span>
                                        <span className="font-mono text-amber-500">
                                            {Math.round(userAvatar.sp_value)} / {userAvatar.sp_max}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max={userAvatar.sp_max}
                                            aria-label={transI18n("ultimateEnergy")}
                                            value={userAvatar.sp_value}
                                            disabled={!userAvatar.can_change_sp}
                                            onChange={(event) => {
                                                if (!userAvatar.can_change_sp) return
                                                const value = Math.min(userAvatar.sp_max, Math.max(0, Number.parseInt(event.target.value, 10) || 0))
                                                setAvatar({ ...userAvatar, sp_value: value })
                                            }}
                                            className="range range-warning range-xs flex-1"
                                        />
                                        <button
                                            type="button"
                                            disabled={!userAvatar.can_change_sp}
                                            onClick={() => setAvatar({ ...userAvatar, sp_value: Math.ceil(userAvatar.sp_max / 2) })}
                                            className="btn btn-xs btn-warning btn-outline h-6 min-h-6 whitespace-nowrap rounded-md px-2"
                                        >
                                            {transI18n("setTo50")}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-base-content/10 pt-3">
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                        <Zap className="h-3.5 w-3.5 text-secondary" />
                                        {transI18n("useTechnique")}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={userAvatar.techniques?.length > 0}
                                        aria-label={transI18n("useTechnique")}
                                        disabled={!avatarSelected.MazeBuff?.length}
                                        onChange={(event) => {
                                            if (!avatarSelected.MazeBuff?.length) return
                                            setAvatar({ ...userAvatar, techniques: event.target.checked ? avatarSelected.MazeBuff : [] })
                                        }}
                                        className="toggle toggle-primary toggle-xs"
                                    />
                                </div>

                            </div>
                        ) : (
                            <>
                                <div className="mb-2 mt-1 grid grid-cols-2 rounded-full bg-base-100/10 p-1 text-[11px] font-semibold">
                                    {(["stats", "ability"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            aria-pressed={detailTab === tab}
                                            onClick={() => setDetailTab(tab)}
                                            className={`rounded-full px-3 py-1.5 transition-colors ${
                                                detailTab === tab
                                                    ? "bg-base-100/40 text-base-content"
                                                    : "text-base-content/55 hover:text-base-content"
                                            }`}
                                        >
                                            {transI18n(tab)}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 space-y-3 border-t border-base-content/10 pt-2">
                                    {avatarSelected.Enhanced && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                                <Sparkles className="h-3.5 w-3.5 text-accent" />
                                                {transI18n("enhancement")}
                                            </span>
                                            <select
                                                value={userAvatar.enhanced || ""}
                                                onChange={(event) => {
                                                    const skillTree = getSkillTree(avatarSelected, event.target.value)
                                                    setAvatar({
                                                        ...userAvatar,
                                                        enhanced: event.target.value,
                                                        data: {
                                                            ...userAvatar.data,
                                                            skills: skillTree || userAvatar.data.skills
                                                        }
                                                    })
                                                }}
                                                className="select select-xs select-bordered max-w-36 rounded-lg bg-base-200/50"
                                            >
                                                <option value="">{transI18n("origin")}</option>
                                                {Object.keys(avatarSelected.Enhanced).map((key) => (
                                                    <option key={key} value={key}>{key}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {detailTab === "stats" ? (
                                        <>
                                            <div className="space-y-0.5">
                                                {summaryStatKeys.map(renderStatRow)}
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsStatsModalOpen(true)}
                                                    className="rounded-full border border-base-content/20 px-3 py-1 text-[10px] font-semibold text-base-content/80 transition hover:bg-base-100/20"
                                                >
                                                    {transI18n("detailStats")}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <AbilityGrid
                                            skills={abilityList}
                                            skillLevels={userAvatar.data.skills}
                                            locale={locale}
                                            ultimateCost={avatarSelected.SPNeed}
                                            pathIcon={baseType?.[avatarSelected.BaseType]?.Icon}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    <section className="relative h-24 shrink-0 overflow-hidden rounded-xl border border-base-content/15 bg-base-100/10">
                        <button
                            type="button"
                            onClick={handleShowLightcone}
                            aria-label={lightconeDetail
                                ? `${getLocaleName(locale, lightconeDetail.Name)} · ${transI18n(lightconeDetail.BaseType.toLowerCase())}`
                                : transI18n("changeLightcone")}
                            title={lightconeDetail ? getLocaleName(locale, lightconeDetail.Name) : transI18n("changeLightcone")}
                            className="group absolute inset-0 flex w-full items-end justify-between overflow-hidden text-left text-white"
                        >
                            {lightconeDetail?.Image?.ImagePath && (
                                <Image
                                    src={`${process.env.CDN_URL}/${lightconeDetail.Image.ImagePath}`}
                                    alt=""
                                    fill
                                    unoptimized
                                    sizes="320px"
                                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                            )}
                            <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                            {lightconeDetail ? (
                                <span className="relative z-10 flex w-full items-center justify-between gap-2 px-3 pb-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/35">
                                        {baseType[lightconeDetail.BaseType]?.Icon && (
                                            <Image
                                                src={`${process.env.CDN_URL}/${baseType[lightconeDetail.BaseType].Icon}`}
                                                alt=""
                                                width={20}
                                                height={20}
                                                unoptimized
                                                className="h-5 w-5 object-contain"
                                            />
                                        )}
                                    </span>
                                    <span className="truncate text-sm font-bold drop-shadow">
                                        {transI18n(lightconeDetail.BaseType.toLowerCase())}
                                    </span>
                                </span>
                            ) : (
                                <span className="relative z-10 flex w-full items-center gap-2 px-3 pb-2 text-xs font-semibold">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/30">
                                        <Plus className="h-4 w-4" />
                                    </span>
                                    {transI18n("changeLightcone")}
                                </span>
                            )}
                        </button>
                    </section>
                    <button
                        type="button"
                        aria-pressed={showCharacterSettings}
                        onClick={() => setShowCharacterSettings((show) => !show)}
                        className="btn btn-sm h-7 min-h-0 shrink-0 justify-center rounded-full border border-white/80 bg-white px-3 text-[10px] font-bold text-black shadow-sm hover:bg-white"
                    >
                        {transI18n(showCharacterSettings ? "characterDetails" : "characterSettings")}
                    </button>
                </aside>
            </div>

            {isStatsModalOpen && (
                <dialog className="modal modal-open z-9995" open aria-labelledby="detail-stats-title">
                    <div className="modal-box flex max-h-[85vh] w-11/12 max-w-xl flex-col overflow-hidden rounded-xl border border-base-content/15 bg-base-100/95 p-0 text-base-content shadow-2xl">
                        <div className="flex items-center justify-between border-b border-base-content/15 px-5 py-3">
                            <h3 id="detail-stats-title" className="text-lg font-bold">{transI18n("moreStats")}</h3>
                            <button
                                type="button"
                                aria-label={transI18n("cancel")}
                                onClick={() => setIsStatsModalOpen(false)}
                                className="btn btn-ghost btn-sm btn-circle"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-4 overflow-y-auto p-5">
                            {[
                                {
                                    title: "baseStats",
                                    entries: Object.keys(characterStats ?? {}).filter((key) => baseStatKeys.has(key)),
                                },
                                {
                                    title: "advancedStats",
                                    entries: Object.entries(characterStats ?? {})
                                        .filter(([key, stat]) => !baseStatKeys.has(key) && (!key.includes("Add") || stat.value !== 0))
                                        .map(([key]) => key),
                                },
                            ].map((group) => (
                                <section key={group.title}>
                                    <h4 className="mb-1.5 border-b border-base-content/20 pb-1 text-xs font-bold uppercase tracking-wide text-base-content/70">
                                        {transI18n(group.title)}
                                    </h4>
                                    <div className="overflow-hidden rounded-md">
                                        {group.entries.map(renderStatRow)}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setIsStatsModalOpen(false)}>{transI18n("cancel")}</button>
                    </form>
                </dialog>
            )}

            {isArtModalOpen && (
                <dialog className="modal modal-open z-9995 animate-in fade-in duration-200 p-2 sm:p-4" open aria-labelledby="character-art-title">
                    <div className="modal-box flex h-[92dvh] max-h-[92dvh] w-[96vw] max-w-[1440px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#070c18]/95 p-0 text-base-content shadow-2xl shadow-black/60 backdrop-blur-xl">
                        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1322]/90 px-4 py-3 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5">
                                    <Image
                                        src={`${process.env.CDN_URL}/${avatarSelected.Image.AvatarIconPath}`}
                                        alt=""
                                        fill
                                        unoptimized
                                        sizes="40px"
                                        className="object-cover"
                                    />
                                </span>
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <h3 id="character-art-title" className="truncate text-base font-bold text-white sm:text-lg">
                                        <ParseText locale={locale} text={getNameChar(locale, transI18n, avatarSelected)} />
                                    </h3>
                                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-200">
                                        {calcRarity(avatarSelected.Rarity)}★
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label={transI18n("cancel")}
                                onClick={() => setIsArtModalOpen(false)}
                                className="btn btn-sm btn-circle border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                            <section aria-label="Character artwork preview" className="relative isolate min-h-0 min-w-0 flex-1 overflow-hidden bg-[#050914]">
                                <Image
                                    src={artImageSrc}
                                    alt=""
                                    fill
                                    unoptimized
                                    sizes="(min-width: 1024px) 72vw, 96vw"
                                    className="scale-110 object-cover opacity-30 blur-2xl"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/45 via-slate-950/15 to-[#070b15]/80" />
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(116,142,201,0.17),transparent_68%)]" />
                                <div className="absolute inset-0 p-3 sm:p-6 lg:p-8">
                                    <Image
                                        src={artImageSrc}
                                        alt={getNameChar(locale, transI18n, avatarSelected)}
                                        fill
                                        unoptimized
                                        sizes="(min-width: 1024px) 72vw, 96vw"
                                        className="object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
                                    />
                                </div>
                            </section>

                            <nav aria-label="Character artwork" className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 bg-[#09111f]/95 p-2.5 sm:p-3 lg:w-60 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:border-l lg:border-t-0 lg:p-4">
                                {artOptions.map(({ value, label, Icon }) => {
                                    const isSelected = artType === value
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => setArtType(value)}
                                            className={`group flex min-w-[8.5rem] flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 lg:min-w-0 lg:flex-none lg:px-3 lg:py-3 ${
                                                isSelected
                                                    ? "border-sky-200/40 bg-sky-300/10 text-white shadow-[0_0_24px_rgba(56,189,248,0.1)]"
                                                    : "border-white/5 bg-white/[0.025] text-white/65 hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                                            }`}
                                        >
                                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                                                isSelected
                                                    ? "border-sky-200/25 bg-sky-300/10 text-sky-100"
                                                    : "border-white/10 bg-black/10 text-white/60 group-hover:text-white"
                                            }`}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">{label}</span>
                                            {isSelected && <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-sky-200 shadow-[0_0_8px_rgba(125,211,252,0.9)] lg:block" />}
                                        </button>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop bg-black/60 backdrop-blur-xs">
                        <button type="button" onClick={() => setIsArtModalOpen(false)}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    )
}
