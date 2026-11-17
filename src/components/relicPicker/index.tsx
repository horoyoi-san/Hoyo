"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { calcAffixBonus, calcMainAffixBonus, getLocaleName } from "@/helper";
import { replaceByParam } from "@/helper/replaceByParam";
import { mappingRelicSlot } from "@/constant/constant";
import { mappingStats } from "@/constant/constant";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import useRelicInventoryStore, {
    isRelicInventorySlot,
    RELIC_INVENTORY_SLOTS,
    type RelicInventoryItem,
    type RelicInventorySlot,
} from "@/stores/relicInventoryStore";
import useUserDataStore from "@/stores/userDataStore";
import useModelStore from "@/stores/modelStore";
import { toast } from "react-toastify";
import { slotIconMap } from "@/components/card/relicCard";
import { useShallow } from "zustand/react/shallow";

function sameRelic(a: RelicInventoryItem, b: RelicInventoryItem) {
    return a.slot === b.slot &&
        a.relic_id === b.relic_id &&
        a.level === b.level &&
        a.main_affix_id === b.main_affix_id &&
        a.sub_affixes.length === b.sub_affixes.length &&
        a.sub_affixes.every((sub, index) => {
            const other = b.sub_affixes[index];
            return other &&
                sub.sub_affix_id === other.sub_affix_id &&
                sub.count === other.count &&
                sub.step === other.step;
        });
}

function getRelicRarity(relicId: number) {
    const firstDigit = Number(String(relicId)[0]);
    return firstDigit === 6 ? 5 : firstDigit;
}

export default function RelicPickerPage() {
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
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    );
    const setIsOpenManageProfiles = useModelStore((state) => state.setIsOpenManageProfiles);
    const { relics: storedRelics, addRelic, removeRelic } = useRelicInventoryStore(
        useShallow((state) => ({
            relics: state.relics,
            addRelic: state.addRelic,
            removeRelic: state.removeRelic,
        }))
    );
    const [activeSlot, setActiveSlot] = useState<RelicInventorySlot>(() => {
        if (typeof window === "undefined") return "1";
        const querySlot = new URLSearchParams(window.location.search).get("slot") || "";
        return isRelicInventorySlot(querySlot) ? querySlot : "1";
    });
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
    const [rarityFilter, setRarityFilter] = useState<number | null>(null);
    const [newestFirst, setNewestFirst] = useState(true);

    const userAvatar = avatars[avatarSelected?.ID ?? ""];
    const profileIndex = userAvatar?.profileList?.[userAvatar.profileSelect] ? userAvatar.profileSelect : 0;
    const avatarProfile = userAvatar?.profileList?.[profileIndex];

    const inventoryItems = useMemo<RelicInventoryItem[]>(() => {
        const equipped = avatarSelected
            ? Object.entries(avatarProfile?.relics ?? {}).flatMap(([slot, relic]) => (
                isRelicInventorySlot(slot)
                    ? [{
                        ...relic,
                        slot,
                        instanceId: `equipped-${avatarSelected.ID}-${profileIndex}-${slot}-${relic.relic_id}`,
                    }]
                    : []
            ))
            : [];
        return [...equipped, ...storedRelics];
    }, [avatarProfile, avatarSelected, profileIndex, storedRelics]);

    const visibleItems = useMemo(() => {
        return inventoryItems
            .filter((item) => item.slot === activeSlot)
            .filter((item) => {
                const part = mapRelicSet[String(item.relic_set_id)]?.Parts?.[mappingRelicSlot[item.slot]];
                return part && (!rarityFilter || getRelicRarity(item.relic_id) === rarityFilter);
            })
            .sort((a, b) => newestFirst
                ? b.instanceId.localeCompare(a.instanceId)
                : a.instanceId.localeCompare(b.instanceId));
    }, [activeSlot, inventoryItems, mapRelicSet, newestFirst, rarityFilter]);

    const selectedItem = visibleItems.find((item) => item.instanceId === selectedInstanceId) ?? visibleItems[0];
    const selectedSet = selectedItem ? mapRelicSet[String(selectedItem.relic_set_id)] : undefined;
    const selectedPart = selectedSet?.Parts?.[mappingRelicSlot[selectedItem?.slot ?? activeSlot]];
    const mainAffixData = selectedItem
        ? mainAffix[`5${selectedItem.slot}`]?.[String(selectedItem.main_affix_id)]
        : undefined;
    const mainStatMeta = mainAffixData ? mappingStats[mainAffixData.Property] : undefined;
    const statRows = useMemo(() => {
        if (!selectedItem) return [];
        const rows: { name: string; value: string; icon: string }[] = [];
        if (mainAffixData && mainStatMeta) {
            rows.push({
                name: `${mainStatMeta.name}${mainStatMeta.unit}`,
                value: calcMainAffixBonus(mainAffixData, selectedItem.level),
                icon: mainStatMeta.icon,
            });
        }
        for (const sub of selectedItem.sub_affixes) {
            const affix = subAffix["5"]?.[String(sub.sub_affix_id)];
            const meta = affix ? mappingStats[affix.Property] : undefined;
            if (!affix || !meta) continue;
            rows.push({
                name: `${meta.name}${meta.unit}`,
                value: calcAffixBonus(affix, sub.step, sub.count),
                icon: meta.icon,
            });
        }
        return rows;
    }, [mainAffixData, mainStatMeta, selectedItem, subAffix]);

    const setCount = useMemo(() => {
        if (!selectedItem) return 0;
        const remainingPieces = Object.entries(avatarProfile?.relics ?? {}).filter(
            ([slot, relic]) => slot !== activeSlot && relic.relic_set_id === selectedItem.relic_set_id
        ).length;
        return remainingPieces + 1;
    }, [activeSlot, avatarProfile, selectedItem]);

    const copySelectedRelic = () => {
        if (!selectedItem) return;
        const instanceId = addRelic(activeSlot, selectedItem);
        setSelectedInstanceId(instanceId);
        toast.success(transI18n("copied"));
    };

    const editSelectedRelic = () => {
        if (!selectedItem) return;
        const instanceId = storedRelics.some((item) => item.instanceId === selectedItem.instanceId)
            ? selectedItem.instanceId
            : addRelic(activeSlot, selectedItem);
        router.push(`/relic-maker?slot=${activeSlot}&edit=${encodeURIComponent(instanceId)}`, { scroll: false });
    };

    const deleteSelectedRelic = () => {
        if (!selectedItem || !window.confirm(`${transI18n("deleteRelicConfirm")} ${transI18n(slotIconMap[activeSlot].key)}?`)) {
            return;
        }

        if (storedRelics.some((item) => item.instanceId === selectedItem.instanceId)) {
            removeRelic(selectedItem.instanceId);
        } else if (userAvatar && avatarProfile) {
            const profileList = [...userAvatar.profileList];
            const relics = { ...avatarProfile.relics };
            delete relics[activeSlot];
            profileList[profileIndex] = { ...avatarProfile, relics };
            setAvatar({ ...userAvatar, profileList });
        }

        setSelectedInstanceId(null);
        toast.success(transI18n("relicDeletedSuccessfully"));
    };

    const equipSelectedRelic = () => {
        if (!selectedItem || !userAvatar || !avatarProfile || selectedItem.slot !== activeSlot) return;
        const previous = avatarProfile.relics?.[activeSlot];
        const isCurrentItem = previous && sameRelic(
            { ...previous, slot: activeSlot, instanceId: "current" },
            selectedItem
        );
        if (isCurrentItem) {
            router.push("/relics-info", { scroll: false });
            return;
        }

        if (previous) {
            const oldInventoryItem: RelicInventoryItem = {
                ...previous,
                slot: activeSlot,
                instanceId: `replaced-${avatarSelected?.ID}-${profileIndex}-${activeSlot}-${previous.relic_id}`,
            };
            const alreadyStored = storedRelics.some((item) => sameRelic(item, oldInventoryItem));
            if (!alreadyStored) addRelic(activeSlot, previous);
        }

        const profileList = [...userAvatar.profileList];
        profileList[profileIndex] = {
            ...avatarProfile,
            relics: {
                ...avatarProfile.relics,
                [activeSlot]: {
                    level: selectedItem.level,
                    relic_id: selectedItem.relic_id,
                    relic_set_id: selectedItem.relic_set_id,
                    main_affix_id: selectedItem.main_affix_id,
                    sub_affixes: selectedItem.sub_affixes.map((sub) => ({ ...sub })),
                },
            },
        };
        setAvatar({ ...userAvatar, profileList });
        if (storedRelics.some((item) => item.instanceId === selectedItem.instanceId)) {
            removeRelic(selectedItem.instanceId);
        }
        router.push("/relics-info", { scroll: false });
    };

    const getRelicImage = (item: Pick<RelicInventoryItem, "relic_set_id" | "slot">) =>
        `${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${item.relic_set_id}_${item.slot}.webp`;

    return (
        <main className="bg-ambient-mesh fixed inset-0 z-[90] overflow-y-auto text-white">
            <header className="absolute left-5 top-4 z-10 sm:left-8 sm:top-3">
                <p className="text-[11px] font-semibold text-amber-300">{transI18n("relicPicker")}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
                    <span>{avatarSelected ? transI18n(avatarSelected.BaseType.toLowerCase()) : ""}</span>
                    {avatarSelected && <span>/</span>}
                    <span>{avatarSelected?.Name ? getLocaleName(locale, avatarSelected.Name) : ""}</span>
                </div>
            </header>

            <button
                type="button"
                aria-label={transI18n("cancel")}
                onClick={() => router.push("/relics-info", { scroll: false })}
                className="absolute right-5 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:right-8"
            >
                <Image src="/theme/icon/arrow-back-1.png" alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
            </button>

            <nav aria-label={transI18n("slot")} className="absolute left-5 right-5 top-[4.4rem] flex h-10 items-center gap-2 overflow-x-auto border-b border-white/30 sm:left-8 sm:right-auto sm:w-[min(20rem,25vw)]">
                {RELIC_INVENTORY_SLOTS.map((slot) => {
                    const active = activeSlot === slot;
                    const slotInfo = slotIconMap[slot];
                    return (
                        <button
                            key={slot}
                            type="button"
                            aria-pressed={active}
                            title={transI18n(slotInfo.key)}
                            onClick={() => {
                                setActiveSlot(slot);
                                setSelectedInstanceId(null);
                                router.replace(`/relic-picker?slot=${slot}`, { scroll: false });
                            }}
                            className={`flex h-9 w-11 shrink-0 items-center justify-center border-b-2 transition-colors ${active ? "border-white text-white" : "border-transparent text-white/55 hover:text-white"}`}
                        >
                            <Image src={slotInfo.icon} alt={transI18n(slotInfo.key)} width={24} height={24} className="h-6 w-6 object-contain brightness-0 invert" />
                        </button>
                    );
                })}
            </nav>

            <section className={`absolute left-5 right-5 top-[8.8rem] overflow-y-auto ${selectedItem ? "bottom-[calc(56%+1rem)]" : "bottom-16"} sm:bottom-16 sm:right-auto sm:w-[min(20rem,25vw)] sm:left-8`}>
                {visibleItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {visibleItems.map((item) => {
                            const part = mapRelicSet[String(item.relic_set_id)]?.Parts?.[mappingRelicSlot[item.slot]];
                            const rarity = getRelicRarity(item.relic_id);
                            const active = selectedItem?.instanceId === item.instanceId;
                            return (
                                <button
                                    key={item.instanceId}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setSelectedInstanceId(item.instanceId)}
                                    className={`group relative flex aspect-[0.86] min-w-0 flex-col items-center overflow-hidden rounded-sm border-b-2 bg-black/35 p-1 transition-colors ${active ? "border-white ring-1 ring-white/70" : "border-amber-400/70 hover:bg-black/50"}`}
                                >
                                    <Image src={getRelicImage(item)} alt={part ? getLocaleName(locale, part.Name) : ""} fill unoptimized sizes="120px" className="object-cover transition-transform group-hover:scale-105" />
                                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-bold text-amber-200">+{item.level}</span>
                                    <span className={`absolute right-1 top-1 rounded-full px-1.5 text-[9px] font-bold ${rarity === 5 ? "bg-amber-400 text-black" : "bg-purple-400 text-black"}`}>{rarity}★</span>
                                    {item.instanceId.startsWith("equipped-") && (
                                        <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[8px] font-semibold">{transI18n("equipped")}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="py-12 text-center text-xs text-white/65">{transI18n("noRelicInventory")}</p>
                )}
            </section>

            {selectedItem && selectedSet && selectedPart ? (
                <>
                    <section
                        aria-label={getLocaleName(locale, selectedPart.Name)}
                        className="pointer-events-none absolute inset-y-24 hidden items-center justify-center sm:left-[22rem] sm:right-[22rem] sm:flex"
                    >
                        <div className="relative aspect-square w-[min(32vh,17rem)]">
                            <div className="absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_18px_rgba(191,219,254,0.65)]" />
                            <div className="absolute inset-[8%] rounded-full border border-white/20" />
                            <span className="absolute left-[27%] top-[5%] z-10 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                            <Image
                                src={getRelicImage(selectedItem)}
                                alt=""
                                fill
                                unoptimized
                                sizes="(min-width: 640px) 272px, 60vw"
                                className="object-contain p-8"
                            />
                        </div>
                    </section>

                    <section className="absolute bottom-16 left-5 right-5 top-[calc(56%+1rem)] overflow-y-auto text-sm sm:bottom-16 sm:left-auto sm:right-8 sm:top-16 sm:w-[13rem] xl:w-[18rem]">
                    <h2 className="text-base font-bold">{getLocaleName(locale, selectedPart.Name)}</h2>
                    <p className="text-xs text-white/70">+{selectedItem.level} · {transI18n(slotIconMap[activeSlot].key)}</p>
                    <div className="mt-2 flex items-center gap-4">
                        <button
                            type="button"
                            aria-label={transI18n("copy")}
                            title={transI18n("copy")}
                            onClick={copySelectedRelic}
                            className="text-white/75 transition-colors hover:text-white"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            aria-label={transI18n("relicMaker")}
                            title={transI18n("relicMaker")}
                            onClick={editSelectedRelic}
                            className="text-white/75 transition-colors hover:text-white"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            aria-label={transI18n("deleteRelic")}
                            title={transI18n("deleteRelic")}
                            onClick={deleteSelectedRelic}
                            className="text-rose-400 transition-colors hover:text-rose-300"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-3 border-y border-white/35">
                        {statRows.map((stat, index) => (
                            <div key={`${stat.name}-${index}`} className="grid min-h-7 grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-1.5 border-b border-white/10 py-1 last:border-0">
                                <Image src={`${process.env.CDN_URL}/${stat.icon}`} alt="" width={14} height={14} unoptimized className="h-3.5 w-3.5 object-contain" />
                                <span className="truncate">{stat.name}</span>
                                <span className="font-mono">{stat.value}</span>
                            </div>
                        ))}
                    </div>

                    <p className="mt-3 text-xs font-semibold text-white/80">{transI18n("setEffects")}</p>
                    <p className="mt-1 text-sm font-bold text-amber-300">{getLocaleName(locale, selectedSet.Name)}</p>
                    <div className="mt-1.5 space-y-1.5 leading-relaxed text-white/90">
                        {Object.entries(selectedSet.Skills).map(([threshold, skill]) => (
                            <p key={threshold}>
                                <span className="font-semibold text-emerald-300">{transI18n("pieceBonus", { count: threshold })}: </span>
                                <span dangerouslySetInnerHTML={{
                                    __html: replaceByParam(getLocaleName(locale, skill.Desc), skill.Param || [])
                                }} />
                                {setCount > 0 && ` (${setCount})`}
                            </p>
                        ))}
                    </div>
                    </section>
                </>
            ) : null}

            <div className="fixed bottom-5 left-5 z-10 flex flex-wrap items-center gap-2 sm:left-8">
                <select
                    aria-label={transI18n("rarity")}
                    value={rarityFilter ?? ""}
                    onChange={(event) => {
                        setRarityFilter(event.target.value ? Number(event.target.value) : null);
                        setSelectedInstanceId(null);
                    }}
                    className="h-7 min-w-[150px] rounded-full border border-white/80 bg-white/90 px-3 text-[11px] font-semibold text-black shadow-sm outline-none"
                >
                    <option value="">{transI18n("rarity")}</option>
                    {[5, 4, 3].map((rarity) => <option key={rarity} value={rarity}>{rarity}★</option>)}
                </select>
                <button
                    type="button"
                    aria-label={transI18n("filter")}
                    title={transI18n("filter")}
                    onClick={() => setNewestFirst((current) => !current)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-sm"
                >
                    <Image src="/theme/icon/icon-filter.png" alt="" width={16} height={16} className="h-4 w-4 object-contain brightness-0" />
                </button>
                <button
                    type="button"
                    onClick={() => router.push(`/relic-maker?slot=${activeSlot}`, { scroll: false })}
                    aria-label={transI18n("createNewRelic")}
                    title={transI18n("createNewRelic")}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/90 text-black shadow-sm transition-colors hover:bg-white"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            <button
                type="button"
                onClick={() => setIsOpenManageProfiles(true)}
                className="fixed bottom-5 left-[72%] z-10 h-7 -translate-x-1/2 rounded-full border border-white/80 bg-white/90 px-5 text-[11px] font-semibold text-black shadow-sm transition-colors hover:bg-white"
            >
                {transI18n("loadout")}
            </button>

            <button
                type="button"
                disabled={!selectedItem || !userAvatar || !avatarProfile}
                onClick={equipSelectedRelic}
                className="fixed bottom-5 right-5 z-10 h-7 w-[220px] rounded-full border border-white/80 bg-white/90 text-[11px] font-semibold text-black shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:right-8"
            >
                {transI18n("equipRelic")}
            </button>
        </main>
    );
}
