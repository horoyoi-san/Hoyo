"use client"
import { replaceByParam, getLocaleName } from '@/helper';
import Image from "next/image";
import ParseText from "../parseText";
import useLocaleStore from "@/stores/localeStore";
import useUserDataStore from "@/stores/userDataStore";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import useCurrentDataStore from "@/stores/currentDataStore";
import ExtraEffectList from '../extraInfo';
import { useShallow } from "zustand/react/shallow";
import { LockKeyhole } from "lucide-react";

type SelectedEidolon = { type: "rank" | "ex"; id: number; avatarId: number } | null;

const rankPositions: Record<
    number,
    {
        left: string;
        top: string;
        width: string;
        height: string;
        zIndex: number;
        labelLeft: string;
        labelTop: string;
    }
> = {
    1: { left: "22%", top: "21%", width: "38%", height: "40%", zIndex: 1, labelLeft: "21%", labelTop: "19%" },
    2: { left: "48%", top: "21%", width: "38%", height: "44%", zIndex: 2, labelLeft: "47%", labelTop: "19%" },
    3: { left: "78%", top: "38%", width: "42%", height: "52%", zIndex: 3, labelLeft: "77%", labelTop: "36%" },
    4: { left: "64%", top: "80%", width: "38%", height: "42%", zIndex: 6, labelLeft: "63%", labelTop: "79%" },
    5: { left: "36%", top: "78%", width: "39%", height: "45%", zIndex: 5, labelLeft: "33%", labelTop: "77%" },
    6: { left: "16%", top: "70%", width: "42%", height: "46%", zIndex: 4, labelLeft: "4%", labelTop: "69%" },
};

export default function EidolonsInfo() {
    const { avatarSelected } = useCurrentDataStore(
        useShallow((state) => ({ avatarSelected: state.avatarSelected }))
    )
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    )
    const transI18n = useTranslations("DataPage")
    const [selectedEidolon, setSelectedEidolon] = useState<SelectedEidolon>(null)
    const { setAvatars, avatars } = useUserDataStore(
        useShallow((state) => ({
            setAvatars: state.setAvatars,
            avatars: state.avatars,
        }))
    )

    const charRank = useMemo(() => {
        if (!avatarSelected) return null;
        const avatar = avatars[avatarSelected.ID];
        if (avatar?.enhanced != "") {
            return avatarSelected?.Enhanced?.[avatar?.enhanced]?.Ranks
        }
        return avatarSelected?.Ranks
    }, [avatarSelected, avatars]);

    const charExRanks = useMemo(() => {
        if (!avatarSelected) return null;
        const avatar = avatars[avatarSelected.ID];
        if (avatar?.enhanced != "") {
            const enhanced = avatarSelected?.Enhanced?.[avatar?.enhanced];
            if (enhanced?.ExRanks && Object.keys(enhanced.ExRanks).length > 0) {
                return enhanced.ExRanks;
            }
        }
        if (avatarSelected?.ExRanks && Object.keys(avatarSelected.ExRanks).length > 0) {
            return avatarSelected.ExRanks;
        }
        return null;
    }, [avatarSelected, avatars]);

    const currentRank = avatars[avatarSelected?.ID.toString() || ""]?.data?.rank || 0;
    const currentExRankList = avatars[avatarSelected?.ID.toString() || ""]?.data?.ex_rank_id_list || [];

    const activeSelection = selectedEidolon?.avatarId === avatarSelected?.ID ? selectedEidolon : null;

    const selectedRank = activeSelection?.type === "rank"
        ? Object.values(charRank || {}).find((rank) => Number(rank.Rank) === activeSelection.id) || null
        : null;
    const selectedExRank = activeSelection?.type === "ex"
        ? Object.entries(charExRanks || {}).find(([key]) => Number(key) === activeSelection.id)?.[1] || null
        : null;
    const hasSelectedEidolon = Boolean(selectedRank || selectedExRank);
    const selectedEidolonUnlocked = selectedRank
        ? Number(selectedRank.Rank) <= currentRank
        : selectedExRank
            ? currentExRankList.includes(activeSelection?.id || 0)
            : false;

    const handleToggleRank = (rankNum: number) => {
        if (!avatarSelected) return;
        let newRank = rankNum;
        if (currentRank === rankNum) {
            newRank = rankNum - 1;
        }
        setAvatars({
            ...avatars,
            [avatarSelected.ID]: {
                ...avatars[avatarSelected.ID],
                data: {
                    ...avatars[avatarSelected.ID]?.data,
                    rank: newRank,
                },
            },
        });
    };

    const handleToggleExRank = (exRankId: number) => {
        if (!avatarSelected) return;
        const avatarData = avatars[avatarSelected.ID];
        const currentList = avatarData?.data?.ex_rank_id_list || [];
        let newList: number[];
        if (currentList.includes(exRankId)) {
            newList = currentList.filter((id) => id !== exRankId);
        } else {
            newList = [...currentList, exRankId];
        }
        setAvatars({
            ...avatars,
            [avatarSelected.ID]: {
                ...avatars[avatarSelected.ID],
                data: {
                    ...avatars[avatarSelected.ID]?.data,
                    ex_rank_id_list: newList,
                },
            },
        });
    };

    return (
        <div className="w-full">
            <div className={`grid grid-cols-1 gap-4 ${hasSelectedEidolon ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
                <section
                    aria-label={transI18n("eidolons")}
                    className="relative"
                >
                    <div className="relative mx-auto h-[min(74vh,720px)] min-h-[500px] w-full overflow-hidden sm:min-h-[600px]">
                        {Object.values(charRank || {}).map((rank) => {
                            const rankNum = Number(rank.Rank);
                            const position = rankPositions[rankNum];
                            if (!position || !avatarSelected) return null;

                            const isUnlocked = rankNum <= currentRank;
                            const isSelected = activeSelection?.type === "rank" && activeSelection.id === rankNum;

                            return (
                                <div
                                    key={rankNum}
                                    aria-hidden="true"
                                    onClick={() => setSelectedEidolon({ type: "rank", id: rankNum, avatarId: avatarSelected.ID })}
                                    style={{
                                        left: position.left,
                                        top: position.top,
                                        width: position.width,
                                        height: position.height,
                                        zIndex: isSelected ? 30 : position.zIndex,
                                    }}
                                    className="group absolute -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-xl"
                                >
                                    <Image
                                        className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-all duration-300 ${
                                            isSelected
                                                ? "drop-shadow-[0_0_18px_rgba(var(--color-primary),0.7)]"
                                                : isUnlocked
                                                    ? "drop-shadow-[0_0_10px_rgba(var(--color-primary),0.25)]"
                                                    : "grayscale brightness-50 opacity-80 group-hover:brightness-75"
                                        }`}
                                        src={`${process.env.CDN_URL}/ui/ui3d/rank/_dependencies/textures/${avatarSelected.ID}/${avatarSelected.ID}_rank_${rank.Rank}.webp`}
                                        alt=""
                                        unoptimized
                                        width={320}
                                        height={320}
                                    />
                                </div>
                            );
                        })}

                        {Object.values(charRank || {}).map((rank) => {
                            const rankNum = Number(rank.Rank);
                            const position = rankPositions[rankNum];
                            if (!position) return null;

                            const isUnlocked = rankNum <= currentRank;
                            return (
                                <button
                                    key={`label-${rankNum}`}
                                    type="button"
                                    aria-pressed={activeSelection?.type === "rank" && activeSelection.id === rankNum}
                                    aria-label={`E${rankNum}: ${getLocaleName(locale, rank.Name)}`}
                                    onClick={() => avatarSelected && setSelectedEidolon({ type: "rank", id: rankNum, avatarId: avatarSelected.ID })}
                                    style={{
                                        left: `min(${position.labelLeft}, calc(100% - 180px))`,
                                        top: position.labelTop,
                                    }}
                                    className="absolute z-40 flex max-w-[min(44vw,180px)] items-start gap-2 border-0 bg-transparent p-0 text-left drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] focus-visible:outline-2 focus-visible:outline-primary"
                                >
                                    <span
                                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12 ${
                                            isUnlocked
                                                ? ""
                                                : "rounded-full border-[3px] border-neutral-500 bg-black/75 text-white shadow-lg"
                                        }`}
                                    >
                                        {!isUnlocked && <LockKeyhole className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    </span>
                                    <span className="min-w-0 text-white">
                                        <span className="block text-lg font-semibold leading-none sm:text-2xl">{rankNum}</span>
                                        <span className="block pt-0.5 text-[11px] font-semibold leading-tight sm:text-sm">
                                            {getLocaleName(locale, rank.Name)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}

                        <div className="absolute left-[10%] top-[35%] z-50 flex items-center gap-1">
                            {Object.entries(charExRanks || {}).map(([key, exRank]) => {
                                const exRankId = Number(key);
                                const isUnlocked = currentExRankList.includes(exRankId);
                                const isSelected = activeSelection?.type === "ex" && activeSelection.id === exRankId;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={isSelected}
                                        aria-label={`EX: ${getLocaleName(locale, exRank.Name)}`}
                                        title={`EX: ${getLocaleName(locale, exRank.Name)}`}
                                        onClick={() =>
                                            avatarSelected &&
                                            setSelectedEidolon({ type: "ex", id: exRankId, avatarId: avatarSelected.ID })
                                        }
                                        className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 bg-black/65 p-0 shadow-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent ${
                                            isSelected
                                                ? "border-accent ring-2 ring-accent/70"
                                                : "border-accent/50"
                                        }`}
                                    >
                                        <Image
                                            className={`h-full w-full scale-[1.7] object-contain ${
                                                isUnlocked ? "" : "grayscale opacity-200"
                                            }`}
                                            src={`${process.env.CDN_URL}/${exRank.Image.toLowerCase()}`}
                                            alt=""
                                            unoptimized
                                            width={128}
                                            height={128}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {hasSelectedEidolon && (
                    <aside className="flex h-[min(74vh,720px)] min-h-[500px] flex-col border-l border-base-300/50 bg-black/20 px-3 py-2 sm:px-4 xl:sticky xl:top-4">
                        <div className="flex justify-end">
                            <button
                                type="button"
                                aria-label={transI18n("cancel")}
                                onClick={() => setSelectedEidolon(null)}
                                className="btn btn-ghost btn-sm btn-square"
                            >
                                <Image
                                    src="/theme/icon/arrow-back-1.png"
                                    alt=""
                                    width={24}
                                    height={24}
                                    unoptimized
                                    className="h-5 w-5 object-contain"
                                />
                            </button>
                        </div>

                        {selectedRank && avatarSelected && (
                            <>
                                <div className="mt-1 flex h-[72px] shrink-0 items-center justify-center border border-base-300/70 bg-black/35">
                                    <Image
                                        className="h-14 w-14 object-contain"
                                        src={`${process.env.CDN_URL}/${selectedRank.Icon}`}
                                        alt=""
                                        unoptimized
                                        width={80}
                                        height={80}
                                    />
                                </div>
                                <div className="mt-4 flex items-start gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/60 text-xs font-bold">
                                        {selectedRank.Rank}
                                    </span>
                                    <ParseText
                                        locale={locale}
                                        text={getLocaleName(locale, selectedRank.Name)}
                                        className="pt-0.5 text-left text-sm font-bold leading-tight"
                                    />
                                </div>
                                <div className="mt-3 min-h-0 flex-1 overflow-y-auto text-left text-xs font-medium leading-relaxed text-base-content/90 sm:text-[13px]">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: replaceByParam(getLocaleName(locale, selectedRank.Desc), selectedRank.Param),
                                        }}
                                    />
                                    <ExtraEffectList extras={selectedRank.Extra} locale={locale} />
                                </div>
                            </>
                        )}

                        {selectedExRank && (
                            <>
                                <div className="mt-1 flex h-[72px] shrink-0 items-center justify-center border border-base-300/70 bg-black/35">
                                    <Image
                                        className="h-14 w-14 object-contain"
                                        src={`${process.env.CDN_URL}/${selectedExRank.Icon}`}
                                        alt=""
                                        unoptimized
                                        width={80}
                                        height={80}
                                    />
                                </div>
                                <div className="mt-4 flex items-start gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/60 text-[9px] font-bold">
                                        EX
                                    </span>
                                    <div className="min-w-0">
                                        <ParseText
                                            locale={locale}
                                            text={getLocaleName(locale, selectedExRank.Name)}
                                            className="pt-0.5 text-left text-sm font-bold leading-tight"
                                        />
                                        {selectedExRank.Tag && (
                                            <span className="mt-1 inline-block rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                                                {getLocaleName(locale, selectedExRank.Tag)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 min-h-0 flex-1 overflow-y-auto text-left text-xs font-medium leading-relaxed text-base-content/90 sm:text-[13px]">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: replaceByParam(getLocaleName(locale, selectedExRank.Desc), selectedExRank.Param),
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (!activeSelection) return;
                                if (activeSelection.type === "rank") handleToggleRank(activeSelection.id);
                                else handleToggleExRank(activeSelection.id);
                            }}
                            className={`mt-auto h-9 min-h-0 w-full rounded-full border-0 bg-black text-sm font-bold ${
                                selectedEidolonUnlocked ? "text-error" : "text-primary"
                            }`}
                        >
                            {transI18n(selectedEidolonUnlocked ? "deactivate" : "activate")}
                        </button>
                    </aside>
                )}
            </div>
        </div>
    );
}
