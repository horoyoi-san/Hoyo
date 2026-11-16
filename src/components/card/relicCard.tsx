"use client";

import useRelicMakerStore from "@/stores/relicMakerStore";
import useUserDataStore from "@/stores/userDataStore";
import { useShallow } from "zustand/react/shallow";
import Image from "next/image";
import { useMemo, memo } from "react";
import { useTranslations } from "next-intl";

interface RelicCardProps {
    slot: string
    avatarId: string
}

const getRarityColor = (rarity: string) => {
    switch (rarity) {
        case '6': 
            return 'border-amber-400/90 shadow-[0_0_16px_rgba(251,191,36,0.4)] bg-linear-to-br from-amber-600 via-amber-400 to-amber-500';
        case '5': 
            return 'border-purple-400/90 shadow-[0_0_16px_rgba(192,132,252,0.4)] bg-linear-to-br from-purple-700 via-purple-400 to-purple-500';
        case '4': 
            return 'border-sky-400/90 shadow-[0_0_16px_rgba(56,189,248,0.4)] bg-linear-to-br from-blue-700 via-blue-400 to-sky-500';
        case '3': 
            return 'border-emerald-400/90 shadow-[0_0_16px_rgba(52,211,153,0.4)] bg-linear-to-br from-emerald-700 via-emerald-400 to-emerald-500';
        default: 
            return 'border-base-content/20 bg-base-300';
    }
};

export const slotIconMap: Record<string, { icon: string; key: string }> = {
    '1': { icon: '/relics/HEAD.png', key: 'HEAD' },
    '2': { icon: '/relics/HAND.png', key: 'HAND' },
    '3': { icon: '/relics/BODY.png', key: 'BODY' },
    '4': { icon: '/relics/FOOT.png', key: 'FOOT' },
    '5': { icon: '/relics/NECK.png', key: 'NECK' },
    '6': { icon: '/relics/OBJECT.png', key: 'OBJECT' },
    'HEAD': { icon: '/relics/HEAD.png', key: 'HEAD' },
    'HAND': { icon: '/relics/HAND.png', key: 'HAND' },
    'BODY': { icon: '/relics/BODY.png', key: 'BODY' },
    'FOOT': { icon: '/relics/FOOT.png', key: 'FOOT' },
    'NECK': { icon: '/relics/NECK.png', key: 'NECK' },
    'OBJECT': { icon: '/relics/OBJECT.png', key: 'OBJECT' },
};

function RelicCard({ slot, avatarId }: RelicCardProps) {
    const transI18n = useTranslations("DataPage");
    const avatar = useUserDataStore((state) => state.avatars[avatarId]);
    const { selectedRelicSlot } = useRelicMakerStore(
        useShallow((state) => ({ selectedRelicSlot: state.selectedRelicSlot }))
    )

    const slotInfo = slotIconMap[slot];
    const slotDisplayName = slotInfo ? (transI18n(slotInfo.key) || slotInfo.key) : slot;

    const relicDetail = useMemo(() => {
        if (avatar) {
            const profile = avatar.profileList?.[avatar.profileSelect] ?? avatar.profileList?.[0];
            return profile?.relics?.[slot] || null;
        }
        return null;
    }, [avatar, slot]);

    const isSelected = selectedRelicSlot === slot;

    return (
        <div className="flex flex-col items-center select-none group cursor-pointer">
            {relicDetail ? (
                <div className="flex flex-col items-center">
                    <div
                        className={`
                            relative w-22 h-22 sm:w-24 sm:h-24 rounded-full border-3
                            ${getRarityColor(relicDetail.relic_id.toString()[0])}
                            flex items-center justify-center
                            transition-all duration-200
                            ${isSelected ? 'ring-2 ring-primary/70 shadow-md ring-offset-2 ring-offset-base-100' : 'hover:border-primary/60'}
                        `}
                    >
                        <Image
                            unoptimized
                            src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${relicDetail.relic_set_id}_${slot}.webp`}
                            alt={transI18n("relic")}
                            width={124}
                            height={124}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md"
                        />

                        <div className="absolute -bottom-2 bg-base-100 border border-base-content/15 shadow-md rounded-full px-2 py-0.5">
                            <span className="text-xs font-mono font-bold text-primary">+{relicDetail.level}</span>
                        </div>
                    </div>

                    {slotInfo && (
                        <div className="flex items-center gap-1.5 justify-center mt-2.5">
                            <Image
                                unoptimized
                                src={slotInfo.icon}
                                alt={slotDisplayName}
                                width={18}
                                height={18}
                                className="w-4 h-4 object-contain theme-stat-icon opacity-85"
                            />
                            <span className="text-xs font-bold text-base-content">{slotDisplayName}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <div
                        className={`
                            relative w-22 h-22 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-base-content/20
                            bg-base-200/60 flex items-center justify-center
                            transition-all duration-200 group-hover:border-primary/60
                            ${isSelected ? 'ring-2 ring-primary/70 border-solid bg-primary/10 ring-offset-2 ring-offset-base-100' : ''}
                        `}
                    >
                        <div className="flex flex-col items-center justify-center gap-1 text-base-content/40 group-hover:text-primary transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>

                        <div className="absolute -bottom-2 bg-base-100 border border-base-content/15 shadow-md rounded-full px-2 py-0.5">
                            <span className="text-xs font-mono font-bold text-base-content/40">+0</span>
                        </div>
                    </div>

                    {slotInfo && (
                        <div className="flex items-center gap-1.5 justify-center mt-2.5">
                            <Image
                                unoptimized
                                src={slotInfo.icon}
                                alt={slotDisplayName}
                                width={18}
                                height={18}
                                className="w-4 h-4 object-contain theme-stat-icon opacity-85"
                            />
                            <span className="text-xs font-bold text-base-content">{slotDisplayName}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default memo(RelicCard);