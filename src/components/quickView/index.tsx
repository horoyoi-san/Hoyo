"use client"
import NextImage from "next/image"
import useUserDataStore from "@/stores/userDataStore";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { calcAffixBonus, calcCharacterTotalStats, calcMainAffixBonus, getLocaleName, replaceByParam } from "@/helper";
import { mappingStats } from "@/constant/constant";
import QuickViewRelic from "./quickViewRelic";
import useLocaleStore from "@/stores/localeStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useCurrentDataStore from "@/stores/currentDataStore";
import { useShallow } from "zustand/react/shallow";

export default function QuickView() {
    const { avatars } = useUserDataStore(
        useShallow((state) => ({ avatars: state.avatars }))
    )
    const transI18n = useTranslations("DataPage")
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const { avatarSelected } = useCurrentDataStore(
        useShallow((state) => ({ avatarSelected: state.avatarSelected }))
    )
    const { mainAffix, subAffix, mapRelicSet, mapLightCone, mapAvatar } = useDetailDataStore(
        useShallow((state) => ({
            mainAffix: state.mainAffix,
            subAffix: state.subAffix,
            mapRelicSet: state.mapRelicSet,
            mapLightCone: state.mapLightCone,
            mapAvatar: state.mapAvatar,
        }))
    )

    const avatarData = useMemo(() => {
        if (!avatarSelected) return
        return avatars[avatarSelected?.ID?.toString()]
    }, [avatarSelected, avatars])

    const avatarProfile = useMemo(() => {
        if (!avatarSelected || !avatarData) return
        return avatarData?.profileList?.[avatarData?.profileSelect] ?? avatarData?.profileList?.[0]
    }, [avatarSelected, avatarData])

    const relicEffects = useMemo(() => {
        const avatar = avatars[avatarSelected?.ID?.toString() || ""];
        const relicCount: { [key: string]: number } = {};
        const profile = avatar?.profileList?.[avatar?.profileSelect] ?? avatar?.profileList?.[0];
        if (profile?.relics) {
            for (const relic of Object.values(profile.relics)) {
                if (relic && relic.relic_set_id) {
                    relicCount[relic.relic_set_id] = (relicCount[relic.relic_set_id] || 0) + 1;
                }
            }
        }
        const listEffects: { key: string, count: number }[] = [];
        Object.entries(relicCount).forEach(([key, value]) => {
            if (value >= 2) {
                listEffects.push({ key: key, count: value });
            }
        });
        return listEffects;
    }, [avatars, avatarSelected]);

    const relicStats = useMemo(() => {
        if (!avatarSelected || !avatarProfile?.relics || !mainAffix || !subAffix) return

        return Object.entries(avatarProfile?.relics).map(([key, value]) => {
            const mainAffixMap = mainAffix["5" + key]
            const subAffixMap = subAffix["5"]
            if (!mainAffixMap || !subAffixMap) return
            return {
                img: `${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${value.relic_set_id}_${key}.webp`,
                mainAffix: {
                    property: mainAffixMap?.[value?.main_affix_id]?.Property,
                    level: value?.level,
                    valueAffix: calcMainAffixBonus(mainAffixMap?.[value?.main_affix_id], value?.level),
                    detail: mappingStats?.[mainAffixMap?.[value?.main_affix_id]?.Property]
                },
                subAffix: value?.sub_affixes?.map((subValue) => {
                    return {
                        property: subAffixMap?.[subValue?.sub_affix_id]?.Property,
                        valueAffix: calcAffixBonus(subAffixMap?.[subValue?.sub_affix_id], subValue?.step, subValue?.count),
                        detail: mappingStats?.[subAffixMap?.[subValue?.sub_affix_id]?.Property],
                        step: subValue?.step,
                        count: subValue?.count
                    }
                })
            }
        })
    }, [avatarSelected, avatarProfile, mainAffix, subAffix])

    const characterStats = useMemo(() => {
        return calcCharacterTotalStats({
            avatarSelected,
            avatarData,
            avatarProfile,
            mapAvatar,
            mapLightCone,
            mainAffix,
            subAffix,
            mapRelicSet,
            transI18n,
        });
    }, [
        avatarSelected,
        avatarData,
        avatarProfile,
        mapAvatar,
        mapLightCone,
        mainAffix,
        subAffix,
        mapRelicSet,
        transI18n,
    ]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-1">
            <div className="lg:col-span-6 space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-base-content/10">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-3.5 bg-primary rounded-full" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/90">
                                {transI18n("character")}
                            </h3>
                        </div>
                        <span className="text-xs font-mono font-medium text-base-content/60">
                            {transI18n("level")} {avatarData?.level || 1}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {Object.entries(characterStats || {})?.map(([key, stat], index) => {
                            if (!stat || (key.includes("Add") && stat.value === 0)) return null
                            return (
                                <div
                                    key={index}
                                    className="flex items-center justify-between py-1.5 border-b border-base-content/5"
                                >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <NextImage
                                            src={`${process.env.CDN_URL}/${stat?.icon}`}
                                            unoptimized
                                            alt={stat.name}
                                            width={20}
                                            height={20}
                                            className="h-5 w-5 theme-stat-icon shrink-0 object-contain"
                                        />
                                        <span className="font-medium text-base-content/80 truncate">{stat.name}</span>
                                    </div>
                                    <span className="font-mono font-semibold text-primary shrink-0 text-right">
                                        {stat.value ? stat.unit === "%" ? (stat.value * 100).toFixed(stat.round) : stat.value.toFixed(stat.round) : 0}
                                        <span className="text-[10px] font-normal opacity-80 ml-0.5">{stat.unit}</span>
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {relicEffects.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-base-content/10">
                            <span className="w-1 h-3.5 bg-amber-500 rounded-full" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/90">
                                {transI18n("relics")}
                            </h4>
                        </div>
                        <div className="space-y-1">
                            {relicEffects.map((setEffect, index) => {
                                const relicInfo = mapRelicSet[setEffect.key];
                                if (!relicInfo) return null;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between text-xs py-1.5 border-b border-base-content/5"
                                    >
                                        <div
                                            className="font-medium text-base-content/90 truncate max-w-[80%]"
                                            dangerouslySetInnerHTML={{
                                                __html: replaceByParam(getLocaleName(locale, relicInfo.Name), [])
                                            }}
                                        />
                                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 text-xs shrink-0">
                                            {setEffect.count} Pc
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-6 space-y-2">
                {relicStats?.map((relic, index) => {
                    if (!relic || !avatarSelected) return null
                    return (
                        <QuickViewRelic key={index} relic={relic} avatarInfo={avatarSelected} />
                    )
                })}

                {(!relicStats || !relicStats?.length) && (
                    <div className="p-8 text-center text-base-content/40 text-xs italic">
                        {transI18n("noRelicEquipped")}
                    </div>
                )}
            </div>
        </div>
    )
}