"use client"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import CharacterCard from "../card/characterCard"
import useLocaleStore from "@/stores/localeStore"
import { useTranslations } from "next-intl"
import useDetailDataStore from "@/stores/detailDataStore"
import useCurrentDataStore from '@/stores/currentDataStore';
import { calcRarity, getDamageTypeIconPath, getNameChar } from "@/helper"
import { useShallow } from "zustand/react/shallow";
import { Search, X } from "lucide-react"

interface AvatarBarProps {
    onClose?: () => void;
    layout?: "grid" | "strip";
    compact?: boolean;
}

export default function AvatarBar({ onClose, layout = "grid", compact = false }: AvatarBarProps) {
    const { 
        avatarSearch, 
        avatarSelected,
        mapAvatarElementActive, 
        mapAvatarPathActive, 
        setAvatarSearch,
        setAvatarSelected,
        setMapAvatarElementActive, 
        setMapAvatarPathActive,
        setSkillIDSelected,
    } = useCurrentDataStore(
        useShallow((state) => ({
            avatarSearch: state.avatarSearch,
            avatarSelected: state.avatarSelected,
            mapAvatarElementActive: state.mapAvatarElementActive,
            mapAvatarPathActive: state.mapAvatarPathActive,
            setAvatarSearch: state.setAvatarSearch,
            setAvatarSelected: state.setAvatarSelected,
            setMapAvatarElementActive: state.setMapAvatarElementActive,
            setMapAvatarPathActive: state.setMapAvatarPathActive,
            setSkillIDSelected: state.setSkillIDSelected,
        }))
    )
    const { mapAvatar, baseType, damageType } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            baseType: state.baseType,
            damageType: state.damageType,
        }))
    )
    const transI18n = useTranslations("DataPage")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )

    useEffect(() => {
        if (!isFilterOpen) return
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsFilterOpen(false)
        }
        window.addEventListener("keydown", closeOnEscape)
        return () => window.removeEventListener("keydown", closeOnEscape)
    }, [isFilterOpen])

    const listAvatar = useMemo(() => {
        if (!mapAvatar || !locale || !transI18n) return []

        let list = Object.values(mapAvatar)

        if (layout !== "strip" && avatarSearch) {
            list = list.filter(item =>
                getNameChar(locale, transI18n, item)
                    .toLowerCase()
                    .includes(avatarSearch.toLowerCase())
            )
        }

        if (layout !== "strip") {
            const allElementFalse = !Object.values(mapAvatarElementActive).some(v => v)
            const allPathFalse = !Object.values(mapAvatarPathActive).some(v => v)

            list = list.filter(item =>
                (allElementFalse || mapAvatarElementActive[item.DamageType]) &&
                (allPathFalse || mapAvatarPathActive[item.BaseType])
            )
        }

        list.sort((a, b) => {
            const r = calcRarity(b.Rarity) - calcRarity(a.Rarity)
            if (r !== 0) return r
            return b.ID - a.ID
        })

        return list
    }, [mapAvatar, mapAvatarElementActive, mapAvatarPathActive, avatarSearch, locale, transI18n, layout])

    return (
        <div className={`${layout === "strip" ? "flex flex-col gap-1 px-2 py-1" : "flex flex-col h-full gap-2 p-2"}`}>
            <div className={
                layout === "strip"
                    ? "flex min-w-0 items-center gap-2"
                    : compact
                        ? "flex flex-col gap-2"
                        : "contents"
            }>
            {layout !== "strip" && <label className={`input input-bordered flex w-full items-center gap-2 px-3 shadow-xs transition-colors focus-within:border-primary/60 ${
                compact
                    ? "h-10 rounded-full border-base-content/20 bg-base-100/20 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
                    : "input-sm h-8.5 rounded-xl border-base-300 bg-base-200/90"
            }`}>
                <Search className="w-4 h-4 text-base-content/70 shrink-0" />
                <input
                    type="text"
                    placeholder={transI18n("placeholderCharacter")}
                    className="grow text-xs bg-transparent border-none outline-none focus:outline-none placeholder:text-base-content/50"
                    value={avatarSearch}
                    onChange={(e) => setAvatarSearch(e.target.value)}
                />
                {avatarSearch && (
                    <button
                        type="button"
                        onClick={() => setAvatarSearch("")}
                        className="text-base-content/50 hover:text-base-content"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </label>}

            {layout !== "strip" && !compact && <div className="rounded-xl p-1 bg-base-200/80 border border-base-content/15 space-y-1 shadow-xs">
                <div className="grid grid-cols-7 gap-0.5">
                    {Object.entries(damageType).filter(([key]) => key !== "").map(([key, value]) => {
                        const isActive = !!mapAvatarElementActive[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setMapAvatarElementActive({ ...mapAvatarElementActive, [key]: !mapAvatarElementActive[key] })
                                }}
                                className={`h-8.5 w-full rounded-lg transition-all duration-150 active-press flex items-center justify-center p-0 ${
                                    isActive
                                        ? "bg-primary/20 text-primary ring-1.5 ring-primary scale-105 z-10 shadow-xs"
                                        : "hover:bg-base-100 opacity-90 hover:opacity-100"
                                }`}
                                title={(locale && value.Name?.[locale]) || key}
                            >
                                <Image
                                    src={getDamageTypeIconPath(key)}
                                    alt={key}
                                    unoptimized
                                    className="w-6.5 h-6.5 object-contain drop-shadow-xs"
                                    width={32}
                                    height={32}
                                />
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-9 gap-0.5">
                    {Object.entries(baseType).filter(([key]) => key !== "").map(([key, value]) => {
                        const isActive = !!mapAvatarPathActive[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setMapAvatarPathActive({ ...mapAvatarPathActive, [key]: !mapAvatarPathActive[key] })
                                }}
                                className={`h-8 w-full rounded-lg transition-all duration-150 active-press flex items-center justify-center p-0 ${
                                    isActive
                                        ? "bg-primary/20 ring-1.5 ring-primary scale-105 z-10 shadow-xs"
                                        : "hover:bg-base-100 opacity-90 hover:opacity-100"
                                }`}
                                title={(locale && value.Text?.[locale]) || key}
                            >
                                <Image
                                    src={`${process.env.CDN_URL}/${value.Icon}`}
                                    unoptimized
                                    alt={key}
                                    className={`w-5.5 h-5.5 object-contain ${
                                        isActive ? "theme-path-icon-active" : "theme-path-icon"
                                    }`}
                                    width={28}
                                    height={28}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>}

            {layout !== "strip" && !compact && <div className="flex items-center justify-between text-xs font-semibold text-base-content/80 px-1 py-0.5">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span>{transI18n("character")}</span>
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {listAvatar.length}
                </span>
            </div>}
            </div>

            {compact && (
                <h2 className="flex shrink-0 items-center gap-3 text-sm font-bold text-base-content/90 before:h-px before:flex-1 before:bg-base-content/20 before:content-[''] after:h-px after:flex-1 after:bg-base-content/20 after:content-['']">
                    Character Catalog
                </h2>
            )}

            {layout === "strip" ? (
                <div
                    className="avatar-strip-scroll flex min-w-0 items-center gap-3 overflow-x-auto py-1"
                    onWheel={(event) => {
                        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
                        event.preventDefault();
                        event.currentTarget.scrollLeft += event.deltaY;
                    }}
                >
                    {listAvatar.map((item, index) => (
                        <button
                            key={item.ID}
                            type="button"
                            title={getNameChar(locale, transI18n, item)}
                            aria-label={getNameChar(locale, transI18n, item)}
                            aria-pressed={avatarSelected?.ID === item.ID}
                            onClick={() => {
                                setAvatarSelected(item);
                                setSkillIDSelected(null);
                                if (onClose) onClose();
                            }}
                            className={`group relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-0 transition-transform active-press focus-visible:outline-2 focus-visible:outline-primary ${
                                avatarSelected?.ID === item.ID ? "ring-1 ring-primary/0" : "hover:scale-105"
                            }`}
                        >
                            <Image
                                src={`${process.env.CDN_URL}/${item.Image.AvatarSideIconPath || item.Image.DefaultAvatarHeadIconPath}`}
                                alt=""
                                unoptimized
                                width={64}
                                height={64}
                                loading={index < 12 ? "eager" : "lazy"}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            />
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
                        <ul className={`grid ${
                            compact ? "grid-cols-4 gap-1.5 auto-rows-max" : "grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 auto-rows-fr"
                        }`}>
                            {listAvatar.map((item, index) => (
                                <li key={item.ID} className="h-full flex flex-col">
                                    <button
                                        type="button"
                                        aria-label={getNameChar(locale, transI18n, item)}
                                        title={getNameChar(locale, transI18n, item)}
                                        aria-pressed={avatarSelected?.ID === item.ID}
                                        className={`h-full w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-primary ${
                                            avatarSelected?.ID === item.ID ? "ring-2 ring-white shadow-lg" : ""
                                        }`}
                                        onClick={() => {
                                            setAvatarSelected(item);
                                            setSkillIDSelected(null)
                                            if (onClose) onClose()
                                        }}
                                    >
                                        <CharacterCard data={item} priority={index < 3} compact={compact} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {compact && (
                        <div className="flex shrink-0 items-center justify-between border-t border-base-content/10 pt-2">
                            <button
                                type="button"
                                aria-label={transI18n("filter")}
                                aria-expanded={isFilterOpen}
                                title={transI18n("filter")}
                                onClick={() => setIsFilterOpen((open) => !open)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                            >
                                <Image
                                    src="/theme/icon/icon-filter.png"
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 object-contain brightness-0"
                                />
                            </button>
                            {onClose && (
                                <button
                                    type="button"
                                    aria-label={transI18n("cancel")}
                                    title={transI18n("cancel")}
                                    onClick={onClose}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-base-content/20 bg-base-100/40 text-base-content/75 transition-colors hover:bg-base-100/70"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {compact && isFilterOpen && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label={transI18n("cancel")}
                        onClick={() => setIsFilterOpen(false)}
                        className="absolute inset-0 bg-black/70"
                    />
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="character-filter-title"
                        style={{ maxHeight: "min(420px, 82vh)" }}
                        className="relative z-10 flex max-h-[82vh] w-full max-w-[640px] flex-col overflow-hidden border border-black/40 bg-[#d7d7da] text-[#171717] shadow-2xl"
                    >
                        <header className="flex h-11 shrink-0 items-center justify-between border-b border-black/30 px-4">
                            <h2 id="character-filter-title" className="text-base font-bold">
                                {transI18n("filter")}
                            </h2>
                            <button
                                type="button"
                                aria-label={transI18n("cancel")}
                                onClick={() => setIsFilterOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-black transition-colors hover:bg-black/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                            <fieldset>
                                <legend className="mb-1.5 text-xs font-semibold">{transI18n("type")}</legend>
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {Object.entries(damageType).filter(([key]) => key !== "").map(([key, value]) => (
                                        <label
                                            key={key}
                                            className="flex min-h-9 cursor-pointer items-center justify-between gap-3 border border-black/10 bg-white/75 px-2.5 py-1 text-sm font-semibold shadow-sm transition-colors hover:bg-white"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Image
                                                    src={getDamageTypeIconPath(key)}
                                                    alt=""
                                                    unoptimized
                                                    width={24}
                                                    height={24}
                                                    className="h-6 w-6 shrink-0 object-contain"
                                                />
                                                <span className="truncate">{(locale && value.Name?.[locale]) || key}</span>
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={!!mapAvatarElementActive[key]}
                                                onChange={() => setMapAvatarElementActive({
                                                    ...mapAvatarElementActive,
                                                    [key]: !mapAvatarElementActive[key],
                                                })}
                                                className="checkbox checkbox-sm rounded-sm border-black/50 [--chkbg:#222] [--chkfg:white]"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend className="mb-1.5 text-xs font-semibold">{transI18n("path")}</legend>
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {Object.entries(baseType).filter(([key]) => key !== "").map(([key, value]) => (
                                        <label
                                            key={key}
                                            className="flex min-h-9 cursor-pointer items-center justify-between gap-3 border border-black/10 bg-white/75 px-2.5 py-1 text-sm font-semibold shadow-sm transition-colors hover:bg-white"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Image
                                                    src={`${process.env.CDN_URL}/${value.Icon}`}
                                                    alt=""
                                                    unoptimized
                                                    width={24}
                                                    height={24}
                                                    className="h-6 w-6 shrink-0 object-contain brightness-0 opacity-70"
                                                />
                                                <span className="truncate">{(locale && value.Text?.[locale]) || key}</span>
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={!!mapAvatarPathActive[key]}
                                                onChange={() => setMapAvatarPathActive({
                                                    ...mapAvatarPathActive,
                                                    [key]: !mapAvatarPathActive[key],
                                                })}
                                                className="checkbox checkbox-sm rounded-sm border-black/50 [--chkbg:#222] [--chkfg:white]"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>

                        <footer className="flex shrink-0 justify-center gap-3 bg-[#262626] px-4 py-3 sm:gap-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setMapAvatarElementActive({});
                                    setMapAvatarPathActive({});
                                }}
                                className="btn btn-sm h-8 min-h-8 w-full max-w-[220px] rounded-full border-0 bg-white text-xs font-medium text-black shadow-none hover:bg-gray-100"
                            >
                                {transI18n("clearAll")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFilterOpen(false)}
                                className="btn btn-sm h-8 min-h-8 w-full max-w-[220px] rounded-full border-0 bg-white text-xs font-medium text-black shadow-none hover:bg-gray-100"
                            >
                                {transI18n("confirm")}
                            </button>
                        </footer>
                    </section>
                </div>
            , document.body)}
        </div>
    )
}
