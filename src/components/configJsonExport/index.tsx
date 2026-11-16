'use client'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { AlertTriangle, Check, Download, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'
import { SimpleAvatarCard } from '@/components/card/simpleCharacterCard'
import useConfigJsonStore, { MAX_TEAM_SIZE } from '@/stores/configJsonStore'
import useDetailDataStore from '@/stores/detailDataStore'
import useLocaleStore from '@/stores/localeStore'
import useUserDataStore from '@/stores/userDataStore'
import { toast } from 'react-toastify'
import { buildConfigJson } from '@/helper/configJsonBuilder'
import { ensureBattleData } from '@/lib/ensureBattleData'
import { downloadJson, getNameChar } from '@/helper'
import type { AvatarDetail, ConfigJsonWarning } from '@/types'

type ConfigJsonExportProps = {
    open: boolean
    onClose: () => void
}

const isFiveStar = (detail: AvatarDetail) => detail.Rarity === "CombatPowerAvatarRarityType5"

export default function ConfigJsonExport({ open, onClose }: ConfigJsonExportProps) {
    const transI18n = useTranslations("DataPage")
    const { locale, theme } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale, theme: state.theme }))
    )
    const avatars = useUserDataStore((state) => state.avatars)
    const { mapAvatar, baseType, damageType } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            baseType: state.baseType,
            damageType: state.damageType,
        }))
    )

    const { avatar_ids, attacker_id, use_step_on_relic, toggleAvatar, setAttacker, setUseStepOnRelic, clearTeam } =
        useConfigJsonStore(
            useShallow((state) => ({
                avatar_ids: state.avatar_ids,
                attacker_id: state.attacker_id,
                use_step_on_relic: state.use_step_on_relic,
                toggleAvatar: state.toggleAvatar,
                setAttacker: state.setAttacker,
                setUseStepOnRelic: state.setUseStepOnRelic,
                clearTeam: state.clearTeam,
            }))
        )

    const [keyword, setKeyword] = useState("")
    const [elementActive, setElementActive] = useState<Record<string, boolean>>({})
    const [pathActive, setPathActive] = useState<Record<string, boolean>>({})
    const [warnings, setWarnings] = useState<ConfigJsonWarning[]>([])
    const [exportedCount, setExportedCount] = useState<number | null>(null)

    useEffect(() => {
        if (!open) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [open, onClose])

    useEffect(() => {
        if (!open) return
        const previous = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = previous
        }
    }, [open])

    const displayName = (avatarId: number) => getNameChar(locale, transI18n, mapAvatar[String(avatarId)])

    // Only saved characters have a build to export; none are invented.
    const pickable = useMemo(() => {
        const needle = keyword.trim().toLowerCase()
        const anyElement = Object.values(elementActive).some((value) => value)
        const anyPath = Object.values(pathActive).some((value) => value)

        return Object.keys(avatars)
            .map((avatarId) => mapAvatar[avatarId])
            .filter((detail): detail is AvatarDetail => Boolean(detail))
            .filter((detail) => {
                if (!needle) return true
                return getNameChar(locale, transI18n, detail).toLowerCase().includes(needle)
            })
            .filter((detail) => !anyElement || Boolean(elementActive[detail.DamageType]))
            .filter((detail) => !anyPath || Boolean(pathActive[detail.BaseType]))
            .sort((a, b) => {
                if (isFiveStar(a) !== isFiveStar(b)) return isFiveStar(a) ? -1 : 1
                return getNameChar(locale, transI18n, a).localeCompare(getNameChar(locale, transI18n, b))
            })
    }, [avatars, mapAvatar, keyword, elementActive, pathActive, locale, transI18n])

    const team = avatar_ids
        .map((avatarId) => mapAvatar[String(avatarId)])
        .filter((detail): detail is AvatarDetail => Boolean(detail))

    // The attacker gets its element buff in the file; the store clears attacker_id when it leaves the team.
    const attackerMissing = avatar_ids.length > 0 && attacker_id === null
    const canExport = avatar_ids.length > 0 && !attackerMissing

    const handleDownload = async () => {
        if (!canExport) return

        try {
            await ensureBattleData(useUserDataStore.getState().battle_type)
        } catch {
            toast.error(transI18n("failedToLoadData", { type: "battle" }))
            return
        }
        const latest = useUserDataStore.getState()
        const { config, warnings: nextWarnings } = buildConfigJson({
            avatarIds: avatar_ids,
            attackerId: attacker_id,
            useStepOnRelic: use_step_on_relic,
            avatars: latest.avatars,
            mapAvatar,
            avatarName: displayName,
            battleType: latest.battle_type,
            mocConfig: latest.moc_config,
            pfConfig: latest.pf_config,
            asConfig: latest.as_config,
            ceConfig: latest.ce_config,
            peakConfig: latest.peak_config,
        })

        setWarnings(nextWarnings)

        if (config.avatar_config.length === 0) {
            setExportedCount(0)
            return
        }

        downloadJson("config", config)
        setExportedCount(config.avatar_config.length)
    }

    const warningText = (warning: ConfigJsonWarning) =>
        (transI18n as unknown as (key: string, values?: Record<string, string | number>) => string)(
            warning.key,
            warning.values
        )

    const hasActiveFilter = Object.values(elementActive).some(Boolean) || Object.values(pathActive).some(Boolean)
    const clearFilters = () => {
        setElementActive({})
        setPathActive({})
    }

    if (!open || typeof document === "undefined") return null

    // Portalled to <body> to escape the header's sticky stacking context; the theme is copied by hand.
    return createPortal(
        <div
            data-theme={theme}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/70"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-2xl bg-base-100 text-base-content border border-base-content/10 shadow-2xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-4 border-b border-base-content/10 shrink-0">
                    <h3 className="min-w-0 truncate font-bold text-base sm:text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary via-accent to-secondary">
                        {transI18n("configJsonTitle")}
                    </h3>
                    <button
                        className="btn btn-sm btn-circle btn-ghost shrink-0 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                        onClick={onClose}
                        aria-label={transI18n("cancel")}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4 sm:px-6 sm:py-5 sm:space-y-5">
                    <section>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/75">
                                {transI18n("configJsonTeamLineup")}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-base-content/60">
                                    {avatar_ids.length}/{MAX_TEAM_SIZE}
                                </span>
                                {avatar_ids.length > 0 && (
                                    <button className="btn btn-ghost btn-xs" onClick={clearTeam}>
                                        {transI18n("clearAll")}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-1.5 min-[380px]:grid-cols-4 sm:gap-2">
                            {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
                                const avatarId = avatar_ids[index]
                                const detail = avatarId ? mapAvatar[String(avatarId)] : undefined

                                return (
                                    <div
                                        key={index}
                                        className={`flex flex-col items-center gap-1 rounded-xl border p-1 sm:p-1.5 transition-colors ${
                                            detail
                                                ? 'border-primary/40 bg-primary/5'
                                                : 'border-dashed border-base-content/20 bg-base-200/30'
                                        }`}
                                    >
                                        {detail ? (
                                            <>
                                                <SimpleAvatarCard
                                                    data={detail}
                                                    onClick={() => toggleAvatar(detail.ID)}
                                                    showRemoveHover
                                                />
                                                <span className="w-full truncate text-center text-[11px] font-medium">
                                                    {getNameChar(locale, transI18n, detail)}
                                                </span>
                                            </>
                                        ) : (
                                            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-base-200/50 text-base-content/25 text-xl font-light">
                                                +
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/75">
                                {transI18n("configJsonAttacker")}
                            </span>
                            <span className="text-[11px] text-base-content/50">
                                {transI18n("configJsonAttackerHint")}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            {team.length === 0 ? (
                                <span className="text-xs text-base-content/50">{transI18n("noAvatarSelected")}</span>
                            ) : (
                                team.map((detail) => {
                                    const active = attacker_id === detail.ID
                                    return (
                                        <button
                                            key={detail.ID}
                                            onClick={() => setAttacker(active ? null : detail.ID)}
                                            className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                                                active
                                                    ? 'border-primary bg-primary/15 text-base-content'
                                                    : 'border-base-content/15 bg-base-200/40 text-base-content/70 hover:border-base-content/30'
                                            }`}
                                        >
                                            <Image
                                                width={24}
                                                height={24}
                                                unoptimized
                                                src={`${process.env.CDN_URL}/${detail.Image.ActionAvatarHeadIconPath}`}
                                                alt=""
                                                className="h-6 w-6 rounded-full object-contain"
                                            />
                                            {getNameChar(locale, transI18n, detail)}
                                            {active && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        {attackerMissing && (
                            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-warning">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                {transI18n("configJsonAttackerRequired")}
                            </p>
                        )}
                    </section>

                    <label className="flex items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/30 p-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary mt-0.5"
                            checked={use_step_on_relic}
                            onChange={(event) => setUseStepOnRelic(event.target.checked)}
                        />
                        <div className="min-w-0">
                            <div className="text-sm font-medium">{transI18n("configJsonUseStepOnRelic")}</div>
                            <div className="text-[11px] leading-relaxed text-base-content/60">
                                {transI18n("configJsonUseStepOnRelicHint")}
                            </div>
                        </div>
                    </label>

                    <section>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/75">
                                {transI18n("configJsonPickCharacter")}
                            </span>
                            {Object.keys(avatars).length > 0 && (
                                <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                                    {pickable.length}
                                </span>
                            )}
                        </div>

                        {Object.keys(avatars).length === 0 ? (
                            <p className="mt-2 rounded-xl border border-base-content/10 bg-base-200/30 p-3 text-xs text-base-content/60">
                                {transI18n("configJsonNoSavedCharacter")}
                            </p>
                        ) : (
                            <>
                                <div className="relative mt-2">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-base-content/40" />
                                    <input
                                        value={keyword}
                                        onChange={(event) => setKeyword(event.target.value)}
                                        placeholder={transI18n("configJsonSearchCharacter")}
                                        className="w-full rounded-lg border border-base-content/15 bg-base-100 py-1.5 pl-8 pr-8 text-xs outline-none focus:border-primary"
                                    />
                                    {keyword && (
                                        <button
                                            type="button"
                                            onClick={() => setKeyword("")}
                                            aria-label={transI18n("clearAll")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Element / path filters: fixed-size buttons in a wrapping
                                    toolbar, so they stay compact instead of stretching apart
                                    across the full width of the dialog. */}
                                <div className="mt-2 flex flex-wrap items-center gap-1 rounded-xl border border-base-content/10 bg-base-200/50 p-1">
                                    <div className="flex flex-wrap items-center gap-0.5">
                                        {Object.entries(damageType)
                                            .filter(([key]) => key !== "")
                                            .map(([key, value]) => {
                                                const isActive = Boolean(elementActive[key])
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        aria-pressed={isActive}
                                                        onClick={() =>
                                                            setElementActive((prev) => ({ ...prev, [key]: !prev[key] }))
                                                        }
                                                        title={(locale && value.Name?.[locale]) || key}
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95 sm:h-8 sm:w-8 ${
                                                            isActive
                                                                ? "border-primary/60 bg-primary/25 shadow-xs ring-1 ring-primary/40"
                                                                : "border-base-content/10 bg-base-100/70 hover:border-base-content/25 hover:bg-base-100"
                                                        }`}
                                                    >
                                                        <Image
                                                            src={`${process.env.CDN_URL}/${value.Icon}`}
                                                            alt={key}
                                                            unoptimized
                                                            width={22}
                                                            height={22}
                                                            className="h-4.5 w-4.5 object-contain sm:h-5 sm:w-5"
                                                        />
                                                    </button>
                                                )
                                            })}
                                    </div>

                                    <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-base-content/15 sm:block" aria-hidden />

                                    <div className="flex flex-wrap items-center gap-0.5">
                                        {Object.entries(baseType)
                                            .filter(([key]) => key !== "")
                                            .map(([key, value]) => {
                                                const isActive = Boolean(pathActive[key])
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        aria-pressed={isActive}
                                                        onClick={() => setPathActive((prev) => ({ ...prev, [key]: !prev[key] }))}
                                                        title={(locale && value.Text?.[locale]) || key}
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95 sm:h-8 sm:w-8 ${
                                                            isActive
                                                                ? "border-primary bg-neutral ring-1 ring-primary/50"
                                                                : "border-black/30 bg-neutral hover:border-primary/40"
                                                        }`}
                                                    >
                                                        {/* Path sprites are white line art, so they sit on a
                                                            dark plate in every theme (same as the path badge
                                                            on the character cards) instead of depending on a
                                                            theme-specific filter. */}
                                                        <Image
                                                            src={`${process.env.CDN_URL}/${value.Icon}`}
                                                            alt={key}
                                                            unoptimized
                                                            width={22}
                                                            height={22}
                                                            className="h-4.5 w-4.5 object-contain opacity-85 sm:h-5 sm:w-5"
                                                        />
                                                    </button>
                                                )
                                            })}
                                    </div>

                                    {hasActiveFilter && (
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="ml-auto flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-base-content/60 transition-colors hover:bg-base-100 hover:text-base-content"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">{transI18n("clearAll")}</span>
                                        </button>
                                    )}
                                </div>

                                {pickable.length === 0 ? (
                                    <p className="mt-3 rounded-xl border border-dashed border-base-content/20 bg-base-200/30 p-3 text-xs text-base-content/60">
                                        {transI18n("configJsonNoMatch")}
                                    </p>
                                ) : (
                                    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                                        {pickable.map((detail) => (
                                            <SimpleAvatarCard
                                                key={detail.ID}
                                                data={detail}
                                                isSelected={avatar_ids.includes(detail.ID)}
                                                onClick={() => toggleAvatar(detail.ID)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    {warnings.length > 0 && (
                        <section className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-warning-content/80">
                                {transI18n("configJsonWarnings")}
                            </div>
                            <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-base-content/70">
                                {warnings.map((warning, index) => (
                                    <li key={index}>• {warningText(warning)}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {exportedCount !== null && exportedCount > 0 && (
                        <p className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-base-content/80">
                            {transI18n("configJsonExported", { count: exportedCount })}
                        </p>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-base-content/10 px-3 py-2.5 shrink-0 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-3">
                    <button className="btn btn-ghost btn-sm w-full sm:w-auto" onClick={onClose}>
                        {transI18n("cancel")}
                    </button>
                    <button
                        className="btn btn-primary btn-sm w-full sm:w-auto"
                        onClick={handleDownload}
                        disabled={!canExport}
                        title={attackerMissing ? transI18n("configJsonAttackerRequired") : undefined}
                    >
                        <Download className="h-4 w-4" />
                        {transI18n("configJsonDownload")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
