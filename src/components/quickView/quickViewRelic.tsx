"use client"
import NextImage from "next/image"
import { AvatarDetail, RelicShowcaseType } from "@/types";
import { useTranslations } from "next-intl";

export default function QuickViewRelic({
    relic,
    avatarInfo,
}: {
    relic: RelicShowcaseType;
    avatarInfo: AvatarDetail;
}) {
    const transI18n = useTranslations("DataPage");
    return (
        <div className="flex items-center gap-3 py-2 px-1 border-b border-base-content/10 last:border-b-0">
            <div className="relative shrink-0 flex flex-col items-center">
                <NextImage
                    src={relic?.img || ""}
                    unoptimized
                    width={48}
                    height={48}
                    alt={transI18n("relic")}
                    className="h-12 w-12 object-contain"
                />
            </div>

            <div className="flex w-20 shrink-0 flex-col items-start justify-center">
                <div className="flex items-center gap-1">
                    {relic?.mainAffix?.detail?.icon ? (
                        <NextImage
                            src={`${process.env.CDN_URL}/${relic.mainAffix.detail.icon}`}
                            unoptimized
                            width={16}
                            height={16}
                            alt={relic.mainAffix.detail.name || transI18n("relic")}
                            className="h-4 w-4 theme-stat-icon shrink-0 object-contain"
                        />
                    ) : null}
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {relic?.mainAffix?.valueAffix + (relic?.mainAffix?.detail?.unit || "")}
                    </span>
                </div>
                <span className="text-[10px] font-mono text-base-content/50 ml-0.5">
                    +{relic?.mainAffix?.level}
                </span>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1">
                {relic?.subAffix?.map((subAffix, index) => {
                    if (!subAffix) return null
                    const isOptimalStat = avatarInfo?.Relics?.SubAffixPropertyList?.includes(subAffix?.property)

                    return (
                        <div
                            key={index}
                            className={`flex items-center justify-between py-0.5 min-w-0 ${
                                isOptimalStat
                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                    : "text-base-content/75"
                            }`}
                        >
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                {subAffix?.detail?.icon ? (
                                    <NextImage
                                        src={`${process.env.CDN_URL}/${subAffix.detail.icon}`}
                                        unoptimized
                                        width={14}
                                        height={14}
                                        alt={subAffix?.detail?.name || transI18n("relic")}
                                        className="h-3.5 w-3.5 theme-stat-icon shrink-0 object-contain"
                                    />
                                ) : null}
                                <span className="text-xs font-mono truncate">
                                    +{subAffix?.valueAffix + (subAffix?.detail?.unit || "")}
                                </span>
                            </div>

                            {isOptimalStat && subAffix?.count ? (
                                <span className="ml-1 text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 shrink-0 font-mono">
                                    ({subAffix?.count})
                                </span>
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
