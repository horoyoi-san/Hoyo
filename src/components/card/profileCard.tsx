"use client";


import { AvatarProfileCardType } from '@/types';
import useLocaleStore from '@/stores/localeStore';
import Image from 'next/image';
import ParseText from '../parseText';
import useDetailDataStore from '@/stores/detailDataStore';
import { getLocaleName } from '@/helper/getName';
import { useShallow } from 'zustand/react/shallow';
import { useTranslations } from 'next-intl';

export default function ProfileCard({ 
    profile, 
    selectedProfile, 
    onProfileToggle 
}: { 
    profile: AvatarProfileCardType, 
    selectedProfile: AvatarProfileCardType[], 
    onProfileToggle: (profileId: AvatarProfileCardType) => void 
}) {
    const transI18n = useTranslations("DataPage");
    const isSelected = selectedProfile.some((selectedProfile) => selectedProfile.key === profile.key);
    const { mapLightCone } = useDetailDataStore(
        useShallow((state) => ({ mapLightCone: state.mapLightCone }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    );

    return (
        <div
            className={`group rounded-2xl p-4 border transition-all duration-200 cursor-pointer select-none ${
                isSelected
                    ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/40'
                    : 'bg-base-200/80 border-base-300 hover:border-primary/40 hover:bg-base-200'
            }`}
            onClick={() => onProfileToggle(profile)}
        >
            {profile.lightcone && (
                <div className="p-2 rounded-xl bg-base-100 border border-base-300 text-center mb-3">
                    <div className="h-32 flex items-center justify-center mb-2">
                        <Image
                            unoptimized
                            src={`${process.env.CDN_URL}/spriteoutput/lightconemaxfigures/${profile.lightcone.item_id}.webp`}
                            alt={transI18n("lightcone")}
                            width={240}
                            height={300}
                            className="h-full w-auto object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
                        />
                    </div>
                    <div className="text-sm font-bold truncate">
                        <ParseText
                            text={getLocaleName(locale, mapLightCone?.[profile.lightcone.item_id.toString()]?.Name)}
                            locale={locale}
                        />
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-xs font-mono font-medium text-base-content/70">Lv.{profile.lightcone.level}</span>
                        <span className="text-xs font-mono font-bold text-primary">S{profile.lightcone.rank}</span>
                    </div>
                </div>
            )}

            {Object.keys(profile.relics).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-xl bg-base-100 border border-base-300">
                    {Object.values(profile.relics).map((relic, index) => (
                        <div key={index} className="relative group/relic">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-base-200 border border-amber-500/40">
                                <Image
                                    unoptimized
                                    src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${relic.relic_set_id}_${relic.relic_id.toString()[relic.relic_id.toString().length - 1]}.webp`}
                                    alt={transI18n("relic")}
                                    width={32}
                                    height={32}
                                    className="w-6 h-6 object-contain"
                                />
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black/80 text-[9px] font-mono font-bold text-amber-400 px-1 rounded-full border border-white/10">
                                +{relic.level}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};