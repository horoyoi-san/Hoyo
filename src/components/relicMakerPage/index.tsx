"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import RelicMaker from "@/components/relicBar";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import useRelicMakerStore from "@/stores/relicMakerStore";
import useRelicInventoryStore from "@/stores/relicInventoryStore";
import { useShallow } from "zustand/react/shallow";
import { getLocaleName } from "@/helper";
import { slotIconMap } from "@/components/card/relicCard";

export default function RelicMakerPage() {
    const router = useRouter();
    const transI18n = useTranslations("DataPage");
    const avatarSelected = useCurrentDataStore((state) => state.avatarSelected);
    const locale = useLocaleStore((state) => state.locale);
    const subAffix = useDetailDataStore((state) => state.subAffix);
    const inventoryRelics = useRelicInventoryStore((state) => state.relics);
    const editInstanceId = typeof window === "undefined"
        ? undefined
        : new URLSearchParams(window.location.search).get("edit") || undefined;
    const {
        selectedRelicSlot,
        setSelectedRelicSlot,
        setSelectedRelicSet,
        setSelectedMainStat,
        setSelectedRelicLevel,
        setListSelectedSubStats,
        resetSubStat,
        resetHistory,
    } = useRelicMakerStore(
        useShallow((state) => ({
            selectedRelicSlot: state.selectedRelicSlot,
            setSelectedRelicSlot: state.setSelectedRelicSlot,
            setSelectedRelicSet: state.setSelectedRelicSet,
            setSelectedMainStat: state.setSelectedMainStat,
            setSelectedRelicLevel: state.setSelectedRelicLevel,
            setListSelectedSubStats: state.setListSelectedSubStats,
            resetSubStat: state.resetSubStat,
            resetHistory: state.resetHistory,
        }))
    );

    useEffect(() => {
        const querySlot = new URLSearchParams(window.location.search).get("slot");
        const editRelic = editInstanceId
            ? inventoryRelics.find((relic) => relic.instanceId === editInstanceId)
            : undefined;
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
    }, [editInstanceId, inventoryRelics, resetHistory, resetSubStat, router, setListSelectedSubStats, setSelectedMainStat, setSelectedRelicLevel, setSelectedRelicSet, setSelectedRelicSlot, subAffix, transI18n]);

    return (
        <main className="bg-ambient-mesh fixed inset-0 z-[90] overflow-y-auto text-white">
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
                onClick={() => router.push(`/relic-picker?slot=${selectedRelicSlot}`, { scroll: false })}
                className="absolute right-5 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:right-8"
            >
                <Image src="/theme/icon/arrow-back-1.png" alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
            </button>

            <section className="absolute inset-x-5 bottom-4 top-16 overflow-y-auto sm:inset-x-8">
                <RelicMaker inventoryMode editInstanceId={editInstanceId} />
            </section>
        </main>
    );
}
