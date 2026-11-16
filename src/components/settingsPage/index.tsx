"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Languages, Palette, SlidersHorizontal, UserRound } from "lucide-react"
import { useTranslations } from "next-intl"
import useCurrentDataStore from "@/stores/currentDataStore"
import useLocaleStore from "@/stores/localeStore"
import useModelStore from "@/stores/modelStore"
import useUserDataStore from "@/stores/userDataStore"
import { listCurrentLanguage } from "@/constant/constant"
import { useChangeTheme } from "@/hooks/useChangeTheme"
import { getNameChar } from "@/helper"
import { useShallow } from "zustand/react/shallow"

const themes = ["winter", "night", "cupcake", "coffee"] as const

export default function SettingsPage() {
    const router = useRouter()
    const transI18n = useTranslations("DataPage")
    const { locale, setLocale, theme } = useLocaleStore(
        useShallow((state) => ({
            locale: state.locale,
            setLocale: state.setLocale,
            theme: state.theme,
        }))
    )
    const { changeTheme } = useChangeTheme()
    const { avatarSelected } = useCurrentDataStore(
        useShallow((state) => ({ avatarSelected: state.avatarSelected }))
    )
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    )
    const setIsOpenManageProfiles = useModelStore((state) => state.setIsOpenManageProfiles)

    const userAvatar = avatars[avatarSelected?.ID ?? ""]
    const profiles = userAvatar?.profileList ?? []

    const handleLocaleChange = (nextLocale: string) => {
        setLocale(nextLocale)
        document.cookie = `MYNEXTAPP_LOCALE=${nextLocale}; path=/; max-age=31536000;`
        router.refresh()
    }

    const handleProfileChange = (profileIndex: number) => {
        if (!userAvatar) return
        setAvatar({ ...userAvatar, profileSelect: profileIndex })
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 py-3 sm:py-6">
            <div className="flex items-center justify-between border-b border-base-content/15 pb-3">
                <h1 className="flex items-center gap-2 text-xl font-bold text-primary">
                    <SlidersHorizontal className="h-5 w-5" />
                    Settings
                </h1>
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    aria-label="Back to Detail"
                    title="Back to Detail"
                    className="btn btn-ghost btn-sm btn-circle"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
            </div>

            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-base-content/90">
                    <Languages className="h-4 w-4 text-primary" />
                    {transI18n("language")}
                </h2>
                <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-100/70 px-4 py-2">
                    <span className="text-sm font-medium">{transI18n("language")}</span>
                    <select
                        aria-label={transI18n("language")}
                        value={locale}
                        onChange={(event) => handleLocaleChange(event.target.value)}
                        className="select select-sm w-52 max-w-[55%] rounded-lg border-base-content/15 bg-base-200"
                    >
                        {Object.entries(listCurrentLanguage).map(([key, value]) => (
                            <option key={key} value={key}>{value.flag} {value.label}</option>
                        ))}
                    </select>
                </label>
            </section>

            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-base-content/90">
                    <Palette className="h-4 w-4 text-primary" />
                    {transI18n("theme")}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {themes.map((themeName) => (
                        <button
                            key={themeName}
                            type="button"
                            aria-pressed={theme === themeName}
                            onClick={() => changeTheme?.(themeName)}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left capitalize transition ${
                                theme === themeName
                                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                                    : "border-base-content/10 bg-base-100/70 hover:bg-base-200/80"
                            }`}
                        >
                            <span
                                data-theme={themeName}
                                className="grid h-8 w-8 shrink-0 grid-cols-2 gap-1 rounded-lg border border-base-content/15 bg-base-100 p-1.5 shadow-xs"
                            >
                                <span className="rounded-full bg-base-content" />
                                <span className="rounded-full bg-primary" />
                                <span className="rounded-full bg-secondary" />
                                <span className="rounded-full bg-accent" />
                            </span>
                            <span className="text-sm font-semibold">{themeName}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-base-content/90">
                    <UserRound className="h-4 w-4 text-primary" />
                    {transI18n("profile")}
                </h2>
                <div className="flex flex-col gap-3 rounded-xl border border-base-content/10 bg-base-100/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <span className="text-xs font-medium text-base-content/60">{transI18n("character")}</span>
                        <p className="truncate text-sm font-semibold">
                            {avatarSelected ? getNameChar(locale, transI18n, avatarSelected) : transI18n("character")}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            aria-label={transI18n("profile")}
                            value={userAvatar?.profileSelect ?? 0}
                            onChange={(event) => handleProfileChange(Number(event.target.value))}
                            disabled={!userAvatar || profiles.length === 0}
                            className="select select-sm min-w-48 rounded-lg border-base-content/15 bg-base-200"
                        >
                            {profiles.map((profile, index) => (
                                <option key={`${profile.profile_name}-${index}`} value={index}>{profile.profile_name}</option>
                            ))}
                            {profiles.length === 0 && <option value={0}>{transI18n("defaultProfile")}</option>}
                        </select>
                        <button
                            type="button"
                            disabled={!avatarSelected}
                            onClick={() => setIsOpenManageProfiles(true)}
                            className="btn btn-sm btn-outline gap-2"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {transI18n("manageProfiles")}
                        </button>
                    </div>
                </div>
                {!avatarSelected && (
                    <p className="text-xs text-base-content/60">{transI18n("placeholderCharacter")}</p>
                )}
            </section>
        </div>
    )
}
