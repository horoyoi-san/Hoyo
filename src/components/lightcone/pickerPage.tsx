"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search, X } from "lucide-react";
import { mappingStats } from "@/constant/constant";
import { calcRarity, getLocaleName, getNameChar } from "@/helper";
import { replaceByParam } from "@/helper/replaceByParam";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLightconeInventoryStore, { type LightconeInventoryItem } from "@/stores/lightconeInventoryStore";
import useLocaleStore from "@/stores/localeStore";
import useUserDataStore from "@/stores/userDataStore";
import { useShallow } from "zustand/react/shallow";
import { getLightconeStats } from "./lightconeStats";

function nextRarityFilter(current: number | null) {
    if (current === null) return 5;
    if (current === 5) return 4;
    if (current === 4) return 3;
    return null;
}

export default function LightconePickerPage() {
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
    const { inventory, addLightcone } = useLightconeInventoryStore(
        useShallow((state) => ({ inventory: state.lightcones, addLightcone: state.addLightcone }))
    );
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPathFilterOpen, setIsPathFilterOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [inventoryRarityFilter, setInventoryRarityFilter] = useState<number | null>(null);
    const [addRarityFilter, setAddRarityFilter] = useState<number | null>(null);
    const [draftAddRarityFilter, setDraftAddRarityFilter] = useState<number | null>(null);
    const [addPathFilters, setAddPathFilters] = useState<string[]>([]);
    const [draftAddPathFilters, setDraftAddPathFilters] = useState<string[]>([]);
    const [newLightconeId, setNewLightconeId] = useState<number | null>(null);
    const [sortNewestFirst, setSortNewestFirst] = useState(true);

    const userAvatar = avatars[avatarSelected?.ID ?? ""];
    const profileIndex = userAvatar?.profileList?.[userAvatar.profileSelect] ? userAvatar.profileSelect : 0;
    const avatarProfile = userAvatar?.profileList?.[profileIndex];
    const currentLightcone = avatarProfile?.lightcone ?? null;

    const inventoryItems = useMemo<LightconeInventoryItem[]>(() => {
        const equipped = currentLightcone && avatarSelected
            ? [{
                ...currentLightcone,
                instanceId: `equipped-${avatarSelected.ID}-${profileIndex}-${currentLightcone.item_id}`,
            }]
            : [];
        return [...equipped, ...inventory];
    }, [avatarSelected, currentLightcone, inventory, profileIndex]);

    const visibleItems = useMemo(() => {
        const items = inventoryItems.filter((item) => {
            const detail = mapLightCone[String(item.item_id)];
            return detail && (!inventoryRarityFilter || calcRarity(detail.Rarity) === inventoryRarityFilter);
        });
        return items.sort((a, b) => sortNewestFirst
            ? b.instanceId.localeCompare(a.instanceId)
            : a.instanceId.localeCompare(b.instanceId));
    }, [inventoryItems, inventoryRarityFilter, mapLightCone, sortNewestFirst]);

    const selectedItem = visibleItems.find((item) => item.instanceId === selectedInstanceId) ?? visibleItems[0];
    const selectedDetail = selectedItem ? mapLightCone[String(selectedItem.item_id)] : undefined;
    const currentDetail = currentLightcone ? mapLightCone[String(currentLightcone.item_id)] : undefined;
    const selectedStats = useMemo(() => getLightconeStats(selectedDetail, selectedItem), [selectedDetail, selectedItem]);
    const currentStats = useMemo(() => getLightconeStats(currentDetail, currentLightcone), [currentDetail, currentLightcone]);
    const selectedStatValues = Object.fromEntries(selectedStats.map(({ key, value }) => [key, value])) as Record<string, number>;
    const currentStatValues = Object.fromEntries(currentStats.map(({ key, value }) => [key, value])) as Record<string, number>;
    const selectedRankData = selectedDetail?.Skills.Level[String(selectedItem?.rank ?? 1)];
    const selectedAbility = selectedDetail
        ? replaceByParam(getLocaleName(locale, selectedDetail.Skills.Desc), selectedRankData?.Param)
        : "";

    const availableLightcones = useMemo(() => {
        return Object.values(mapLightCone)
            .filter((item) => item.Name && (item.Image?.ThumbnailPath || item.Image?.ImagePath))
            .filter((item) => !addRarityFilter || calcRarity(item.Rarity) === addRarityFilter)
            .filter((item) => addPathFilters.length === 0 || addPathFilters.includes(item.BaseType))
            .filter((item) => getLocaleName(locale, item.Name).toLowerCase().includes(search.trim().toLowerCase()))
            .sort((a, b) => calcRarity(b.Rarity) - calcRarity(a.Rarity) || b.ID - a.ID);
    }, [addPathFilters, addRarityFilter, locale, mapLightCone, search]);

    const addSelectedLightcone = () => {
        if (newLightconeId === null || !mapLightCone[String(newLightconeId)]) return;
        const instanceId = addLightcone({
            item_id: newLightconeId,
            level: 80,
            rank: 1,
            promotion: 6,
        });
        setSelectedInstanceId(instanceId);
        setNewLightconeId(null);
        setSearch("");
        setAddRarityFilter(null);
        setAddPathFilters([]);
        setIsPathFilterOpen(false);
        setIsAddModalOpen(false);
    };

    const openPathFilter = () => {
        setDraftAddPathFilters(addPathFilters);
        setDraftAddRarityFilter(addRarityFilter);
        setIsPathFilterOpen(true);
    };

    const applyPathFilter = () => {
        setAddPathFilters(draftAddPathFilters);
        setAddRarityFilter(draftAddRarityFilter);
        setNewLightconeId((current) => {
            if (current === null) return current;
            const lightcone = mapLightCone[String(current)];
            if (!lightcone) return null;
            const matchesPath = draftAddPathFilters.length === 0 || draftAddPathFilters.includes(lightcone.BaseType);
            const matchesRarity = draftAddRarityFilter === null || calcRarity(lightcone.Rarity) === draftAddRarityFilter;
            return matchesPath && matchesRarity ? current : null;
        });
        setIsPathFilterOpen(false);
    };

    const equipSelectedLightcone = () => {
        if (!selectedItem || !userAvatar || !avatarProfile) return;
        const profileList = [...userAvatar.profileList];
        profileList[profileIndex] = {
            ...avatarProfile,
            lightcone: {
                item_id: selectedItem.item_id,
                level: selectedItem.level,
                rank: selectedItem.rank,
                promotion: selectedItem.promotion,
            },
        };
        setAvatar({ ...userAvatar, profileList });
        router.push("/lightcone", { scroll: false });
    };

    return (
        <main className="bg-ambient-mesh fixed inset-0 z-[90] overflow-y-auto text-white">
            <header className="absolute left-5 top-4 z-10 sm:left-8 sm:top-3">
                <p className="text-[11px] font-semibold text-amber-300">{transI18n("lightconePicker")}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
                    {avatarSelected && baseType[avatarSelected.BaseType]?.Icon && (
                        <Image
                            src={`${process.env.CDN_URL}/${baseType[avatarSelected.BaseType].Icon}`}
                            alt=""
                            width={14}
                            height={14}
                            unoptimized
                            className="h-3.5 w-3.5 object-contain"
                        />
                    )}
                    <span>{avatarSelected ? transI18n(avatarSelected.BaseType.toLowerCase()) : ""}</span>
                    {avatarSelected && <span>/</span>}
                    <span>{getNameChar(locale, transI18n, avatarSelected ?? undefined)}</span>
                </div>
            </header>

            <button
                type="button"
                aria-label={transI18n("cancel")}
                onClick={() => router.push("/lightcone", { scroll: false })}
                className="absolute right-5 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:right-8"
            >
                <Image
                    src="/theme/icon/arrow-back-1.png"
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className="h-6 w-6 object-contain"
                />
            </button>

            <section className="absolute left-5 right-5 top-[4.4rem] h-[108px] overflow-x-auto overflow-y-hidden sm:left-8 sm:right-[19rem] lg:right-[21rem]">
                <div className="flex h-full w-max items-start gap-2.5">
                    {visibleItems.map((item) => {
                        const detail = mapLightCone[String(item.item_id)];
                        const active = selectedItem?.instanceId === item.instanceId;
                        if (!detail) return null;
                        return (
                            <button
                                key={item.instanceId}
                                type="button"
                                aria-pressed={active}
                                title={getLocaleName(locale, detail.Name)}
                                onClick={() => setSelectedInstanceId(item.instanceId)}
                                className={`group flex h-[100px] w-[86px] shrink-0 flex-col items-center border-b-2 pb-1 transition-colors ${
                                    active ? "border-white" : "border-amber-400/70 opacity-80 hover:opacity-100"
                                }`}
                            >
                                <span className={`relative block h-[78px] w-full overflow-hidden rounded-sm border ${active ? "border-white" : "border-white/20"}`}>
                                    <Image
                                        src={`${process.env.CDN_URL}/${detail.Image.ThumbnailPath || detail.Image.ImagePath}`}
                                        alt={getLocaleName(locale, detail.Name)}
                                        fill
                                        unoptimized
                                        sizes="86px"
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                    {baseType[detail.BaseType]?.Icon && (
                                        <Image
                                            src={`${process.env.CDN_URL}/${baseType[detail.BaseType].Icon}`}
                                            alt=""
                                            width={14}
                                            height={14}
                                            unoptimized
                                            className="absolute left-1 top-1 h-3.5 w-3.5 rounded-full bg-black/50 p-0.5 object-contain"
                                        />
                                    )}
                                    <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[9px] font-bold text-amber-200">
                                        {calcRarity(detail.Rarity)}
                                    </span>
                                </span>
                                <span className="mt-0.5 text-[10px] font-semibold leading-none text-white/85">Lv. {item.level}/80</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <aside className="absolute bottom-[5.5rem] left-5 right-5 top-[9rem] overflow-y-auto text-[11px] sm:left-auto sm:right-8 sm:top-[4.5rem] sm:w-[205px]">
                <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-start gap-1.5">
                    <div className="min-w-0">
                        <p className="line-clamp-2 min-h-8 font-semibold leading-tight">
                            {selectedDetail ? getLocaleName(locale, selectedDetail.Name) : transI18n("noLightconeEquipped")}
                        </p>
                        <p className="mt-1 text-white/70">Lv. {selectedItem?.level ?? 1} /80</p>
                    </div>
                    <span className="pt-2 text-center text-lg font-bold text-white/80">›</span>
                    <div className="min-w-0">
                        <p className="line-clamp-2 min-h-8 font-semibold leading-tight">
                            {currentDetail ? getLocaleName(locale, currentDetail.Name) : transI18n("noLightconeEquipped")}
                        </p>
                        <p className="mt-1 text-white/70">Lv. {currentLightcone?.level ?? 1} /80</p>
                    </div>
                </div>

                <div className="mt-3 border-y border-white/35">
                    {(["ATK", "DEF", "HP"] as const).map((key) => {
                        const iconKey = key === "ATK" ? "AttackDelta" : key === "DEF" ? "DefenceDelta" : "HPDelta";
                        const icon = mappingStats[iconKey].icon;
                        return (
                            <div key={key} className="grid h-5 grid-cols-[minmax(0,1fr)_auto_14px_auto] items-center gap-1 border-b border-white/10 last:border-b-0">
                                <span className="flex items-center gap-1">
                                    <Image
                                        src={`${process.env.CDN_URL}/${icon}`}
                                        alt=""
                                        width={12}
                                        height={12}
                                        unoptimized
                                        className="h-3 w-3 object-contain"
                                    />
                                    {key}
                                </span>
                                <span className="font-mono">{Math.round(selectedStatValues[key] ?? 0)}</span>
                                <span className="text-center text-white/50">›</span>
                                <span className="font-mono">{Math.round(currentStatValues[key] ?? 0)}</span>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-1 text-[11px] font-semibold text-white/80">{transI18n("lightconeAbility")}</p>
                {selectedDetail && (
                    <div className="mt-1 max-h-[45vh] overflow-y-auto leading-[1.4] text-white/90">
                        <div className="mb-1 flex items-center gap-1 text-white/75">
                            <span className="text-amber-300">◆</span>
                            <span className="min-w-0 truncate">{transI18n(selectedDetail.BaseType.toLowerCase())}</span>
                            <span className="ml-auto shrink-0 text-[10px]">{transI18n("superimpositionRank")} {selectedItem?.rank ?? 1}</span>
                        </div>
                        <p className="mb-1 font-semibold">{getLocaleName(locale, selectedDetail.Skills.Name)}</p>
                        <div dangerouslySetInnerHTML={{ __html: selectedAbility }} />
                    </div>
                )}
            </aside>

            <div className="fixed bottom-5 left-5 z-10 flex flex-wrap items-center gap-2 sm:left-8">
                <select
                    aria-label={transI18n("rarity")}
                    value={inventoryRarityFilter ?? ""}
                    onChange={(event) => setInventoryRarityFilter(event.target.value ? Number(event.target.value) : null)}
                    className="h-7 min-w-[150px] rounded-full border border-white/80 bg-white/90 px-3 text-[11px] font-semibold text-black shadow-sm outline-none"
                >
                    <option value="">{transI18n("rarity")}</option>
                    {[3, 4, 5].map((rarity) => <option key={rarity} value={rarity}>{rarity}★</option>)}
                </select>
                <button
                    type="button"
                    aria-label={transI18n("filter")}
                    title={transI18n("filter")}
                    onClick={() => setSortNewestFirst((current) => !current)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-sm"
                >
                    <Image
                        src="/theme/icon/icon-filter.png"
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain brightness-0"
                    />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsPathFilterOpen(false);
                        setIsAddModalOpen(true);
                    }}
                    className="flex h-7 items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-4 text-[11px] font-semibold text-black shadow-sm transition-colors hover:bg-white"
                >
                    <Plus className="h-3.5 w-3.5" />
                    {transI18n("createNewLightcone")}
                </button>
            </div>

            <button
                type="button"
                disabled={!selectedItem || !userAvatar || !avatarProfile}
                onClick={equipSelectedLightcone}
                className="fixed bottom-5 right-5 z-10 h-7 w-[220px] rounded-full border border-white/80 bg-white/90 text-[11px] font-semibold text-black shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:right-8"
            >
                {transI18n("equipLightcone")}
            </button>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="create-lightcone-title">
                    <div className="flex max-h-[82vh] w-full max-w-[640px] flex-col overflow-hidden rounded-lg border border-black/20 bg-[#e5e5e5] text-[#171717] shadow-2xl">
                        <div className="flex h-10 shrink-0 items-center justify-between border-b border-black/20 px-4">
                            <h2 id="create-lightcone-title" className="text-[17px] font-bold">{transI18n("createNewLightcone")}</h2>
                            <button
                                type="button"
                                aria-label={transI18n("cancel")}
                                onClick={() => {
                                    setIsPathFilterOpen(false);
                                    setIsAddModalOpen(false);
                                }}
                                className="flex h-7 w-7 items-center justify-center text-xl leading-none hover:text-primary"
                            >
                                ×
                            </button>
                        </div>

                        <div className="shrink-0 border-b border-black/15 px-4 py-2">
                            <label className="mb-1 block text-[11px] font-semibold">{transI18n("search")}</label>
                            <div className="flex h-7 items-center gap-2 rounded-full border border-black/20 bg-white px-2.5">
                                <Search className="h-3.5 w-3.5 shrink-0 text-black/50" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    type="search"
                                    className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none"
                                />
                                {search && (
                                    <button type="button" aria-label={transI18n("cancel")} onClick={() => setSearch("")}>
                                        <X className="h-3 w-3 text-black/50" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label={transI18n("filter")}
                                    title={transI18n("path")}
                                    onClick={openPathFilter}
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center ${addPathFilters.length > 0 ? "text-primary" : ""}`}
                                >
                                    <Image
                                        src="/theme/icon/icon-filter.png"
                                        alt=""
                                        width={16}
                                        height={16}
                                        className="h-4 w-4 object-contain brightness-0"
                                    />
                                </button>
                            </div>
                            {(addPathFilters.length > 0 || addRarityFilter !== null) && (
                                <p className="mt-1 text-[10px] text-black/60">
                                    {addPathFilters.length > 0 && (
                                        <span>{transI18n("path")}: {addPathFilters.map((path) => transI18n(path.toLowerCase())).join(", ")}</span>
                                    )}
                                    {addPathFilters.length > 0 && addRarityFilter !== null && " · "}
                                    {addRarityFilter !== null && <span>{transI18n("rarity")}: {addRarityFilter}★</span>}
                                </p>
                            )}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                            {isPathFilterOpen ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                        {Object.entries(baseType).map(([key, path]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                aria-pressed={draftAddPathFilters.includes(key)}
                                                onClick={() => setDraftAddPathFilters((current) => (
                                                    current.includes(key)
                                                        ? current.filter((value) => value !== key)
                                                        : [...current, key]
                                                ))}
                                                className={`flex h-8 items-center gap-2 border px-2 text-left text-xs font-semibold transition-colors ${
                                                    draftAddPathFilters.includes(key)
                                                        ? "border-amber-400 bg-amber-100"
                                                        : "border-black/10 bg-white hover:bg-[#f5f5f5]"
                                                }`}
                                            >
                                                {path?.Icon && (
                                                    <Image
                                                        src={`${process.env.CDN_URL}/${path.Icon}`}
                                                        alt=""
                                                        width={20}
                                                        height={20}
                                                        unoptimized
                                                        className="h-5 w-5 object-contain brightness-0 opacity-60"
                                                    />
                                                )}
                                                <span className="flex-1">{transI18n(key.toLowerCase())}</span>
                                                <span className={`flex h-4 w-4 items-center justify-center border border-black/35 text-[10px] ${
                                                    draftAddPathFilters.includes(key) ? "bg-amber-400 text-black" : "bg-white"
                                                }`}>
                                                    {draftAddPathFilters.includes(key) ? "✓" : ""}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDraftAddRarityFilter((current) => nextRarityFilter(current))}
                                        className="h-7 rounded-full border border-black/15 bg-white px-3 text-[11px] font-semibold hover:bg-[#f5f5f5]"
                                    >
                                        {transI18n("rarity")}: {draftAddRarityFilter === null ? transI18n("all") : `${draftAddRarityFilter}★`}
                                    </button>
                                </div>
                            ) : availableLightcones.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                    {availableLightcones.map((item) => {
                                        const active = newLightconeId === item.ID;
                                        const art = item.Image.ThumbnailPath || item.Image.ImagePath;
                                        return (
                                            <button
                                                key={item.ID}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setNewLightconeId(item.ID)}
                                                className={`relative flex min-w-0 flex-col items-center overflow-hidden rounded-md border p-1 transition-colors ${
                                                    active ? "border-primary bg-white ring-1 ring-primary" : "border-transparent bg-[#d6d6d6] hover:bg-white"
                                                }`}
                                            >
                                                <div className="relative aspect-[0.84] w-full overflow-hidden">
                                                    <Image
                                                        src={`${process.env.CDN_URL}/${art}`}
                                                        alt={getLocaleName(locale, item.Name)}
                                                        fill
                                                        unoptimized
                                                        sizes="120px"
                                                        className="object-cover"
                                                    />
                                                    {baseType[item.BaseType]?.Icon && (
                                                        <Image
                                                            src={`${process.env.CDN_URL}/${baseType[item.BaseType].Icon}`}
                                                            alt=""
                                                            width={16}
                                                            height={16}
                                                            unoptimized
                                                            className="absolute left-1 top-1 h-4 w-4 rounded-full bg-black/40 p-0.5 object-contain"
                                                        />
                                                    )}
                                                </div>
                                                <span className="mt-1 line-clamp-2 min-h-7 w-full text-center text-[9px] font-semibold leading-tight">
                                                    {getLocaleName(locale, item.Name)}
                                                </span>
                                                <span className={`absolute inset-x-1 bottom-0 h-1 ${calcRarity(item.Rarity) === 5 ? "bg-amber-400" : calcRarity(item.Rarity) === 4 ? "bg-purple-400" : "bg-sky-400"}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="py-12 text-center text-xs text-black/60">{transI18n("noLightconeEquipped")}</p>
                            )}
                        </div>

                        <footer className="flex shrink-0 justify-center gap-4 bg-[#252525] px-4 py-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (isPathFilterOpen) {
                                        setDraftAddPathFilters(addPathFilters);
                                        setDraftAddRarityFilter(addRarityFilter);
                                        setIsPathFilterOpen(false);
                                    } else {
                                        setIsAddModalOpen(false);
                                    }
                                }}
                                className="h-7 min-w-[150px] rounded-full bg-white px-5 text-[11px] font-semibold text-black hover:bg-gray-100"
                            >
                                {transI18n("cancel")}
                            </button>
                            <button
                                type="button"
                                disabled={!isPathFilterOpen && newLightconeId === null}
                                onClick={isPathFilterOpen ? applyPathFilter : addSelectedLightcone}
                                className="h-7 min-w-[150px] rounded-full bg-white px-5 text-[11px] font-semibold text-black hover:bg-gray-100 disabled:opacity-50"
                            >
                                {transI18n("save")}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </main>
    );
}
