"use client"

import NextImage from "next/image"
import { AvatarDetail, RelicShowcaseType } from "@/types";
import { useTranslations } from "next-intl";

export default function RelicShowcase({
    relic,
    avatarInfo,
}: {
    relic: RelicShowcaseType;
    avatarInfo: AvatarDetail;
}) {
    const transI18n = useTranslations("DataPage");
    return (
        <div
            className="relative w-full flex flex-row items-center rounded-s-lg border-l-2 p-1 border-yellow-600/60 bg-linear-to-r from-yellow-600/20 to-transparent"
        >
            <div className="absolute inset-0 rounded-s-lg pointer-events-none"></div>

            <div className="flex relative">
                <div className="absolute inset-0 rounded-lg blur-lg -z-10"></div>
                <NextImage
                    src={relic?.img || ""}
                    unoptimized
                    width={78}
                    height={78}
                    alt={transI18n("relic")}
                    className="h-19.5 w-19.5 rounded-lg"
                />

                <div
                    className="absolute text-yellow-400 font-bold z-10 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                    style={{
                        left: '0.65rem',
                        bottom: '-0.45rem',
                        fontSize: '1.05rem',
                        letterSpacing: '-0.1em',
                    }}
                >
                    ✦✦✦✦✦
                </div>
            </div>

            <div className="flex w-1/6 flex-col items-center justify-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500/15 rounded-full blur-md -z-10"></div>
                    {relic?.mainAffix?.detail?.icon ? (
                        <NextImage
                            src={`${process.env.CDN_URL}/${relic.mainAffix.detail.icon}`}
                            unoptimized
                            width={35}
                            height={35}
                            alt={relic?.mainAffix?.detail?.name || transI18n("relic")}
                            className="h-8.75 w-8.75"
                        />
                    ) : (
                        <div className="h-8.75 w-8.75" />
                    )}
                </div>
                <span className="text-base text-yellow-400 font-semibold drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">
                    {relic?.mainAffix?.valueAffix + (relic?.mainAffix?.detail?.unit || "")}
                </span>
                <span className="bg-black/20 rounded px-1.5 py-0.5 text-xs border border-white/10">
                    +{relic?.mainAffix?.level}
                </span>
            </div>

            <div style={{ opacity: 0.3, height: '78px', borderLeftWidth: '1px' }}></div>

            <div className="grid w-[65%] m-2 grid-cols-2 gap-1">
                {relic?.subAffix?.map((subAffix, index) => {
                    if (!subAffix) return null
                    return (
                        <div key={index} className="flex flex-col">
                            <div className="relative flex flex-row items-center bg-black/20 rounded-md p-1 border border-white/5 min-w-0">
                                {subAffix?.detail?.icon ? (
                                    <NextImage
                                        src={`${process.env.CDN_URL}/${subAffix?.detail?.icon}` || ""}
                                        unoptimized
                                        width={32}
                                        height={32}
                                        alt={subAffix?.detail?.name || transI18n("relic")}
                                        className="h-6 w-6 shrink-0"
                                    />
                                ) : (
                                    <div className="h-6 w-6 bg-black/60 rounded flex items-center justify-center border border-white/10 shrink-0">
                                        <span className="text-xs text-white/50">?</span>
                                    </div>
                                )}
                                <span className="text-xs text-gray-200 ml-0.5 truncate flex-1 min-w-0">
                                    +{subAffix?.valueAffix + (subAffix?.detail?.unit || "")}
                                </span>
                                {
                                    (avatarInfo?.Relics?.SubAffixPropertyList?.findIndex((item) => item === subAffix?.property) !== -1) && (
                                        <span className="ml-1 bg-yellow-600/20 text-yellow-400 rounded-full px-1 py-0.5 text-[10px] font-semibold border border-yellow-600/30 shrink-0 leading-none">
                                            {subAffix?.count}
                                        </span>
                                    )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
