"use client";

import { getLocaleName } from '@/helper';
import useLocaleStore from '@/stores/localeStore';
import { useShallow } from 'zustand/react/shallow';
import ParseText from '../parseText';
import Image from 'next/image';
import { LightConeDetail } from '@/types';
import { memo } from 'react';

interface LightconeCardProps {
    data: LightConeDetail
}

function LightconeCard({ data }: LightconeCardProps) {
    const { locale } = useLocaleStore(useShallow((state) => ({ locale: state.locale })));
    const text = getLocaleName(locale, data.Name);

    const is5Star = data.Rarity === "CombatPowerLightconeRarity5";
    const is4Star = data.Rarity === "CombatPowerLightconeRarity4";

    return (
        <li className="group relative flex flex-col items-center rounded-xl overflow-hidden bg-base-100 border border-base-content/10 shadow-xs hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer select-none w-full list-none">
            <div
                className={`w-full relative aspect-3/4 flex items-center justify-center overflow-hidden bg-linear-to-b ${
                    is5Star
                        ? "from-yellow-400 via-amber-500/85 to-amber-700/70"
                        : is4Star
                        ? "from-purple-400 via-purple-600/80 to-purple-800/60"
                        : "from-sky-400 via-blue-600/80 to-blue-800/60"
                }`}
            >
                <Image
                    loading="lazy"
                    src={`${process.env.CDN_URL}/${data?.Image?.ThumbnailPath}`}
                    unoptimized
                    width={348}
                    height={408}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    alt={data?.Name?.en || "Lightcone"}
                />
            </div>

            <div className="w-full min-h-12 px-1.5 py-1 text-center flex items-center justify-center bg-base-100 shrink-0">
                <ParseText
                    locale={locale}
                    text={text}
                    className="font-bold text-xs sm:text-[13px] leading-snug line-clamp-2 text-base-content group-hover:text-primary transition-colors text-center"
                />
            </div>
        </li>
    );
}

export default memo(LightconeCard);
