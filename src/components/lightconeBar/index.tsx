"use client"

import { useMemo } from "react"
import Image from "next/image";
import useLocaleStore from "@/stores/localeStore"
import LightconeCard from "../card/lightconeCard";
import useUserDataStore from "@/stores/userDataStore";
import useModelStore from "@/stores/modelStore";
import { useTranslations } from "next-intl";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { calcRarity, getLocaleName } from "@/helper";
import { useShallow } from "zustand/react/shallow";
import { Search, X } from "lucide-react";

export default function LightconeBar() {
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const {
        avatarSelected,
        mapLightconePathActive,
        mapLightconeRankActive,
        setMapLightconePathActive,
        setMapLightconeRankActive,
        lightconeSearch,
        setLightconeSearch
    } = useCurrentDataStore(
        useShallow((state) => ({
            avatarSelected: state.avatarSelected,
            mapLightconePathActive: state.mapLightconePathActive,
            mapLightconeRankActive: state.mapLightconeRankActive,
            setMapLightconePathActive: state.setMapLightconePathActive,
            setMapLightconeRankActive: state.setMapLightconeRankActive,
            lightconeSearch: state.lightconeSearch,
            setLightconeSearch: state.setLightconeSearch,
        }))
    )
    const { setAvatar, avatars } = useUserDataStore(
        useShallow((state) => ({
            setAvatar: state.setAvatar,
            avatars: state.avatars,
        }))
    )
    const { setIsOpenLightcone } = useModelStore(
        useShallow((state) => ({
            setIsOpenLightcone: state.setIsOpenLightcone,
        }))
    )
    const { mapLightCone, baseType } = useDetailDataStore(
        useShallow((state) => ({
            mapLightCone: state.mapLightCone,
            baseType: state.baseType,
        }))
    )
    const transI18n = useTranslations("DataPage")

    const listLightcone = useMemo(() => {
        if (!mapLightCone || !locale) return []

        let list = Object.values(mapLightCone)

        if (lightconeSearch) {
            list = list.filter(item => getLocaleName(locale, item.Name).toLowerCase().includes(lightconeSearch.toLowerCase()))
        }

        const allRankFalse = !Object.values(mapLightconeRankActive).some(v => v)
        const allPathFalse = !Object.values(mapLightconePathActive).some(v => v)

        list = list.filter(item => {
            const itemRank = calcRarity(item.Rarity).toString();
            return (
                (allRankFalse || !!mapLightconeRankActive[itemRank] || !!mapLightconeRankActive[item.Rarity]) &&
                (allPathFalse || !!mapLightconePathActive[item.BaseType])
            );
        })
        
        list.sort((a, b) => {
            const r = calcRarity(b.Rarity) - calcRarity(a.Rarity)
            if (r !== 0) return r
            return b.ID - a.ID
        })

        return list
    }, [mapLightCone, mapLightconePathActive, mapLightconeRankActive, lightconeSearch, locale])

    return (
        <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-base-200 border border-base-300 space-y-2.5">
                <label className="input input-sm input-bordered flex items-center gap-2 bg-base-100 border-base-300 rounded-lg w-full h-8 px-2.5 shadow-xs">
                    <Search className="w-4 h-4 text-base-content/60 shrink-0" />
                    <input
                        value={lightconeSearch}
                        onChange={(e) => setLightconeSearch(e.target.value)}
                        type="text"
                        placeholder={`${transI18n("lightcones")}...`}
                        className="grow text-xs bg-transparent border-none outline-none focus:outline-none"
                    />
                    {lightconeSearch && (
                        <button
                            type="button"
                            onClick={() => setLightconeSearch("")}
                            className="text-base-content/40 hover:text-base-content"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                        {Object.entries(baseType).filter(([key]) => key !== "").map(([key, value]) => {
                            const isActive = !!mapLightconePathActive[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        setMapLightconePathActive({ ...mapLightconePathActive, [key]: !mapLightconePathActive[key] })
                                    }}
                                    className={`h-7 w-7 rounded-lg transition-all duration-150 active-press border flex items-center justify-center ${
                                        isActive
                                            ? "bg-primary/20 border-primary ring-1.5 ring-primary/50 shadow-xs scale-105"
                                            : "bg-base-200 hover:bg-base-300 border-base-content/10 opacity-80 hover:opacity-100"
                                    }`}
                                    title={key}
                                >
                                    <Image
                                        unoptimized
                                        src={`${process.env.CDN_URL}/${value.Icon}`}
                                        alt={key}
                                        className={`w-4.5 h-4.5 object-contain ${
                                            isActive ? "theme-path-icon-active" : "theme-path-icon"
                                        }`}
                                        width={20}
                                        height={20}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {Object.keys(mapLightconeRankActive).map((key) => {
                            const isActive = !!mapLightconeRankActive[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        setMapLightconeRankActive({ ...mapLightconeRankActive, [key]: !mapLightconeRankActive[key] })
                                    }}
                                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all duration-200 active-press border ${
                                        isActive
                                            ? "bg-primary text-primary-content border-primary shadow-xs scale-105"
                                            : "bg-base-100 border-base-300 text-base-content/70 hover:text-base-content hover:bg-base-200"
                                    }`}
                                >
                                    {key}★
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 sm:gap-3 pr-1">
                {listLightcone.map((item) => (
                    <div
                        key={item.ID}
                        className="flex flex-col"
                        onClick={() => {
                            if (avatarSelected) {
                                const avatar = avatars[avatarSelected.ID.toString()]
                                if (avatar) {
                                    const profileIndex = avatar.profileSelect
                                    const currentProfile = avatar.profileList?.[profileIndex]
                                    if (currentProfile) {
                                        const newProfileList = [...avatar.profileList]
                                        newProfileList[profileIndex] = {
                                            ...currentProfile,
                                            lightcone: {
                                                level: 80,
                                                item_id: item.ID,
                                                rank: 1,
                                                promotion: 6
                                            }
                                        }
                                        setAvatar({
                                            ...avatar,
                                            profileList: newProfileList
                                        })
                                        setIsOpenLightcone(false)
                                    }
                                }
                            }
                        }}
                    >
                        <LightconeCard data={item} />
                    </div>
                ))}
            </div>
        </div>
    )
}