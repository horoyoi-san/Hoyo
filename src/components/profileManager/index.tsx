"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { toast } from "react-toastify";
import useUserDataStore from "@/stores/userDataStore";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import { getNameChar, calcRarity } from "@/helper";
import { getLocaleName } from "@/helper/getName";
import ParseText from "../parseText";
import {
    Search,
    X,
    Trash2,
    Edit2,
    Check,
    Plus,
    Lock,
    AlertCircle,
    CheckSquare,
    Square,
    CheckCheck,
    Layers,
    RotateCcw,
    ChevronLeft
} from "lucide-react";

export default function ProfileManagerModal() {
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    );
    const { avatarSelected, setAvatarSelected } = useCurrentDataStore(
        useShallow((state) => ({
            avatarSelected: state.avatarSelected,
            setAvatarSelected: state.setAvatarSelected,
        }))
    );
    const { mapAvatar, baseType, damageType, mapLightCone } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            baseType: state.baseType,
            damageType: state.damageType,
            mapLightCone: state.mapLightCone,
        }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    );
    const transI18n = useTranslations("DataPage");

    const isMounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    const [search, setSearch] = useState("");
    const [elementFilters, setElementFilters] = useState<Record<string, boolean>>({});
    const [pathFilters, setPathFilters] = useState<Record<string, boolean>>({});
    const [rarityFilters, setRarityFilters] = useState<Record<string, boolean>>({});
    const [onlyMultipleProfiles, setOnlyMultipleProfiles] = useState(false);

    const [selectedAvatarId, setSelectedAvatarId] = useState<number>(
        avatarSelected?.ID ?? 1001
    );

    const [mobileView, setMobileView] = useState<"avatars" | "profiles">("profiles");

    const [selectedProfileIndices, setSelectedProfileIndices] = useState<Set<number>>(new Set());

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");

    const [isCreating, setIsCreating] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");

    const [confirmBatchOpen, setConfirmBatchOpen] = useState(false);
    const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

    const toggleElementFilter = (el: string) => {
        setElementFilters((prev) => ({ ...prev, [el]: !prev[el] }));
    };
    const togglePathFilter = (path: string) => {
        setPathFilters((prev) => ({ ...prev, [path]: !prev[path] }));
    };
    const toggleRarityFilter = (r: string) => {
        setRarityFilters((prev) => ({ ...prev, [r]: !prev[r] }));
    };
    const clearFilters = () => {
        setSearch("");
        setElementFilters({});
        setPathFilters({});
        setRarityFilters({});
        setOnlyMultipleProfiles(false);
    };

    const filteredCharacters = useMemo(() => {
        if (!mapAvatar) return [];
        let list = Object.values(mapAvatar);

        const anyElement = Object.values(elementFilters).some((v) => v);
        const anyPath = Object.values(pathFilters).some((v) => v);
        const anyRarity = Object.values(rarityFilters).some((v) => v);

        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((char) => {
                const charName = getNameChar(locale, transI18n, char).toLowerCase();
                const userAv = avatars[char.ID.toString()];
                const profileNames = userAv?.profileList?.map((p) => p.profile_name.toLowerCase()) || [];
                return charName.includes(q) || profileNames.some((pn) => pn.includes(q));
            });
        }

        list = list.filter((char) => {
            if (anyElement && !elementFilters[char.DamageType]) return false;
            if (anyPath && !pathFilters[char.BaseType]) return false;
            const rarity = calcRarity(char.Rarity);
            if (anyRarity && !rarityFilters[rarity.toString()]) return false;

            const userAv = avatars[char.ID.toString()];
            const count = userAv?.profileList?.length ?? 1;
            if (onlyMultipleProfiles && count <= 1) return false;

            return true;
        });

        list.sort((a, b) => {
            const aCount = avatars[a.ID.toString()]?.profileList?.length ?? 1;
            const bCount = avatars[b.ID.toString()]?.profileList?.length ?? 1;
            if (aCount !== bCount) return bCount - aCount;
            const r = calcRarity(b.Rarity) - calcRarity(a.Rarity);
            if (r !== 0) return r;
            return a.ID - b.ID;
        });

        return list;
    }, [mapAvatar, avatars, search, elementFilters, pathFilters, rarityFilters, onlyMultipleProfiles, locale, transI18n]);

    const activeCharacterMeta = mapAvatar?.[selectedAvatarId.toString()] || filteredCharacters[0];
    const activeUserAvatar = activeCharacterMeta ? avatars[activeCharacterMeta.ID.toString()] : undefined;
    const profileList = activeUserAvatar?.profileList ?? [
        {
            profile_name: "Default Profile",
            lightcone: null,
            relics: {},
        },
    ];
    const currentSelect = activeUserAvatar?.profileSelect ?? 0;

    const handleSelectCharacter = (id: number) => {
        setSelectedAvatarId(id);
        setSelectedProfileIndices(new Set());
        setEditingIndex(null);
        setIsCreating(false);
        setMobileView("profiles");
        const meta = mapAvatar?.[id.toString()];
        if (meta) {
            setAvatarSelected(meta);
        }
    };

    const handleToggleProfileSelect = (index: number) => {
        if (index === 0) return;
        const next = new Set(selectedProfileIndices);
        if (next.has(index)) {
            next.delete(index);
        } else {
            next.add(index);
        }
        setSelectedProfileIndices(next);
    };

    const handleSelectAllCustom = () => {
        const customCount = Math.max(0, profileList.length - 1);
        if (selectedProfileIndices.size === customCount && customCount > 0) {
            setSelectedProfileIndices(new Set());
        } else {
            const next = new Set<number>();
            for (let i = 1; i < profileList.length; i++) {
                next.add(i);
            }
            setSelectedProfileIndices(next);
        }
    };

    const handleConfirmSingleDelete = () => {
        if (confirmDeleteIndex === null || confirmDeleteIndex === 0 || !activeUserAvatar || !activeCharacterMeta) return;
        const targetName = profileList[confirmDeleteIndex]?.profile_name || "";
        const updatedList = profileList.filter((_, idx) => idx !== confirmDeleteIndex);
        const nextSelect = currentSelect >= confirmDeleteIndex ? Math.max(0, currentSelect - 1) : currentSelect;

        setAvatar({
            ...activeUserAvatar,
            profileList: updatedList,
            profileSelect: nextSelect,
        });

        toast.success(`${transI18n("profileDeletedSuccessfully")}: ${targetName}`);
        setConfirmDeleteIndex(null);
        setSelectedProfileIndices((prev) => {
            const next = new Set(prev);
            next.delete(confirmDeleteIndex);
            return next;
        });
    };

    const handleConfirmBatchDelete = () => {
        if (selectedProfileIndices.size < 2 || !activeUserAvatar || !activeCharacterMeta) return;

        const validIndices = new Set(Array.from(selectedProfileIndices).filter((i) => i > 0));
        if (validIndices.size < 2) return;

        const currentSelectedObj = profileList[currentSelect];
        const updatedList = profileList.filter((_, idx) => !validIndices.has(idx));

        let nextSelect = updatedList.indexOf(currentSelectedObj);
        if (nextSelect === -1) nextSelect = 0;

        setAvatar({
            ...activeUserAvatar,
            profileList: updatedList,
            profileSelect: nextSelect,
        });

        toast.success(
            transI18n("batchDeleteProfilesSuccess", { count: validIndices.size })
        );
        setSelectedProfileIndices(new Set());
        setConfirmBatchOpen(false);
    };

    const handleStartEdit = (index: number, currentName: string) => {
        setEditingIndex(index);
        setEditingName(currentName);
    };

    const handleSaveEdit = (index: number) => {
        if (!activeUserAvatar || !activeCharacterMeta) return;
        const cleanName = editingName.trim();
        if (!cleanName) {
            setEditingIndex(null);
            return;
        }

        const updatedList = profileList.map((p, idx) =>
            idx === index ? { ...p, profile_name: cleanName } : p
        );

        setAvatar({
            ...activeUserAvatar,
            profileList: updatedList,
        });

        toast.success(transI18n("profileUpdatedSuccessfully"));
        setEditingIndex(null);
    };

    const handleCreateProfile = () => {
        if (!activeUserAvatar || !activeCharacterMeta) return;
        const cleanName = newProfileName.trim() || `Profile ${profileList.length + 1}`;
        const baseProfile = profileList[currentSelect] || profileList[0];
        const cloned = structuredClone(baseProfile);
        cloned.profile_name = cleanName;

        const updatedList = [...profileList, cloned];
        setAvatar({
            ...activeUserAvatar,
            profileList: updatedList,
            profileSelect: updatedList.length - 1,
        });

        toast.success(transI18n("profileCreatedSuccessfully"));
        setNewProfileName("");
        setIsCreating(false);
    };

    const handleSwitchActive = (index: number) => {
        if (!activeUserAvatar || currentSelect === index) return;
        setAvatar({
            ...activeUserAvatar,
            profileSelect: index,
        });
        toast.success(`${transI18n("profileSwitched")}: ${profileList[index]?.profile_name}`);
    };

    const multipleProfilesCount = useMemo(() => {
        if (!mapAvatar) return 0;
        return Object.values(mapAvatar).filter((c) => (avatars[c.ID.toString()]?.profileList?.length ?? 1) > 1).length;
    }, [mapAvatar, avatars]);

    return (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 relative overflow-hidden bg-base-100">
            <div className={`p-2.5 sm:p-4 bg-base-200/50 border-b border-base-300 space-y-2 sm:space-y-3 shrink-0 ${mobileView === "profiles" ? "hidden md:block" : "block"}`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={transI18n("searchCharacterOrProfile")}
                            className="w-full h-9 pl-9 pr-8 rounded-xl bg-base-100 border border-base-300 text-xs sm:text-sm text-base-content focus:border-primary focus:outline-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setOnlyMultipleProfiles(!onlyMultipleProfiles)}
                        className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                            onlyMultipleProfiles
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs"
                                : "bg-base-100 text-base-content/70 border-base-300 hover:text-base-content"
                        }`}
                        title={transI18n("onlyMultipleProfiles")}
                    >
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>{transI18n("onlyMultipleProfiles")}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 font-mono text-[10px] font-bold">
                            {multipleProfilesCount}
                        </span>
                    </button>

                    {(search || onlyMultipleProfiles || Object.values(elementFilters).some((v) => v) || Object.values(pathFilters).some((v) => v) || Object.values(rarityFilters).some((v) => v)) && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="h-9 px-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                            title={transI18n("clearAll")}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{transI18n("clearAll")}</span>
                        </button>
                    )}
                </div>

                {/* Filter Chips (Elements, Paths, Rarity) - wrapped naturally without horizontal scroll */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 shrink-0">
                    <div className="flex items-center gap-1">
                        {Object.entries(damageType || {}).map(([key, val]) => {
                            if (!key || !val?.Icon) return null;
                            const isActive = !!elementFilters[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleElementFilter(key)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center p-1 border transition-all cursor-pointer ${
                                        isActive
                                            ? "bg-primary/20 border-primary shadow-xs scale-105"
                                            : "bg-base-100 border-base-300 opacity-60 hover:opacity-100"
                                    }`}
                                    title={key}
                                >
                                    <Image
                                        src={`${process.env.CDN_URL}/${val.Icon}`}
                                        alt={key}
                                        width={20}
                                        height={20}
                                        unoptimized
                                        className="w-full h-full object-contain"
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-4 w-px bg-base-300 shrink-0 hidden sm:block" />

                    <div className="flex items-center gap-1">
                        {Object.entries(baseType || {}).map(([key, val]) => {
                            if (!key || !val?.Icon) return null;
                            const isActive = !!pathFilters[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => togglePathFilter(key)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center p-1 border transition-all cursor-pointer ${
                                        isActive
                                            ? "bg-primary/20 border-primary shadow-xs scale-105"
                                            : "bg-base-100 border-base-300 opacity-60 hover:opacity-100"
                                    }`}
                                    title={key}
                                >
                                    <Image
                                        src={`${process.env.CDN_URL}/${val.Icon}`}
                                        alt={key}
                                        width={20}
                                        height={20}
                                        unoptimized
                                        className="w-full h-full object-contain"
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-4 w-px bg-base-300 shrink-0 hidden sm:block" />

                    <div className="flex items-center gap-1">
                        {["5", "4"].map((rarity) => {
                            const isActive = !!rarityFilters[rarity];
                            return (
                                <button
                                    key={rarity}
                                    type="button"
                                    onClick={() => toggleRarityFilter(rarity)}
                                    className={`h-7 px-2 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer ${
                                        isActive
                                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs"
                                            : "bg-base-100 text-base-content/60 border-base-300 hover:opacity-100"
                                    }`}
                                >
                                    {rarity}★
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                <div
                    className={`w-full md:w-72 lg:w-80 xl:w-96 border-b md:border-b-0 md:border-r border-base-300 flex flex-col shrink-0 bg-base-100/50 min-h-0 ${
                        mobileView === "avatars" ? "flex flex-1" : "hidden md:flex"
                    }`}
                >
                    <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-base-content/50 bg-base-200/30 flex items-center justify-between shrink-0">
                        <span>{transI18n("avatars")}</span>
                        <span className="font-mono text-[11px] font-semibold text-base-content/60">
                            {filteredCharacters.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredCharacters.length === 0 ? (
                            <div className="text-center py-10 px-4 text-xs text-base-content/50">
                                {transI18n("noProfilesFound")}
                            </div>
                        ) : (
                            filteredCharacters.map((char) => {
                                const isSelected = char.ID === selectedAvatarId;
                                const userAv = avatars[char.ID.toString()];
                                const count = userAv?.profileList?.length ?? 1;
                                const is5Star = char.Rarity === "CombatPowerAvatarRarityType5";

                                return (
                                    <div
                                        key={char.ID}
                                        onClick={() => handleSelectCharacter(char.ID)}
                                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer select-none transition-all ${
                                            isSelected
                                                ? "bg-primary/15 border border-primary/40 shadow-xs ring-1 ring-primary/30"
                                                : "hover:bg-base-200/80 border border-transparent"
                                        }`}
                                    >
                                        <div
                                            className={`relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-linear-to-b ${
                                                is5Star
                                                    ? "from-yellow-400 via-amber-500/85 to-amber-700/70"
                                                    : "from-purple-400 via-purple-600/80 to-purple-800/60"
                                            }`}
                                        >
                                            <Image
                                                src={`${process.env.CDN_URL}/${char.Image.ActionAvatarHeadIconPath}`}
                                                alt={char.ID.toString()}
                                                width={40}
                                                height={40}
                                                unoptimized
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-base-content truncate">
                                                <ParseText
                                                    locale={locale}
                                                    text={getNameChar(locale, transI18n, char).toWellFormed()}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-base-content/60 font-mono mt-0.5">
                                                <span>Lv.{userAv?.level ?? 80}</span>
                                                <span>•</span>
                                                <span className="capitalize">{char.DamageType}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                                                    count > 1
                                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs"
                                                        : "bg-base-300/40 text-base-content/50 border-white/5"
                                                }`}
                                            >
                                                {count} {transI18n("profile")}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div
                    className={`flex-1 flex flex-col min-w-0 overflow-hidden bg-base-100 ${
                        mobileView === "profiles" ? "flex flex-1" : "hidden md:flex"
                    }`}
                >
                    {activeCharacterMeta ? (
                        <>
                            <div className="px-3 sm:px-5 py-2.5 bg-base-200/40 border-b border-base-300 flex items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setMobileView("avatars")}
                                        className="md:hidden w-8 h-8 rounded-xl bg-base-100 hover:bg-base-200 border border-base-300 flex items-center justify-center text-base-content/70 hover:text-base-content transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                                        title={transI18n("avatars")}
                                    >
                                        <ChevronLeft className="w-4 h-4 text-primary" />
                                    </button>

                                    <div
                                        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-linear-to-b ${
                                            activeCharacterMeta.Rarity === "CombatPowerAvatarRarityType5"
                                                ? "from-yellow-400 via-amber-500/85 to-amber-700/70"
                                                : "from-purple-400 via-purple-600/80 to-purple-800/60"
                                        }`}
                                    >
                                        <Image
                                            src={`${process.env.CDN_URL}/${activeCharacterMeta.Image.ActionAvatarHeadIconPath}`}
                                            alt={activeCharacterMeta.ID.toString()}
                                            width={40}
                                            height={40}
                                            unoptimized
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xs sm:text-sm font-bold text-base-content truncate">
                                            <ParseText
                                                locale={locale}
                                                text={getNameChar(locale, transI18n, activeCharacterMeta).toWellFormed()}
                                            />
                                        </h3>
                                        <div className="text-[11px] font-mono text-base-content/60 truncate">
                                            <span>{profileList.length} {transI18n("profile")}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5">
                                    {!isCreating ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreating(true);
                                                setNewProfileName(`Profile ${profileList.length + 1}`);
                                            }}
                                            className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold bg-primary text-primary-content hover:bg-primary-focus transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">{transI18n("addNewProfile")}</span>
                                            <span className="sm:hidden">{transI18n("add")}</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                value={newProfileName}
                                                onChange={(e) => setNewProfileName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleCreateProfile();
                                                    if (e.key === "Escape") setIsCreating(false);
                                                }}
                                                placeholder={transI18n("placeholderProfileName")}
                                                autoFocus
                                                className="h-8 px-2.5 rounded-lg bg-base-100 border border-primary text-xs text-base-content focus:outline-none w-28 sm:w-40"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateProfile}
                                                className="h-8 px-2 rounded-lg text-xs font-bold bg-primary text-primary-content hover:bg-primary-focus cursor-pointer"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsCreating(false)}
                                                className="h-8 px-1.5 rounded-lg text-xs text-base-content/60 hover:text-base-content hover:bg-base-200 cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-3 sm:px-5 py-1.5 bg-base-200/25 border-b border-base-300 flex items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2 text-xs min-w-0">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllCustom}
                                        disabled={profileList.length <= 1}
                                        className="text-primary hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>{selectedProfileIndices.size === Math.max(0, profileList.length - 1) && profileList.length > 1 ? transI18n("clearAll") : transI18n("selectAll")}</span>
                                    </button>

                                    {selectedProfileIndices.size > 0 && (
                                        <span className="text-[11px] font-mono text-base-content/60 border-l border-base-300 pl-2 whitespace-nowrap">
                                            {transI18n("selectedCount", { count: selectedProfileIndices.size })}
                                        </span>
                                    )}
                                </div>

                                {profileList.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmBatchOpen(true)}
                                        disabled={selectedProfileIndices.size < 2}
                                        className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                            selectedProfileIndices.size >= 2
                                                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-xs cursor-pointer active:scale-95"
                                                : "opacity-40 text-base-content/40 bg-base-200/50 cursor-not-allowed border border-transparent"
                                        }`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">{transI18n("batchDeleteProfiles")}</span>
                                        <span className="sm:hidden">{transI18n("delete")}</span>
                                        <span className="font-mono text-[10px] opacity-80">
                                            {selectedProfileIndices.size >= 2
                                                ? `(${selectedProfileIndices.size})`
                                                : `${selectedProfileIndices.size}/2+`}
                                        </span>
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                                {profileList.map((profile, index) => {
                                    const isDefault = index === 0;
                                    const isActive = index === currentSelect;
                                    const isSelectedForBatch = selectedProfileIndices.has(index);
                                    const isEditing = editingIndex === index;

                                    return (
                                        <div
                                            key={index}
                                            className={`rounded-2xl border p-3.5 sm:p-4 transition-all space-y-3 ${
                                                isActive
                                                    ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                                                    : isSelectedForBatch
                                                    ? "bg-rose-500/5 border-rose-500/40 ring-1 ring-rose-500/20"
                                                    : "bg-base-200/40 border-base-300 hover:border-base-content/20"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    {!isDefault ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleProfileSelect(index)}
                                                            className="text-base-content/60 hover:text-primary transition-colors cursor-pointer shrink-0"
                                                            title={isSelectedForBatch ? "Deselect" : "Select"}
                                                        >
                                                            {isSelectedForBatch ? (
                                                                <CheckSquare className="w-5 h-5 text-rose-500" />
                                                            ) : (
                                                                <Square className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div
                                                            className="text-base-content/30 cursor-not-allowed shrink-0"
                                                            title={transI18n("defaultProfileCannotBeDeleted")}
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </div>
                                                    )}

                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                            <input
                                                                type="text"
                                                                value={editingName}
                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") handleSaveEdit(index);
                                                                    if (e.key === "Escape") setEditingIndex(null);
                                                                }}
                                                                autoFocus
                                                                className="h-8 px-2.5 rounded-lg bg-base-100 border border-primary text-xs font-bold text-base-content focus:outline-none flex-1 min-w-0 shadow-inner"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEdit(index)}
                                                                className="h-8 px-2 sm:px-2.5 rounded-lg bg-primary text-primary-content hover:bg-primary-focus cursor-pointer text-xs font-semibold flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                                                                title={transI18n("save")}
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">{transI18n("save")}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingIndex(null)}
                                                                className="h-8 px-2 sm:px-2.5 rounded-lg bg-base-200 hover:bg-base-300 text-base-content/70 hover:text-base-content cursor-pointer text-xs flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                                                                title={transI18n("cancel")}
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">{transI18n("cancel")}</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="font-bold text-sm text-base-content truncate">
                                                                {profile.profile_name}
                                                            </span>
                                                            {isDefault && (
                                                                <span className="px-1.5 py-0.2 rounded bg-base-300/80 text-[10px] font-mono font-semibold text-base-content/60">
                                                                    {transI18n("default")}
                                                                </span>
                                                            )}
                                                            {isActive && (
                                                                <span className="px-2 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-mono font-bold">
                                                                    {transI18n("activeProfile")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Actions (Hidden when isEditing to prevent overlapping) */}
                                                {!isEditing && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {!isActive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSwitchActive(index)}
                                                                className="h-7.5 px-2.5 rounded-lg text-xs font-semibold bg-base-100 hover:bg-primary hover:text-primary-content text-base-content/80 border border-base-300 transition-all flex items-center gap-1 cursor-pointer"
                                                                title={transI18n("switchToProfile")}
                                                            >
                                                                <Check className="w-3 h-3 text-primary" />
                                                                <span className="hidden sm:inline">{transI18n("switchToProfile")}</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(index, profile.profile_name)}
                                                            className="btn btn-ghost btn-xs btn-circle text-amber-400 hover:bg-amber-500/15"
                                                            title={transI18n("editProfile")}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>

                                                        {!isDefault && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmDeleteIndex(index)}
                                                                className="btn btn-ghost btn-xs btn-circle text-rose-400 hover:bg-rose-500/15"
                                                                title={transI18n("deleteProfile")}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pt-2 border-t border-base-300/60 text-xs">
                                                <div className="flex items-center gap-2 p-2 rounded-xl bg-base-100/60 border border-base-300/50 min-w-0">
                                                    {profile.lightcone ? (
                                                        <>
                                                            <div className="w-8 h-10 rounded-md overflow-hidden bg-base-300 shrink-0 border border-white/10">
                                                                <Image
                                                                    src={`${process.env.CDN_URL}/spriteoutput/lightconemaxfigures/${profile.lightcone.item_id}.webp`}
                                                                    alt={transI18n("lightcone")}
                                                                    width={32}
                                                                    height={40}
                                                                    unoptimized
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-semibold text-base-content truncate">
                                                                    <ParseText
                                                                        text={getLocaleName(locale, mapLightCone?.[profile.lightcone.item_id.toString()]?.Name)}
                                                                        locale={locale}
                                                                    />
                                                                </div>
                                                                <div className="text-[10px] font-mono text-base-content/60">
                                                                    Lv.{profile.lightcone.level} • S{profile.lightcone.rank}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-base-content/40 italic">
                                                            {transI18n("noLightcone")}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 sm:gap-1.5 p-2 rounded-xl bg-base-100/60 border border-base-300/50 overflow-x-auto min-w-0">
                                                    {Object.keys(profile.relics || {}).length > 0 ? (
                                                        Object.values(profile.relics).map((r, rIdx) => (
                                                            <div
                                                                key={rIdx}
                                                                className="relative w-7 h-7 rounded-lg bg-base-200 border border-amber-500/30 flex items-center justify-center shrink-0"
                                                                title={`${transI18n("relic")} +${r.level}`}
                                                            >
                                                                <Image
                                                                    src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${r.relic_set_id}_${r.relic_id.toString().slice(-1)}.webp`}
                                                                    alt={transI18n("relic")}
                                                                    width={24}
                                                                    height={24}
                                                                    unoptimized
                                                                    className="w-5 h-5 object-contain"
                                                                />
                                                                <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold px-1 rounded-full bg-black/80 text-amber-300 border border-white/10">
                                                                    +{r.level}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-base-content/40 italic">
                                                            {transI18n("noRelics")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-base-content/50 p-6">
                            {transI18n("noProfilesFound")}
                        </div>
                    )}
                </div>
            </div>

            {isMounted && confirmDeleteIndex !== null && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 min-h-[100dvh]"
                    onClick={() => setConfirmDeleteIndex(null)}
                >
                    <div
                        className="bg-base-100 max-w-md w-full rounded-2xl border border-white/15 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 m-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-base-content">
                                    {transI18n("deleteProfile")}
                                </h4>
                                <p className="text-xs text-base-content/60">
                                    {transI18n("deleteProfileConfirm")}{" "}
                                    <span className="font-bold text-amber-400 font-mono">
                                        &quot;{profileList[confirmDeleteIndex]?.profile_name}&quot;
                                    </span>
                                    ?
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-300">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteIndex(null)}
                                className="h-9 px-4 rounded-xl text-xs font-semibold bg-base-200 hover:bg-base-300 text-base-content cursor-pointer"
                            >
                                {transI18n("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSingleDelete}
                                className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
                            >
                                {transI18n("confirmDelete")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isMounted && confirmBatchOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 min-h-[100dvh]"
                    onClick={() => setConfirmBatchOpen(false)}
                >
                    <div
                        className="bg-base-100 max-w-md w-full rounded-2xl border border-white/15 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 m-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="space-y-2 flex-1">
                                <h4 className="font-bold text-base text-base-content">
                                    {transI18n("batchDeleteProfiles")}
                                </h4>
                                <p className="text-xs text-base-content/70">
                                    {transI18n("batchDeleteConfirm", { count: selectedProfileIndices.size })}
                                </p>

                                <div className="max-h-36 overflow-y-auto p-2 rounded-xl bg-base-200/60 border border-base-300 space-y-1">
                                    {Array.from(selectedProfileIndices).map((idx) => (
                                        <div key={idx} className="text-xs font-mono text-base-content/80 flex items-center gap-1.5">
                                            <span className="text-rose-400">•</span>
                                            <span className="truncate">{profileList[idx]?.profile_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-300">
                            <button
                                type="button"
                                onClick={() => setConfirmBatchOpen(false)}
                                className="h-9 px-4 rounded-xl text-xs font-semibold bg-base-200 hover:bg-base-300 text-base-content cursor-pointer"
                            >
                                {transI18n("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBatchDelete}
                                className="h-9 px-4 rounded-xl text-xs font-bold bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white cursor-pointer shadow-xs"
                            >
                                {transI18n("confirmDelete")} ({selectedProfileIndices.size})
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
