"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { mappingRelicSlot, mappingStats } from "@/constant/constant";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import useRelicMakerStore from "@/stores/relicMakerStore";
import useRelicInventoryStore, { isRelicInventorySlot } from "@/stores/relicInventoryStore";
import { useShallow } from "zustand/react/shallow";
import { calcAffixBonus, getLocaleName, randomPartition, randomStep, replaceByParam } from "@/helper";
import { slotIconMap } from "@/components/card/relicCard";
import type { RelicStore } from "@/types";

type RolledStat = {
    affixId: string;
    property: string;
    rollCount: number;
    stepCount: number;
};

const MAX_SELECTED_SUB_STATS = 4;

export default function RelicMakerPage() {
    const router = useRouter();
    const transI18n = useTranslations("DataPage");
    const avatarSelected = useCurrentDataStore((state) => state.avatarSelected);
    const locale = useLocaleStore((state) => state.locale);
    const { mapRelicSet, mainAffix, subAffix } = useDetailDataStore(
        useShallow((state) => ({
            mapRelicSet: state.mapRelicSet,
            mainAffix: state.mainAffix,
            subAffix: state.subAffix,
        }))
    );
    const inventoryRelics = useRelicInventoryStore((state) => state.relics);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedSubStatIds, setSelectedSubStatIds] = useState<string[]>([]);
    const [hasChangedSubStats, setHasChangedSubStats] = useState(false);
    const [rolledStats, setRolledStats] = useState<RolledStat[] | null>(null);
    const editInstanceId = typeof window === "undefined"
        ? undefined
        : new URLSearchParams(window.location.search).get("edit") || undefined;
    const {
        selectedRelicSlot,
        selectedRelicSet,
        setSelectedRelicSlot,
        setSelectedRelicSet,
        selectedMainStat,
        setSelectedMainStat,
        setSelectedRelicLevel,
        setListSelectedSubStats,
        resetSubStat,
        resetHistory,
    } = useRelicMakerStore(
        useShallow((state) => ({
            selectedRelicSlot: state.selectedRelicSlot,
            selectedRelicSet: state.selectedRelicSet,
            setSelectedRelicSlot: state.setSelectedRelicSlot,
            setSelectedRelicSet: state.setSelectedRelicSet,
            selectedMainStat: state.selectedMainStat,
            setSelectedMainStat: state.setSelectedMainStat,
            setSelectedRelicLevel: state.setSelectedRelicLevel,
            setListSelectedSubStats: state.setListSelectedSubStats,
            resetSubStat: state.resetSubStat,
            resetHistory: state.resetHistory,
        }))
    );
    const showSettings = isSettingsOpen || (Boolean(editInstanceId) && Boolean(selectedRelicSet));
    const editRelic = editInstanceId
        ? inventoryRelics.find((relic) => relic.instanceId === editInstanceId)
        : undefined;
    const { addRelic, removeRelic } = useRelicInventoryStore(
        useShallow((state) => ({
            addRelic: state.addRelic,
            removeRelic: state.removeRelic,
        }))
    );

    const relicSets = useMemo(
        () => Object.entries(mapRelicSet)
            .filter(([, set]) => Object.keys(set.Parts).length > 0)
            .sort(([, a], [, b]) => Number(a.IsPlanarSuit) - Number(b.IsPlanarSuit)),
        [mapRelicSet]
    );
    const cavernSets = relicSets.filter(([, set]) => !set.IsPlanarSuit);
    const planarSets = relicSets.filter(([, set]) => set.IsPlanarSuit);
    const displayedSetId = selectedRelicSet || cavernSets[0]?.[0] || planarSets[0]?.[0] || "";
    const selectedSet = mapRelicSet[displayedSetId];
    const availableParts = selectedSet
        ? Object.entries(selectedSet.Parts).flatMap(([partKey, part]) => {
            const slot = Object.entries(mappingRelicSlot).find(([, key]) => key === partKey)?.[0];
            return slot ? [{ slot, partKey, part }] : [];
        }).sort((a, b) => Number(a.slot) - Number(b.slot))
        : [];
    const featuredPart = availableParts.find(({ slot }) => slot === selectedRelicSlot) ?? availableParts[0];
    const selectedPart = selectedSet?.Parts[mappingRelicSlot[selectedRelicSlot]];
    const mainStatOptions = Object.entries(mainAffix[`5${selectedRelicSlot}`] || {});
    const selectedMainProperty = mainAffix[`5${selectedRelicSlot}`]?.[selectedMainStat]?.Property;
    const subStatOptions = Object.entries(subAffix["5"] || {}).filter(
        ([, affix], index, entries) => affix.Property !== selectedMainProperty &&
            entries.findIndex(([, candidate]) => candidate.Property === affix.Property) === index
    );
    const existingRolledStats = editRelic?.sub_affixes.map((sub) => {
        const affixId = String(sub.sub_affix_id);
        return {
            affixId,
            property: subAffix["5"]?.[affixId]?.Property || "",
            rollCount: sub.count,
            stepCount: sub.step,
        };
    });
    const displayedRolledStats = rolledStats ?? existingRolledStats ?? null;
    const displayedSubStatIds = hasChangedSubStats
        ? selectedSubStatIds
        : editRelic?.sub_affixes.map((sub) => String(sub.sub_affix_id)) ?? selectedSubStatIds;

    useEffect(() => {
        const querySlot = new URLSearchParams(window.location.search).get("slot");
        if (editInstanceId && !editRelic) {
            toast.error(transI18n("noRelicInventory"));
            router.replace(`/relic-picker?slot=${querySlot || "1"}`, { scroll: false });
            return;
        }

        const slot = editRelic?.slot
            ?? (querySlot && ["1", "2", "3", "4", "5", "6"].includes(querySlot) ? querySlot : "1");
        setSelectedRelicSlot(slot);
        resetSubStat();
        resetHistory(null);
        setSelectedRelicSet(editRelic ? String(editRelic.relic_set_id) : "");
        setSelectedMainStat(editRelic ? String(editRelic.main_affix_id) : "");
        setSelectedRelicLevel(editRelic?.level ?? 15);
        if (editRelic) {
            setListSelectedSubStats(editRelic.sub_affixes.map((sub) => {
                const affixId = String(sub.sub_affix_id);
                return {
                    affixId,
                    property: subAffix["5"]?.[affixId]?.Property || "",
                    rollCount: sub.count,
                    stepCount: sub.step,
                };
            }));
        }
    }, [editInstanceId, editRelic, inventoryRelics, resetHistory, resetSubStat, router, setListSelectedSubStats, setSelectedMainStat, setSelectedRelicLevel, setSelectedRelicSet, setSelectedRelicSlot, subAffix, transI18n]);

    const selectPart = (slot: string) => {
        setSelectedRelicSlot(slot);
        setSelectedRelicSet(displayedSetId);
        setSelectedMainStat("");
        setSelectedRelicLevel(15);
        resetSubStat();
        resetHistory(null);
        setSelectedSubStatIds([]);
        setHasChangedSubStats(false);
        setRolledStats([]);
        setIsSettingsOpen(true);
    };

    const toggleSubStat = (affixId: string) => {
        setHasChangedSubStats(true);
        setRolledStats([]);
        setSelectedSubStatIds((selected) => {
            const current = hasChangedSubStats ? selected : displayedSubStatIds;
            if (current.includes(affixId)) return current.filter((id) => id !== affixId);
            return current.length < MAX_SELECTED_SUB_STATS ? [...current, affixId] : current;
        });
    };

    const randomizeStats = () => {
        const mainOptions = mainStatOptions;
        if (mainOptions.length === 0) return;
        const mainStatId = selectedMainStat || mainOptions[Math.floor(Math.random() * mainOptions.length)][0];
        const mainProperty = mainAffix[`5${selectedRelicSlot}`]?.[mainStatId]?.Property;
        const candidates = Object.entries(subAffix["5"] || {}).filter(
            ([, affix], index, entries) => affix.Property !== mainProperty &&
                entries.findIndex(([, candidate]) => candidate.Property === affix.Property) === index
        );
        const chosen: RolledStat[] = [];

        while (chosen.length < 4 && candidates.length > 0) {
            const [affixId, affix] = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
            chosen.push({ affixId, property: affix.Property, rollCount: 0, stepCount: 0 });
        }

        if (chosen.length !== 4) {
            toast.error(transI18n("pleaseSelectAllOptions"));
            return;
        }

        setSelectedMainStat(mainStatId);
        setSelectedSubStatIds(chosen.map(({ affixId }) => affixId));
        setHasChangedSubStats(true);
        setRolledStats(chosen);
        setListSelectedSubStats(chosen);
        resetHistory(null);
    };

    const randomizeUpgrade = () => {
        if (mainStatOptions.length === 0) return;

        const mainStatId = selectedMainStat || mainStatOptions[Math.floor(Math.random() * mainStatOptions.length)][0];
        const mainProperty = mainAffix[`5${selectedRelicSlot}`]?.[mainStatId]?.Property;
        const affixMap = subAffix["5"] || {};
        let baseStats = displayedRolledStats?.length === 4
            ? displayedRolledStats.map((stat) => ({ ...stat, rollCount: 0, stepCount: 0 }))
                .filter((stat) => stat.property !== mainProperty)
            : [];
        if (baseStats.length !== 4) {
            const candidates = Object.entries(affixMap).filter(
                ([, affix], index, entries) => affix.Property !== mainProperty &&
                    entries.findIndex(([, candidate]) => candidate.Property === affix.Property) === index
            );
            baseStats = displayedSubStatIds
                .map((affixId) => affixMap[affixId] ? {
                    affixId,
                    property: affixMap[affixId].Property,
                    rollCount: 0,
                    stepCount: 0,
                } : null)
                .filter((stat): stat is NonNullable<typeof stat> => stat !== null && stat.property !== mainProperty);
            while (baseStats.length < 4 && candidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * candidates.length);
                const [affixId, affix] = candidates.splice(randomIndex, 1)[0];
                if (baseStats.some((stat) => stat.property === affix.Property)) continue;
                baseStats.push({ affixId, property: affix.Property, rollCount: 0, stepCount: 0 });
            }
        }

        if (baseStats.length !== 4) {
            toast.error(transI18n("pleaseSelectAllOptions"));
            return;
        }

        const rolls = randomPartition(9, baseStats.length);
        const nextStats = baseStats.map((stat, index) => ({
            ...stat,
            rollCount: rolls[index],
            stepCount: randomStep(rolls[index]),
        }));
        setSelectedMainStat(mainStatId);
        setSelectedSubStatIds(nextStats.map(({ affixId }) => affixId));
        setHasChangedSubStats(true);
        setRolledStats(nextStats);
        setListSelectedSubStats(nextStats);
        resetHistory(null);
    };

    const adjustSubStatRoll = (affixId: string, change: number) => {
        if (!displayedRolledStats) return;

        const nextStats = displayedRolledStats.map((stat) => {
            if (stat.affixId !== affixId) return stat;
            const rollCount = Math.max(0, stat.rollCount + change);
            return {
                ...stat,
                rollCount,
                stepCount: Math.min(stat.stepCount, rollCount * 2),
            };
        });
        setRolledStats(nextStats);
        setListSelectedSubStats(nextStats);
    };

    const saveRelic = () => {
        const relicSetId = selectedRelicSet || displayedSetId;
        if (!isRelicInventorySlot(selectedRelicSlot) || !relicSetId || !selectedMainStat || displayedRolledStats?.length !== 4) {
            toast.error(transI18n("pleaseSelectAllOptions"));
            return;
        }

        const relic: RelicStore = {
            level: editRelic?.level ?? 15,
            relic_id: Number(`6${relicSetId}${selectedRelicSlot}`),
            relic_set_id: Number(relicSetId),
            main_affix_id: Number(selectedMainStat),
            sub_affixes: displayedRolledStats.map((sub) => ({
                sub_affix_id: Number(sub.affixId),
                count: sub.rollCount,
                step: sub.stepCount,
            })),
        };
        if (editInstanceId) removeRelic(editInstanceId);
        addRelic(selectedRelicSlot, relic);
        toast.success(transI18n("relicSavedSuccessfully"));
        router.push(`/relic-picker?slot=${selectedRelicSlot}`, { scroll: false });
    };

    const handleBack = () => {
        if (showSettings && !editInstanceId) {
            setIsSettingsOpen(false);
            return;
        }
        router.push(`/relic-picker?slot=${selectedRelicSlot}`, { scroll: false });
    };

    return (
        <main className="bg-ambient-mesh fixed inset-0 z-[90] overflow-hidden text-white">
            <header className="absolute left-5 top-4 z-10 sm:left-8 sm:top-3">
                <p className="text-[11px] font-semibold text-amber-300">{transI18n("relicMaker")}</p>
                <p className="mt-0.5 text-xs font-semibold">
                    {avatarSelected ? getLocaleName(locale, avatarSelected.Name) : ""}
                    {avatarSelected && ` · ${transI18n(slotIconMap[selectedRelicSlot]?.key || "HEAD")}`}
                </p>
            </header>

            <button
                type="button"
                aria-label={transI18n("cancel")}
                onClick={handleBack}
                className="absolute right-5 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:right-8"
            >
                <Image src="/theme/icon/arrow-back-1.png" alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
            </button>

            <section className={`absolute inset-x-5 bottom-4 top-16 sm:inset-x-8 ${showSettings ? "overflow-y-auto" : "overflow-y-auto lg:overflow-hidden"}`}>
                {showSettings ? (
                    <div className="mx-auto grid min-h-full max-w-6xl gap-3 py-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
                        <aside className="flex translate-y-50 flex-col items-center rounded-xl border border-white/10 bg-black/20 p-4 text-center lg:sticky lg:top-3">
                            {selectedPart && (
                                <Image
                                    src={`${process.env.CDN_URL}/${selectedPart.Image.ItemFigureIconPath || selectedPart.Image.IconPath}`}
                                    alt={getLocaleName(locale, selectedPart.Name)}
                                    width={144}
                                    height={144}
                                    unoptimized
                                    className="h-32 w-32 object-contain"
                                />
                            )}
                            <p className="mt-2 text-sm font-bold">{selectedSet ? getLocaleName(locale, selectedSet.Name) : ""}</p>
                            <p className="text-xs text-white/65">{transI18n(slotIconMap[selectedRelicSlot]?.key || "HEAD")}</p>
                        </aside>

                        <div className="space-y-3">
                            <h1 className="text-center text-xl font-bold sm:text-2xl">{transI18n("statsSelection")}</h1>
                            <section className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                <h2 className="bg-white/10 px-3 py-2 text-center text-sm font-bold">{transI18n("mainStat")}</h2>
                                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {mainStatOptions.map(([affixId, affix]) => {
                                        const stat = mappingStats[affix.Property];
                                        const isSelected = selectedMainStat === affixId;
                                        return (
                                            <button
                                                key={affixId}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => {
                                                    setSelectedMainStat(affixId);
                                                    setHasChangedSubStats(true);
                                                    setRolledStats([]);
                                                    setSelectedSubStatIds((ids) => (
                                                        (hasChangedSubStats ? ids : displayedSubStatIds).filter(
                                                            (id) => subAffix["5"]?.[id]?.Property !== affix.Property
                                                        )
                                                    ));
                                                }}
                                                className={`flex min-h-10 items-center justify-between gap-2 border px-3 py-2 text-left text-sm transition ${
                                                    isSelected
                                                        ? "border-amber-300 bg-amber-300/10 text-white"
                                                        : "border-white/25 bg-black/20 text-white/80 hover:border-white/55"
                                                }`}
                                            >
                                                <span>{stat ? `${stat.name}${stat.unit}` : affix.Property}</span>
                                                <span className={`h-4 w-4 shrink-0 rounded-full border ${
                                                    isSelected ? "border-amber-300 bg-amber-300 shadow-[inset_0_0_0_3px_rgba(15,23,42,1)]" : "border-white/35"
                                                }`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                <h2 className="bg-white/10 px-3 py-2 text-center text-sm font-bold">
                                    {transI18n("subStats")} ({displayedSubStatIds.length}/{MAX_SELECTED_SUB_STATS})
                                </h2>
                                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {subStatOptions.map(([affixId, affix]) => {
                                        const stat = mappingStats[affix.Property];
                                        const isSelected = displayedSubStatIds.includes(affixId);
                                        const isLimitReached = displayedSubStatIds.length >= MAX_SELECTED_SUB_STATS && !isSelected;
                                        return (
                                            <button
                                                key={affixId}
                                                type="button"
                                                aria-pressed={isSelected}
                                                disabled={isLimitReached}
                                                onClick={() => toggleSubStat(affixId)}
                                                className={`flex min-h-10 items-center justify-between gap-2 border px-3 py-2 text-left text-sm transition ${
                                                    isSelected
                                                        ? "border-amber-300 bg-amber-300/10 text-white"
                                                        : "border-white/25 bg-black/20 text-white/80 hover:border-white/55 disabled:cursor-not-allowed disabled:opacity-40"
                                                }`}
                                            >
                                                <span>{stat ? `${stat.name}${stat.unit}` : affix.Property}</span>
                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                                                    isSelected ? "border-amber-300 bg-amber-300 text-black" : "border-white/35"
                                                }`}>{isSelected ? "✓" : ""}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {displayedRolledStats && displayedRolledStats.length > 0 && (
                                <section className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <h2 className="mb-2 text-center text-sm font-bold">{transI18n("subStats")}</h2>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                        {displayedRolledStats.map((sub) => {
                                            const stat = mappingStats[sub.property];
                                            const value = calcAffixBonus(subAffix["5"]?.[sub.affixId], sub.stepCount, sub.rollCount);
                                            return (
                                                <div key={sub.affixId} className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                                                        <span>{stat ? `${stat.name}${stat.unit}` : sub.property}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                aria-label={`${transI18n("downRoll")} ${stat?.name || sub.property}`}
                                                                disabled={sub.rollCount === 0}
                                                                onClick={() => adjustSubStatRoll(sub.affixId, -1)}
                                                                className="flex h-6 w-6 items-center justify-center rounded border border-white/20 text-xs hover:bg-white/10 disabled:opacity-40"
                                                            >
                                                                −
                                                            </button>
                                                            <span className="min-w-14 text-center font-mono text-amber-200">+{value}{stat?.unit || ""}</span>
                                                            <button
                                                                type="button"
                                                                aria-label={`${transI18n("upRoll")} ${stat?.name || sub.property}`}
                                                                onClick={() => adjustSubStatRoll(sub.affixId, 1)}
                                                                className="flex h-6 w-6 items-center justify-center rounded border border-white/20 text-xs hover:bg-white/10"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="mt-1 text-[10px] text-white/55">R: {sub.rollCount} · S: {sub.stepCount}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            <div className="flex flex-wrap justify-center gap-2 pb-3">
                                <button
                                    type="button"
                                    onClick={randomizeStats}
                                    className="btn btn-sm h-9 min-h-0 rounded-full border border-blue-400/60 bg-black/20 px-5 text-white hover:bg-white/10"
                                >
                                    {transI18n("randomizeStats")}
                                </button>
                                <button
                                    type="button"
                                    onClick={randomizeUpgrade}
                                    className="btn btn-sm h-9 min-h-0 rounded-full border border-fuchsia-400/60 bg-black/20 px-5 text-white hover:bg-white/10"
                                >
                                    {transI18n("randomizeRolls")}
                                </button>
                                <button
                                    type="button"
                                    onClick={saveRelic}
                                    disabled={displayedRolledStats?.length !== 4}
                                    className="btn btn-sm h-9 min-h-0 rounded-full border border-white/80 bg-white px-7 font-bold text-black shadow-sm hover:bg-white/90 disabled:opacity-40"
                                >
                                    {transI18n("save")}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid min-h-full grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(220px,0.27fr)_minmax(0,1fr)] lg:gap-5">
                        <aside className="scrollbar-hidden max-h-[42vh] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3 lg:h-full lg:max-h-none lg:min-h-0">
                            {[
                                { title: transI18n("relics"), sets: cavernSets },
                                { title: transI18n("planarOrnamentSynthesis"), sets: planarSets },
                            ].map(({ title, sets }) => sets.length > 0 && (
                                <section key={title}>
                                    <h2 className="mb-2 border-b border-white/20 pb-1 text-xs font-bold text-amber-200">{title}</h2>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
                                        {sets.map(([setId, set]) => (
                                            <button
                                                key={setId}
                                                type="button"
                                                aria-pressed={displayedSetId === setId}
                                                title={getLocaleName(locale, set.Name)}
                                                onClick={() => setSelectedRelicSet(setId)}
                                                className={`flex min-w-0 flex-col items-center rounded-lg border p-2 text-center transition ${
                                                    displayedSetId === setId
                                                        ? "border-amber-200 bg-white/15 shadow-[0_0_14px_rgba(253,230,138,0.2)]"
                                                        : "border-white/10 bg-white/5 hover:border-white/35 hover:bg-white/10"
                                                }`}
                                            >
                                                <Image
                                                    src={`${process.env.CDN_URL}/${set.Image.SetIconPath}`}
                                                    alt=""
                                                    width={64}
                                                    height={64}
                                                    unoptimized
                                                    className="h-14 w-14 object-contain"
                                                />
                                                <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight">
                                                    {getLocaleName(locale, set.Name)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </aside>

                        <section className="flex min-h-[420px] flex-col rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6 lg:h-full lg:min-h-0">
                            {selectedSet && featuredPart ? (
                                <>
                                    <div className="grid flex-1 grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(170px,0.8fr)_minmax(0,1.2fr)]">
                                        <div className="flex min-h-44 items-center justify-center">
                                            <Image
                                                src={`${process.env.CDN_URL}/${featuredPart.part.Image.ItemFigureIconPath || featuredPart.part.Image.IconPath}`}
                                                alt={getLocaleName(locale, featuredPart.part.Name)}
                                                width={224}
                                                height={224}
                                                unoptimized
                                                className="h-44 w-44 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.4)] sm:h-52 sm:w-52"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h1 className="border-b border-white/25 pb-2 text-xl font-bold sm:text-2xl">
                                                {getLocaleName(locale, selectedSet.Name)}
                                            </h1>
                                            <div className="mt-2 max-h-36 space-y-2 overflow-y-auto text-sm leading-relaxed text-white/85">
                                                {Object.entries(selectedSet.Skills).map(([count, skill]) => (
                                                    <p key={count}>
                                                        <span className="font-semibold text-amber-200">
                                                            {transI18n("pieceBonus", { count })}
                                                        </span>{" "}
                                                        <span
                                                            dangerouslySetInnerHTML={{
                                                                __html: replaceByParam(getLocaleName(locale, skill.Desc), skill.Param || []),
                                                            }}
                                                        />
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-white/15 pt-4">
                                        <h2 className="mb-4 text-center text-sm font-bold text-white/85">
                                            {transI18n("selectPartToSynthesize")}
                                        </h2>
                                        <div className={`mx-auto grid max-w-3xl gap-3 ${selectedSet.IsPlanarSuit ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                                            {availableParts.map(({ slot, part }) => {
                                                const slotInfo = slotIconMap[slot];
                                                const isSelected = selectedRelicSlot === slot;
                                                return (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        onClick={() => selectPart(slot)}
                                                        className="group flex flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
                                                    >
                                                        <span className={`flex h-20 w-20 items-center justify-center rounded-full border-2 bg-black/20 p-2 transition sm:h-24 sm:w-24 ${
                                                            isSelected ? "border-amber-200 shadow-[0_0_16px_rgba(253,230,138,0.3)]" : "border-white/25 group-hover:border-white/70"
                                                        }`}>
                                                            <Image
                                                                src={`${process.env.CDN_URL}/${part.Image.ItemFigureIconPath || part.Image.IconPath}`}
                                                                alt=""
                                                                width={96}
                                                                height={96}
                                                                unoptimized
                                                                className="h-full w-full object-contain"
                                                            />
                                                        </span>
                                                        <span className="text-center text-xs font-semibold text-white/90">
                                                            {slotInfo ? transI18n(slotInfo.key) : getLocaleName(locale, part.Name)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center text-sm text-white/60">
                                    {transI18n("pleaseSelectASet")}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </section>
        </main>
    );
}
