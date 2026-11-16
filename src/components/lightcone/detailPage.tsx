"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import { mappingStats } from "@/constant/constant";
import { calcPromotion, calcRarity, getLocaleName } from "@/helper";
import { replaceByParam } from "@/helper/replaceByParam";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import useUserDataStore from "@/stores/userDataStore";
import { useShallow } from "zustand/react/shallow";
import { getLightconeStats } from "./lightconeStats";

const statIcons = {
    ATK: "AttackDelta",
    DEF: "DefenceDelta",
    HP: "HPDelta",
};

export default function LightconeDetailPage() {
    const router = useRouter();
    const transI18n = useTranslations("DataPage");
    const avatarSelected = useCurrentDataStore((state) => state.avatarSelected);
    const { mapLightCone, baseType } = useDetailDataStore(
        useShallow((state) => ({ mapLightCone: state.mapLightCone, baseType: state.baseType }))
    );
    const locale = useLocaleStore((state) => state.locale);
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({ avatars: state.avatars, setAvatar: state.setAvatar }))
    );
    const [cardRotation, setCardRotation] = useState({ x: 0, y: 0 });
    const [isDraggingCard, setIsDraggingCard] = useState(false);
    const dragStart = useRef<{
        pointerId: number;
        clientX: number;
        clientY: number;
        rotationX: number;
        rotationY: number;
    } | null>(null);

    const userAvatar = avatars[avatarSelected?.ID ?? ""];
    const profileIndex = userAvatar?.profileList?.[userAvatar.profileSelect] ? userAvatar.profileSelect : 0;
    const avatarProfile = userAvatar?.profileList?.[profileIndex];
    const lightcone = avatarProfile?.lightcone ?? null;
    const detail = lightcone ? mapLightCone[String(lightcone.item_id)] : undefined;
    const stats = useMemo(() => getLightconeStats(detail, lightcone), [detail, lightcone]);
    const statValues = Object.fromEntries(stats.map(({ key, value }) => [key, value])) as Record<string, number>;
    const rankData = detail?.Skills.Level[String(lightcone?.rank ?? 1)];
    const abilityText = detail
        ? replaceByParam(getLocaleName(locale, detail.Skills.Desc), rankData?.Param)
        : "";
    const rarity = detail ? calcRarity(detail.Rarity) : 5;

    const updateLightcone = (updates: Partial<NonNullable<typeof lightcone>>) => {
        if (!userAvatar || !avatarProfile || !lightcone) return;
        const profileList = [...userAvatar.profileList];
        profileList[profileIndex] = { ...avatarProfile, lightcone: { ...lightcone, ...updates } };
        setAvatar({ ...userAvatar, profileList });
    };

    const handleCardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            rotationX: cardRotation.x,
            rotationY: cardRotation.y,
        };
        setIsDraggingCard(true);
    };

    const handleCardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const start = dragStart.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const rotationX = Math.max(-80, Math.min(80, start.rotationX - (event.clientY - start.clientY) * 0.5));
        const rotationY = start.rotationY + (event.clientX - start.clientX) * 0.5;
        setCardRotation({ x: rotationX, y: rotationY });
    };

    const handleCardPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStart.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragStart.current = null;
        setIsDraggingCard(false);
    };

    const openPicker = () => router.push("/lightcone-picker", { scroll: false });

    return (
        <main className="detail-page-scroll-lock mx-auto grid min-h-[520px] w-full grid-cols-1 gap-5 pb-3 sm:grid-cols-[minmax(0,1fr)_13rem] lg:h-[calc(100dvh-11rem)] lg:min-h-[500px]">
            <section className="relative flex min-h-[360px] items-center justify-center overflow-visible">
                <div
                    className={`lightcone-card-stage relative h-[330px] w-[235px] sm:h-[360px] sm:w-[255px] ${isDraggingCard ? "is-dragging" : ""}`}
                    role="group"
                    aria-label={transI18n("lightcone")}
                    tabIndex={0}
                    onPointerDown={handleCardPointerDown}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={handleCardPointerEnd}
                    onPointerCancel={handleCardPointerEnd}
                    onLostPointerCapture={handleCardPointerEnd}
                    onKeyDown={(event) => {
                        if (event.key === "ArrowLeft") setCardRotation((value) => ({ ...value, y: value.y - 10 }));
                        if (event.key === "ArrowRight") setCardRotation((value) => ({ ...value, y: value.y + 10 }));
                        if (event.key === "ArrowUp") setCardRotation((value) => ({ ...value, x: Math.max(-80, value.x - 10) }));
                        if (event.key === "ArrowDown") setCardRotation((value) => ({ ...value, x: Math.min(80, value.x + 10) }));
                    }}
                >
                    <div
                        className="lightcone-card-model"
                        style={{ transform: `rotateX(${cardRotation.x}deg) rotateY(${cardRotation.y}deg)` }}
                    >
                        <div className="lightcone-card-frame absolute inset-[4%]">
                            <div className="lightcone-card-art">
                                {detail?.Image?.ImagePath ? (
                                    <Image
                                        src={`${process.env.CDN_URL}/${detail.Image.ImagePath}`}
                                        alt={getLocaleName(locale, detail.Name)}
                                        fill
                                        unoptimized
                                        priority
                                        sizes="255px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <>
                                        <Image
                                            src="/theme/icon/lightcone-frame/LightCore_Empty.webp"
                                            alt=""
                                            fill
                                            unoptimized
                                            className="scale-[0.88] object-contain opacity-20 mix-blend-screen"
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center text-4xl font-light text-white/75">+</span>
                                    </>
                                )}
                            </div>
                            {!detail && (
                                <Image
                                    src="/theme/icon/lightcone-frame/FrameLightConeEmpty.webp"
                                    alt=""
                                    fill
                                    unoptimized
                                    className="pointer-events-none z-20 object-fill opacity-75"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <aside className="relative flex min-w-0 flex-col gap-1 pb-14 text-[12px] sm:pt-3">
                <h1 className="truncate text-[17px] font-bold leading-tight">
                    {detail ? getLocaleName(locale, detail.Name) : transI18n("noLightconeEquipped")}
                </h1>
                {detail && baseType[detail.BaseType] && (
                    <div className="flex items-center gap-1.5 rounded-sm bg-white/10 px-1.5 py-0.5 text-[11px]">
                        <Image
                            src={`${process.env.CDN_URL}/${baseType[detail.BaseType].Icon}`}
                            alt=""
                            width={14}
                            height={14}
                            unoptimized
                            className="h-3.5 w-3.5 object-contain"
                        />
                        <span>{transI18n(detail.BaseType.toLowerCase())}</span>
                    </div>
                )}

                <div className="flex h-4 items-center gap-1 text-[13px] leading-none text-amber-300" aria-label={`${rarity} stars`}>
                    {Array.from({ length: rarity }, (_, index) => <span key={index}>◆</span>)}
                </div>

                <div className="flex items-center justify-between border-b border-white/35 pb-1 text-[11px] text-white/75">
                    <span>Lv. {lightcone?.level ?? 1} /80</span>
                    <span>{lightcone?.rank ? `S${lightcone.rank}` : ""}</span>
                </div>
                {lightcone && (
                    <input
                        type="range"
                        min="1"
                        max="80"
                        value={lightcone.level}
                        aria-label={transI18n("level")}
                        onChange={(event) => {
                            const level = Number(event.target.value);
                            updateLightcone({ level, promotion: calcPromotion(level) });
                        }}
                        className="range range-primary range-xs -mt-1 h-2 min-h-0 w-full"
                    />
                )}

                <div className="mt-1 border-y border-white/30">
                    {[
                        ["ATK", transI18n("atk")],
                        ["DEF", transI18n("def")],
                        ["HP", transI18n("hp")],
                    ].map(([key, label]) => {
                        const icon = mappingStats[statIcons[key as keyof typeof statIcons]]?.icon;
                        return (
                            <div key={key} className="flex h-5 items-center justify-between gap-2 border-b border-white/10 last:border-b-0">
                                <span className="flex min-w-0 items-center gap-1.5">
                                    {icon && (
                                        <Image
                                            src={`${process.env.CDN_URL}/${icon}`}
                                            alt=""
                                            width={12}
                                            height={12}
                                            unoptimized
                                            className="h-3 w-3 object-contain"
                                        />
                                    )}
                                    <span>{label}</span>
                                </span>
                                <span className="font-mono">{Math.round(statValues[key] ?? 0).toLocaleString()}</span>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-1 text-[11px] font-semibold text-white/75">{transI18n("lightconeAbility")}</p>
                {detail && lightcone && (
                    <div className="max-h-44 overflow-y-auto pr-1 text-[11px] leading-[1.4] text-white/85">
                        <div className="mb-1 flex items-center gap-1 text-white/70">
                            <span className="text-amber-300">◆</span>
                            <span>{transI18n(detail.BaseType.toLowerCase())}</span>
                            <span className="ml-auto">{transI18n("superimpositionRank")}</span>
                            <select
                                aria-label={transI18n("superimpositionRank")}
                                value={lightcone.rank}
                                onChange={(event) => updateLightcone({ rank: Number(event.target.value) })}
                                className="select select-xs h-5 min-h-0 rounded-sm border-0 bg-white/10 px-1 py-0 text-[10px]"
                            >
                                {Array.from({ length: Math.min(detail.MaxRank, 5) }, (_, index) => index + 1).map((rank) => (
                                    <option key={rank} value={rank}>S{rank}</option>
                                ))}
                            </select>
                        </div>
                        <p className="mb-1 font-semibold">{getLocaleName(locale, detail.Skills.Name)}</p>
                        <div dangerouslySetInnerHTML={{ __html: abilityText }} />
                    </div>
                )}

                <button
                    type="button"
                    onClick={openPicker}
                    className="btn btn-sm absolute bottom-0 right-0 h-7 min-h-0 w-full rounded-full border border-white/80 bg-white/90 text-[11px] font-bold text-black shadow-sm hover:bg-white"
                >
                    {transI18n("equipLightcone")}
                </button>
            </aside>
        </main>
    );
}
