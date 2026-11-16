"use client";

import Image from "next/image";
import React, { useState, useRef, memo, useMemo } from "react";
import useFreeSRStore from "@/stores/freesrStore";
import useModelStore from "@/stores/modelStore";
import useUserDataStore from "@/stores/userDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import { freeSrJsonSchema } from "@/zod";
import { toast } from "react-toastify";
import {
    parseFreeSRProfiles,
    converterFreeSRProfileToAvatarStore,
    type FreeSRProfileItem,
} from "@/helper";
import { getLocaleName } from "@/helper/getName";
import ParseText from "../parseText";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import * as z from "zod";
import {
    UploadCloud,
    FileJson,
    RotateCcw,
    AlertCircle,
    ArrowRight,
    Users,
    FileCheck,
    Trash2,
    Check,
    Layers,
    Shield,
    Sparkles,
    Eye,
} from "lucide-react";

import { slotIconMap } from "@/components/card/relicCard";

type FreeSRJsonInput = z.infer<typeof freeSrJsonSchema>;

interface FreeSRCharacterCardProps {
    character: FreeSRJsonInput["avatars"][string];
    profiles: FreeSRProfileItem[];
    selectedProfileIds: string[];
    activePreviewProfileId: string;
    onToggleProfile: (avatarId: number, profileId: string) => void;
    onToggleAllProfiles: (avatarId: number) => void;
    onSetPreviewProfile: (avatarId: number, profileId: string) => void;
}

const FreeSRCharacterCard = memo(function FreeSRCharacterCard({
    character,
    profiles,
    selectedProfileIds = [],
    activePreviewProfileId,
    onToggleProfile,
    onToggleAllProfiles,
    onSetPreviewProfile,
}: FreeSRCharacterCardProps) {
    const { mapAvatar, mapLightCone, mapRelicSet, baseType, damageType } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            mapLightCone: state.mapLightCone,
            mapRelicSet: state.mapRelicSet,
            baseType: state.baseType,
            damageType: state.damageType,
        }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({ locale: state.locale }))
    );
    const transI18n = useTranslations("DataPage");

    const avatar = mapAvatar?.[character.avatar_id.toString()];
    const is5Star = avatar?.Rarity === "CombatPowerAvatarRarityType5";
    const is4Star = avatar?.Rarity === "CombatPowerAvatarRarityType4";

    const isFullySelected = profiles.length > 0 && selectedProfileIds.length === profiles.length;
    const isPartiallySelected = selectedProfileIds.length > 0 && !isFullySelected;
    const isSelected = selectedProfileIds.length > 0;

    const activeProfile = useMemo(() => {
        return (
            profiles.find((p) => p.id === activePreviewProfileId) ||
            profiles[0] || {
                id: "equipped",
                name: "Equipped",
                avatar_id: character.avatar_id,
                isDefault: true,
                lightcone: null,
                relics: [],
            }
        );
    }, [profiles, activePreviewProfileId, character.avatar_id]);

    const relicsBySlot = useMemo(() => {
        const map: Record<string, (typeof activeProfile.relics)[number]> = {};
        (activeProfile.relics || []).forEach((r) => {
            const slotKey = r.relic_id.toString().slice(-1);
            map[slotKey] = r;
        });
        return map;
    }, [activeProfile]);

    const activeLc = activeProfile.lightcone && activeProfile.lightcone.item_id !== 0
        ? mapLightCone?.[activeProfile.lightcone.item_id.toString()]
        : null;

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl p-3 border transition-all duration-300 ease-out select-none flex flex-col justify-between ${
                isSelected
                    ? "bg-cyan-500/10 border-cyan-500/80 shadow-[0_0_24px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/60"
                    : "bg-base-200/50 hover:bg-base-200/90 border-white/10 hover:border-white/25 hover:shadow-lg"
            }`}
        >
            <div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleAllProfiles(character.avatar_id);
                    }}
                    className={`absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isFullySelected
                            ? "bg-cyan-500 text-white shadow-md scale-100 ring-2 ring-cyan-500/40"
                            : isPartiallySelected
                            ? "bg-cyan-500/80 text-white shadow-md scale-100 ring-2 ring-cyan-500/30"
                            : "bg-black/50 border border-white/20 text-transparent scale-90 group-hover:scale-100 group-hover:border-white/40"
                    }`}
                    title={isSelected ? transI18n("deselectCharacter") : transI18n("selectCharacter")}
                >
                    {isFullySelected ? (
                        <Check className="w-3.5 h-3.5 stroke-3" />
                    ) : isPartiallySelected ? (
                        <span className="w-2 h-0.5 bg-white rounded-full" />
                    ) : null}
                </button>

                <div
                    onClick={() => onToggleAllProfiles(character.avatar_id)}
                    className={`relative mb-2.5 aspect-4/5 rounded-xl overflow-hidden bg-linear-to-b ${
                        is5Star
                            ? "from-amber-500/20 via-amber-700/10 to-base-300/40 border border-amber-500/20"
                            : is4Star
                            ? "from-purple-500/20 via-purple-700/10 to-base-300/40 border border-purple-500/20"
                            : "from-sky-500/20 via-blue-700/10 to-base-300/40 border border-white/10"
                    } flex items-center justify-center cursor-pointer group-hover:border-white/25 transition-all`}
                >
                    {avatar && (
                        <>
                            <Image
                                unoptimized
                                width={376}
                                height={512}
                                src={`${process.env.CDN_URL}/${avatar.Image?.AvatarIconPath}`}
                                alt={getLocaleName(locale, avatar.Name)}
                                loading="lazy"
                                className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                                onError={(e) => {
                                    if (avatar.Image?.DefaultAvatarHeadIconPath) {
                                        (e.currentTarget as HTMLImageElement).src = `${process.env.CDN_URL}/${avatar.Image.DefaultAvatarHeadIconPath}`;
                                    }
                                }}
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                                {damageType?.[avatar.DamageType]?.Icon && (
                                    <div
                                        className="p-1 rounded-lg bg-black/65 border border-white/15 shadow-sm"
                                        title={avatar.DamageType}
                                    >
                                        <Image
                                            unoptimized
                                            width={16}
                                            height={16}
                                            src={`${process.env.CDN_URL}/${damageType[avatar.DamageType].Icon}`}
                                            className="w-4 h-4 object-contain"
                                            alt={avatar.DamageType.toLowerCase()}
                                        />
                                    </div>
                                )}
                                {baseType?.[avatar.BaseType]?.Icon && (
                                    <div
                                        className="p-1 rounded-lg bg-black/65 border border-white/15 shadow-sm"
                                        title={avatar.BaseType}
                                    >
                                        <Image
                                            unoptimized
                                            width={16}
                                            height={16}
                                            src={`${process.env.CDN_URL}/${baseType[avatar.BaseType].Icon}`}
                                            className="w-4 h-4 object-contain"
                                            alt={avatar.BaseType.toLowerCase()}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/70 text-white border border-white/10">
                                    Lv.{character.level}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-500/85 text-black shadow-xs">
                                    E{character.data?.rank ?? 0}
                                </span>
                            </div>

                            {profiles.length > 1 && (
                                <div className="absolute bottom-2 right-2 z-10">
                                    <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md flex items-center gap-1 border ${
                                        selectedProfileIds.length > 0
                                            ? "bg-cyan-600/90 text-white shadow-md border-cyan-400/30"
                                            : "bg-black/60 text-base-content/50 border-white/10"
                                    }`}>
                                        <Layers className="w-3 h-3" />
                                        {selectedProfileIds.length}/{profiles.length}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="text-center mb-2">
                    <ParseText
                        className="text-sm font-bold line-clamp-1 tracking-tight"
                        text={avatar ? getLocaleName(locale, avatar.Name) : character.avatar_id.toString()}
                        locale={locale}
                    />
                </div>

                <div className="mb-2.5">
                    {profiles.length > 1 ? (
                        <div className="flex flex-col gap-1 p-1 rounded-xl bg-base-300/40 border border-white/5 max-h-36 overflow-y-auto">
                            {profiles.map((profile) => {
                                const isProfSelected = selectedProfileIds.includes(profile.id);
                                const isProfActive = activePreviewProfileId === profile.id;
                                const displayName =
                                    profile.name === "Equipped" ? transI18n("equipped") : profile.name;

                                return (
                                    <div
                                        key={profile.id}
                                        onClick={() => onSetPreviewProfile(character.avatar_id, profile.id)}
                                        className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all border ${
                                            isProfSelected
                                                ? isProfActive
                                                    ? "bg-cyan-500/25 border-cyan-500/70 text-cyan-100 font-semibold shadow-xs ring-1 ring-cyan-500/50"
                                                    : "bg-cyan-500/10 border-cyan-500/30 text-base-content/90 hover:bg-cyan-500/20"
                                                : isProfActive
                                                ? "bg-base-300/40 border-white/20 text-base-content/60 ring-1 ring-white/10"
                                                : "bg-base-300/20 hover:bg-base-300/40 border-white/5 text-base-content/40 opacity-60"
                                        }`}
                                        title={transI18n("previewWithParam", { name: displayName })}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleProfile(character.avatar_id, profile.id);
                                                }}
                                                className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                                    isProfSelected
                                                        ? "bg-cyan-500 text-white shadow-xs"
                                                        : "bg-base-300 border border-white/20 text-transparent hover:border-white/40"
                                                }`}
                                                title={isProfSelected ? transI18n("deselectBuild") : transI18n("selectBuild")}
                                            >
                                                <Check className="w-2.5 h-2.5 stroke-3" />
                                            </button>
                                            <span className="text-[11px] truncate font-medium">
                                                {displayName}
                                            </span>
                                            {isProfActive && (
                                                <Eye className={`w-3 h-3 shrink-0 ${isProfSelected ? "text-cyan-300" : "text-base-content/40"}`} />
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                            !isProfSelected
                                                ? "bg-base-100/40 text-base-content/40"
                                                : profile.relics.length === 6
                                                ? "bg-emerald-500/20 text-emerald-300 font-bold"
                                                : "bg-base-100/60 text-base-content/60"
                                        }`}>
                                            {profile.relics.length}/6
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            onClick={() => onToggleAllProfiles(character.avatar_id)}
                            className={`flex items-center justify-between px-2.5 py-1 rounded-xl border text-[11px] transition-all cursor-pointer ${
                                isSelected
                                    ? "bg-base-300/20 border-white/5 text-base-content/60 hover:bg-base-300/30"
                                    : "bg-base-300/10 border-white/5 text-base-content/40 opacity-60 hover:opacity-80"
                            }`}
                            title={isSelected ? transI18n("deselectCharacter") : transI18n("selectCharacter")}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-cyan-400" : "bg-base-content/30"}`} />
                                <span className="font-medium text-base-content/70">{transI18n("equipped")}</span>
                            </div>
                            <span className="font-mono text-[10px] text-base-content/50">
                                {activeProfile.relics.length}/6 {transI18n("relics")}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-base-300/30 border border-white/5">
                    {(["1", "2", "3", "4", "5", "6"] as const).map((slotKey) => {
                        const relic = relicsBySlot[slotKey];
                        const slotInfo = slotIconMap[slotKey];
                        const setName = relic && mapRelicSet?.[relic.relic_set_id.toString()]?.Name
                            ? getLocaleName(locale, mapRelicSet[relic.relic_set_id.toString()].Name)
                            : "";
                        const tooltipText = relic
                            ? `${setName || transI18n("relic")} (+${relic.level})`
                            : slotInfo ? transI18n(slotInfo.key) || slotInfo.key : `Slot ${slotKey}`;

                        if (relic) {
                            return (
                                <div
                                    key={slotKey}
                                    className="relative group/relic flex items-center justify-center"
                                    title={tooltipText}
                                >
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-base-100/90 border border-amber-500/40 hover:border-amber-400 transition-colors shadow-xs">
                                        <Image
                                            unoptimized
                                            width={124}
                                            height={124}
                                            src={`${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${relic.relic_set_id}_${slotKey}.webp`}
                                            alt={transI18n("relic")}
                                            loading="lazy"
                                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = slotInfo?.icon || "/relics/HEAD.png";
                                            }}
                                        />
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/90 text-[8px] font-mono font-bold text-amber-300 px-1 rounded-full border border-white/10 leading-tight select-none">
                                        +{relic.level}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={slotKey}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-base-300/20 border border-dashed border-white/10"
                                title={tooltipText}
                            >
                                {slotInfo?.icon && (
                                    <Image
                                        unoptimized
                                        width={18}
                                        height={18}
                                        src={slotInfo.icon}
                                        alt={`Slot ${slotKey}`}
                                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain opacity-25 grayscale"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="h-12 px-2 py-1.5 rounded-xl bg-base-300/30 border border-white/5 flex items-center gap-2">
                    {activeLc && activeProfile.lightcone ? (
                        <>
                            <div className="h-9 w-7 shrink-0 flex items-center justify-center rounded bg-base-100 overflow-hidden border border-white/10 shadow-xs">
                                <Image
                                    unoptimized
                                    width={72}
                                    height={96}
                                    src={`${process.env.CDN_URL}/${activeLc.Image?.ImagePath}`}
                                    alt={transI18n("lightcone")}
                                    loading="lazy"
                                    className="h-full w-auto object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="text-xs font-semibold truncate leading-tight">
                                    <ParseText
                                        text={getLocaleName(locale, activeLc.Name)}
                                        locale={locale}
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono text-base-content/60">
                                        Lv.{activeProfile.lightcone.level}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                                        S{activeProfile.lightcone.rank}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-base-content/40 text-xs italic w-full">
                            <div className="w-7 h-9 rounded border border-dashed border-white/10 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 text-base-content/30">
                                LC
                            </div>
                            <span className="truncate">{transI18n("noLightCone")}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default function FreeSRImport() {
    const { avatars, setAvatars } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatars: state.setAvatars,
        }))
    );
    const { mapAvatar } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
        }))
    );
    const { setIsOpenImport } = useModelStore(
        useShallow((state) => ({
            setIsOpenImport: state.setIsOpenImport,
        }))
    );

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        freeSRData,
        setFreeSRData,
        selectedProfiles,
        setSelectedProfiles,
        previewProfiles,
        setPreviewProfiles,
        fileName,
        setFileName,
        reset,
    } = useFreeSRStore(
        useShallow((state) => ({
            freeSRData: state.freeSRData,
            setFreeSRData: state.setFreeSRData,
            selectedProfiles: state.selectedProfiles,
            setSelectedProfiles: state.setSelectedProfiles,
            previewProfiles: state.previewProfiles,
            setPreviewProfiles: state.setPreviewProfiles,
            fileName: state.fileName,
            setFileName: state.setFileName,
            reset: state.reset,
        }))
    );

    const transI18n = useTranslations("DataPage");

    const parsedFreeSRData = useMemo(() => {
        if (!freeSRData) return null;
        const result = freeSrJsonSchema.safeParse(freeSRData);
        return result.success ? result.data : null;
    }, [freeSRData]);

    const characterProfiles = useMemo(() => {
        if (!parsedFreeSRData) return {};
        return parseFreeSRProfiles(parsedFreeSRData);
    }, [parsedFreeSRData]);

    const availableCharacters = useMemo(() => {
        if (!parsedFreeSRData) return [];
        return Object.values(parsedFreeSRData.avatars).filter((it) => mapAvatar?.[it.avatar_id]);
    }, [parsedFreeSRData, mapAvatar]);

    const totalAvailableProfiles = useMemo(() => {
        return availableCharacters.reduce(
            (sum, char) => sum + (characterProfiles[char.avatar_id]?.length || 0),
            0
        );
    }, [availableCharacters, characterProfiles]);

    const totalSelectedProfiles = useMemo(() => {
        return Object.values(selectedProfiles).reduce((sum, ids) => sum + ids.length, 0);
    }, [selectedProfiles]);

    const totalSelectedCharacters = useMemo(() => {
        return Object.keys(selectedProfiles).filter(
            (aId) => (selectedProfiles[Number(aId)]?.length ?? 0) > 0
        ).length;
    }, [selectedProfiles]);

    const processFile = (file: File) => {
        setIsLoading(true);
        if (!file.name.endsWith(".json") && file.type !== "application/json") {
            reset();
            setErrorMsg(transI18n("fileMustBeAValidJsonFile"));
            toast.error(transI18n("fileMustBeAValidJsonFile"));
            setIsLoading(false);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = JSON.parse(e.target?.result as string);
                const parsed = freeSrJsonSchema.safeParse(raw);
                if (!parsed.success) {
                    reset();
                    setErrorMsg(transI18n("onlySupportFreeSRJsonFile"));
                    toast.error(transI18n("onlySupportFreeSRJsonFile"));
                    return;
                }

                setFreeSRData(parsed.data);
                setFileName(file.name);
                setErrorMsg("");

                const profilesMap = parseFreeSRProfiles(parsed.data);
                const initialSelectedProfiles: Record<number, string[]> = {};
                const initialPreviewProfiles: Record<number, string> = {};
                const validChars = Object.values(parsed.data.avatars).filter((it) => mapAvatar?.[it.avatar_id]);

                validChars.forEach((char) => {
                    const profs = profilesMap[char.avatar_id] || [];
                    initialSelectedProfiles[char.avatar_id] = profs.map((p) => p.id);
                    if (profs.length > 0) {
                        initialPreviewProfiles[char.avatar_id] = profs[0].id;
                    }
                });

                setSelectedProfiles(initialSelectedProfiles);
                setPreviewProfiles(initialPreviewProfiles);
            } catch {
                reset();
                setErrorMsg(transI18n("onlySupportFreeSRJsonFile"));
                toast.error(transI18n("onlySupportFreeSRJsonFile"));
            } finally {
                setIsLoading(false);
            }
        };

        reader.onerror = () => {
            reset();
            setErrorMsg(transI18n("fileMustBeAValidJsonFile"));
            toast.error(transI18n("fileMustBeAValidJsonFile"));
            setIsLoading(false);
        };

        reader.readAsText(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleToggleProfile = (avatarId: number, profileId: string) => {
        const current = selectedProfiles[avatarId] || [];
        const isAlreadySelected = current.includes(profileId);
        const nextList = isAlreadySelected
            ? current.filter((id) => id !== profileId)
            : [...current, profileId];

        setSelectedProfiles((prev) => ({
            ...prev,
            [avatarId]: nextList,
        }));

        if (isAlreadySelected) {
            if (previewProfiles[avatarId] === profileId) {
                const profs = characterProfiles[avatarId] || [];
                const nextPreview = nextList[0] || profs[0]?.id || "equipped";
                setPreviewProfiles((prev) => ({
                    ...prev,
                    [avatarId]: nextPreview,
                }));
            }
        } else {
            setPreviewProfiles((prev) => ({
                ...prev,
                [avatarId]: profileId,
            }));
        }
    };

    const handleToggleAllProfiles = (avatarId: number) => {
        const profs = characterProfiles[avatarId] || [];
        const current = selectedProfiles[avatarId] || [];
        const isAnySelected = current.length > 0;

        setSelectedProfiles((prev) => ({
            ...prev,
            [avatarId]: isAnySelected ? [] : profs.map((p) => p.id),
        }));

        if (!isAnySelected && profs.length > 0) {
            setPreviewProfiles((prev) => ({
                ...prev,
                [avatarId]: profs[0].id,
            }));
        }
    };

    const handleSetPreviewProfile = (avatarId: number, profileId: string) => {
        setPreviewProfiles((prev) => ({
            ...prev,
            [avatarId]: profileId,
        }));
    };

    const selectAllProfiles = () => {
        if (!parsedFreeSRData) return;
        const nextSelected: Record<number, string[]> = {};
        availableCharacters.forEach((char) => {
            const profs = characterProfiles[char.avatar_id] || [];
            nextSelected[char.avatar_id] = profs.map((p) => p.id);
        });
        setSelectedProfiles(nextSelected);
    };

    const selectEquippedOnly = () => {
        if (!parsedFreeSRData) return;
        const nextSelected: Record<number, string[]> = {};
        availableCharacters.forEach((char) => {
            nextSelected[char.avatar_id] = ["equipped"];
        });
        setSelectedProfiles(nextSelected);
    };

    const clearSelection = () => {
        setSelectedProfiles({});
    };

    const handleReset = () => {
        reset();
        setErrorMsg("");
    };

    const handleImport = () => {
        if (!freeSRData) {
            setErrorMsg(transI18n("noDataToImport"));
            return;
        }

        const parsed = freeSrJsonSchema.safeParse(freeSRData);
        if (!parsed.success) {
            setErrorMsg(transI18n("fileMustBeAValidJsonFile"));
            return;
        }

        const avatarIdsToImport = Object.keys(selectedProfiles)
            .filter((idStr) => (selectedProfiles[Number(idStr)]?.length ?? 0) > 0)
            .map(Number);

        if (avatarIdsToImport.length === 0) {
            setErrorMsg(transI18n("pleaseSelectAtLeastOneCharacter"));
            return;
        }

        setErrorMsg("");
        const profilesMap = parseFreeSRProfiles(parsed.data);
        const listAvatars = { ...avatars };
        const updatedAvatars: typeof avatars = {};
        let totalProfilesImported = 0;

        avatarIdsToImport.forEach((avatarId) => {
            const currentAvatar = listAvatars[avatarId.toString()];
            const charRaw = parsed.data.avatars[avatarId.toString()];
            if (currentAvatar && Object.keys(currentAvatar).length !== 0 && charRaw) {
                const selectedIds = selectedProfiles[avatarId] || [];
                const charProfiles = profilesMap[avatarId] || [];
                const profilesToImport = charProfiles.filter((p) => selectedIds.includes(p.id));

                if (profilesToImport.length > 0) {
                    const newProfileList = [...(currentAvatar.profileList || [])];
                    let addedAny = false;

                    profilesToImport.forEach((prof) => {
                        const newProfile = converterFreeSRProfileToAvatarStore(prof);
                        if (newProfile) {
                            newProfileList.push(newProfile);
                            addedAny = true;
                            totalProfilesImported++;
                        }
                    });

                    // The skills map already names the enhanced form's skills, so the form, techniques and energy come from the file too.
                    const spMax = charRaw.sp_max > 0 ? charRaw.sp_max : currentAvatar.sp_max;
                    updatedAvatars[avatarId.toString()] = {
                        ...currentAvatar,
                        level: charRaw.level,
                        promotion: charRaw.promotion,
                        data: {
                            rank: charRaw.data.rank ?? 0,
                            skills: charRaw.data.skills,
                            ex_rank_id_list: charRaw.data?.ex_rank_id_list?.length
                                ? charRaw.data.ex_rank_id_list
                                : undefined,
                        },
                        techniques: charRaw.techniques,
                        enhanced: charRaw.enhanced_id ? String(charRaw.enhanced_id) : "",
                        sp_max: spMax,
                        sp_value: Math.min(spMax, Math.max(0, charRaw.sp_value)),
                        profileList: newProfileList,
                        profileSelect: addedAny ? newProfileList.length - 1 : currentAvatar.profileSelect,
                    };
                }
            }
        });
        if (Object.keys(updatedAvatars).length > 0) setAvatars({ ...avatars, ...updatedAvatars });

        setIsOpenImport(false);
        toast.success(
            `${transI18n("importFreeSRDataSuccess")} (${avatarIdsToImport.length} ${transI18n("avatars")}, ${totalProfilesImported} ${transI18n("buildsCount")})`
        );
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                            {transI18n("freesrProtocol")}
                        </span>
                        <span className="text-xs text-base-content/50 font-medium">{transI18n("relicsAndMultiBuildsImporter")}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-base-content flex items-center gap-2">
                        {transI18n("freeSRImport")}
                    </h2>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {!parsedFreeSRData ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all duration-200 select-none w-full sm:w-auto ${
                            isDragging
                                ? "bg-cyan-500/15 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]"
                                : "bg-base-200/50 hover:bg-base-200/80 border-white/20 hover:border-cyan-500/50"
                        }`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                            <UploadCloud className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-base-content flex items-center gap-1.5">
                                {transI18n("pickAFile")}
                                <span className="text-[10px] font-normal text-base-content/60">(.json)</span>
                            </p>
                            <p className="text-[11px] text-base-content/50 truncate max-w-50">
                                {transI18n("onlySupportFreeSRJsonFile")}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                        <div className="flex items-center justify-between sm:justify-start gap-2 h-10 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="truncate max-w-45 font-mono text-xs">{fileName || "freesr.json"}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                                {availableCharacters.length} {transI18n("avatars")} ({totalAvailableProfiles} {transI18n("buildsCount")})
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 px-3.5 rounded-xl font-semibold text-xs bg-base-200 hover:bg-base-300 text-base-content border border-base-content/15 transition-all flex items-center justify-center cursor-pointer"
                        >
                            {transI18n("changeFile")}
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-10 px-3 rounded-xl font-semibold text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all flex items-center justify-center cursor-pointer"
                            title={transI18n("reset")}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {parsedFreeSRData && (
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-base-200/60 border border-white/10 shadow-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs sm:text-sm font-bold text-base-content">
                                {transI18n("selectedCharacters")}:
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-xs">
                                {totalSelectedCharacters} / {availableCharacters.length}
                            </span>
                        </div>

                        <div className="h-4 w-px bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-400" />
                            <span className="text-xs sm:text-sm font-bold text-base-content">
                                {transI18n("selectedProfiles")}:
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-bold text-xs">
                                {totalSelectedProfiles} / {totalAvailableProfiles}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            type="button"
                            onClick={selectAllProfiles}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition-all flex items-center gap-1 cursor-pointer"
                            title={transI18n("selectAllBuildsPrompt")}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {transI18n("allProfiles")}
                        </button>
                        <button
                            type="button"
                            onClick={selectEquippedOnly}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition-all flex items-center gap-1 cursor-pointer"
                            title={transI18n("selectEquippedOnlyPrompt")}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            {transI18n("equippedOnly")}
                        </button>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {transI18n("clearAll")}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={totalSelectedProfiles === 0}
                        className="h-9 px-5 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 transition-all w-full lg:w-auto cursor-pointer"
                    >
                        <span className="text-white">{transI18n("import")}</span>
                        <span className="font-mono text-xs text-cyan-100">
                            ({totalSelectedCharacters} {transI18n("avatars")}, {totalSelectedProfiles} {transI18n("buildsCount")})
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 py-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-2xl bg-base-200/30 border border-white/5 animate-pulse p-3.5 space-y-3">
                            <div className="w-full aspect-4/5 rounded-xl bg-base-300/40" />
                            <div className="h-4 bg-base-300/60 rounded w-2/3 mx-auto" />
                            <div className="h-3 bg-base-300/40 rounded w-1/2 mx-auto" />
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && !parsedFreeSRData && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className="relative overflow-hidden py-12 sm:py-16 px-4 sm:px-6 rounded-2xl border border-dashed border-white/15 bg-base-200/20 hover:bg-base-200/40 transition-all duration-300 text-center cursor-pointer group select-none"
                >
                    <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-cyan-500/15 blur-2xl group-hover:scale-150 group-hover:bg-cyan-500/25 transition-all duration-700" />

                    <div className="relative z-10 max-w-md mx-auto space-y-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-base-300/60 border border-white/10 text-cyan-400 mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-cyan-500/40 transition-all duration-300">
                            <FileJson className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5]" />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-base sm:text-lg font-bold text-base-content">
                                {transI18n("noFreeSRDataLoaded")}
                            </h3>
                            <p className="text-xs text-base-content/60 leading-relaxed">
                                {transI18n("dropFreeSRJsonHint")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 text-left border-t border-white/5">
                            <div className="p-3 rounded-xl bg-base-300/30">
                                <span className="text-[10px] font-bold text-cyan-400 block mb-0.5">{transI18n("step1")}</span>
                                <p className="text-[11px] text-base-content/70 leading-tight">{transI18n("exportJsonFromFreeSR")}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-base-300/30">
                                <span className="text-[10px] font-bold text-cyan-400 block mb-0.5">{transI18n("step2")}</span>
                                <p className="text-[11px] text-base-content/70 leading-tight">{transI18n("dropOrSelectFile")}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-base-300/30">
                                <span className="text-[10px] font-bold text-cyan-400 block mb-0.5">{transI18n("step3")}</span>
                                <p className="text-[11px] text-base-content/70 leading-tight">{transI18n("syncCharacterBuilds")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && parsedFreeSRData && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {availableCharacters.map((character) => (
                        <FreeSRCharacterCard
                            key={character.avatar_id}
                            character={character}
                            profiles={characterProfiles[character.avatar_id] || []}
                            selectedProfileIds={selectedProfiles[character.avatar_id] || []}
                            activePreviewProfileId={
                                previewProfiles[character.avatar_id] ||
                                characterProfiles[character.avatar_id]?.[0]?.id ||
                                "equipped"
                            }
                            onToggleProfile={handleToggleProfile}
                            onToggleAllProfiles={handleToggleAllProfiles}
                            onSetPreviewProfile={handleSetPreviewProfile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
