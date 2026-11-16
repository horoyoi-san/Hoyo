"use client"
import useUserDataStore from "@/stores/userDataStore";
import { useState, useMemo } from "react";
import useCopyProfileStore from "@/stores/copyProfile";
import ProfileCard from "../card/profileCard";
import { AvatarProfileCardType, AvatarProfileStore } from "@/types";
import Image from "next/image";
import { getNameChar, calcRarity } from "@/helper";
import useLocaleStore from "@/stores/localeStore";
import { useTranslations } from "next-intl";
import SelectCustomImage from "../select/customSelectImage";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { useShallow } from "zustand/react/shallow";

export default function CopyImport() {
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    );
    const { avatarSelected } = useCurrentDataStore(
        useShallow((state) => ({
            avatarSelected: state.avatarSelected,
        }))
    );
    const { mapAvatar, baseType, damageType } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            baseType: state.baseType,
            damageType: state.damageType,
        }))
    );
    const { locale } = useLocaleStore(
        useShallow((state) => ({
            locale: state.locale,
        }))
    );
    const {
        selectedProfiles,
        avatarCopySelected,
        setSelectedProfiles,
        setAvatarCopySelected,
        listElement,
        listPath,
        listRank,
        setListElement,
        setListPath,
        setListRank
    } = useCopyProfileStore(
        useShallow((state) => ({
            selectedProfiles: state.selectedProfiles,
            avatarCopySelected: state.avatarCopySelected,
            setSelectedProfiles: state.setSelectedProfiles,
            setAvatarCopySelected: state.setAvatarCopySelected,
            listElement: state.listElement,
            listPath: state.listPath,
            listRank: state.listRank,
            setListElement: state.setListElement,
            setListPath: state.setListPath,
            setListRank: state.setListRank,
        }))
    );
    const transI18n = useTranslations("DataPage")

    const [message, setMessage] = useState({
        type: "",
        text: ""
    })

    const listAvatar = useMemo(() => {
        if (!mapAvatar || !locale || !transI18n) return []
        let list = Object.values(mapAvatar);
        const allElementFalse = !Object.values(listElement).some(v => v)
        const allPathFalse = !Object.values(listPath).some(v => v)
        const allRarityFalse = !Object.values(listRank).some(v => v)
        list = list.filter(item => (allElementFalse || listElement[item.DamageType]) && (allPathFalse || listPath[item.BaseType]) && (allRarityFalse || listRank[calcRarity(item.Rarity)]))
        list.sort((a, b) => {
            const r = calcRarity(b.Rarity) - calcRarity(a.Rarity)
            if (r !== 0) return r
            return a.ID - b.ID
        })
        return list
    }, [mapAvatar, listElement, listPath, listRank, locale, transI18n])
    

    const handleProfileToggle = (profile: AvatarProfileCardType) => {
        if (selectedProfiles.some((selectedProfile) => selectedProfile.key === profile.key)) {
            setSelectedProfiles(selectedProfiles.filter((selectedProfile) => selectedProfile.key !== profile.key));
            return;
        }
        setSelectedProfiles([...selectedProfiles, profile]);
    };


    const clearSelection = () => {
        setSelectedProfiles([]);
        setMessage({
            type: "success",
            text: transI18n("clearAll")
        })
    };

    const selectAll = () => {
        if (avatarCopySelected) {
            const sourceAvatar = avatars[avatarCopySelected.ID.toString()]
            const sourceProfiles = sourceAvatar?.profileList ?? []

            setSelectedProfiles(sourceProfiles.map((profile, index) => {
                if (!profile.lightcone?.item_id && Object.keys(profile.relics ?? {}).length == 0) {
                    return null;
                }
                return {
                    key: index,
                    ...profile,
                } as AvatarProfileCardType
            }).filter((profile) => profile !== null));
        }
        setMessage({
            type: "success",
            text: transI18n("selectAll")
        })
    };

    const handleCopy = () => {
        if (selectedProfiles.length === 0) {
            setMessage({
                type: "error",
                text: transI18n("pleaseSelectAtLeastOneProfile")
            });
            return;
        }
        if (!avatarCopySelected) {
            setMessage({
                type: "error",
                text: transI18n("noAvatarToCopySelected")
            });
            return;
        }
        if (!avatarSelected) {
            setMessage({
                type: "error",
                text: transI18n("noAvatarSelected")
            });
            return;
        }

        const sourceAvatar = avatars[avatarCopySelected.ID.toString()]
        const targetAvatar = avatars[avatarSelected.ID.toString()]

        if (!sourceAvatar || !targetAvatar) {
            setMessage({
                type: "error",
                text: transI18n("noDataToImport")
            });
            return;
        }

        const selectedKeys = new Set(selectedProfiles.map((profile) => profile.key))
        const newListProfile = sourceAvatar.profileList.map((profile, index) => {
            if (!selectedKeys.has(index) || (!profile.lightcone?.item_id && Object.keys(profile.relics ?? {}).length == 0)) {
                return null;
            }
            const cloned = structuredClone(profile);
            cloned.profile_name = profile.profile_name + ` - Copy: ${avatarCopySelected?.ID}`;
            return cloned as AvatarProfileStore;
        }).filter((profile): profile is AvatarProfileStore => profile !== null);

        const newAvatar = {
            ...targetAvatar,
            profileList: [...targetAvatar.profileList, ...newListProfile],
            profileSelect: targetAvatar.profileList.length + newListProfile.length - 1,
        }
        setAvatar(newAvatar);
        setSelectedProfiles([]);
        setMessage({
            type: "success",
            text: transI18n("copied")
        });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    {transI18n("filter")}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3.5">
                    <div className="flex items-center gap-0.5 min-[400px]:gap-1 sm:gap-1.5 flex-wrap">
                        {Object.entries(baseType).filter(([key]) => key !== "").map(([key, value]) => {
                            const isActive = !!listPath[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setListPath({ ...listPath, [key]: !listPath[key] })}
                                    className={`h-7.5 w-7.5 min-[385px]:h-8 min-[385px]:w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl transition-all duration-150 active-press border flex items-center justify-center shrink-0 cursor-pointer ${
                                        isActive
                                            ? "bg-primary/20 border-primary ring-2 ring-primary/50 shadow-sm scale-105"
                                            : "bg-base-200 hover:bg-base-300 border-base-300 opacity-80 hover:opacity-100"
                                    }`}
                                    title={(locale && value.Text?.[locale]) || key}
                                >
                                    <Image
                                        src={`${process.env.CDN_URL}/${value.Icon}`}
                                        unoptimized
                                        alt={key}
                                        className={`w-4.5 h-4.5 min-[385px]:w-5 min-[385px]:h-5 sm:w-5.5 sm:h-5.5 object-contain ${
                                            isActive ? "theme-path-icon-active" : "theme-path-icon"
                                        }`}
                                        width={28}
                                        height={28}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-7 w-px bg-base-300 hidden md:block shrink-0" />

                    <div className="flex items-center gap-0.5 min-[400px]:gap-1 sm:gap-1.5 flex-wrap">
                        {Object.entries(damageType).filter(([key]) => key !== "").map(([key, value]) => {
                            const isActive = !!listElement[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setListElement({ ...listElement, [key]: !listElement[key] })}
                                    className={`h-7.5 w-7.5 min-[385px]:h-8 min-[385px]:w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl transition-all duration-150 active-press border flex items-center justify-center shrink-0 cursor-pointer ${
                                        isActive
                                            ? "bg-primary/20 border-primary ring-2 ring-primary/50 shadow-sm scale-105"
                                            : "bg-base-200 hover:bg-base-300 border-base-300 opacity-80 hover:opacity-100"
                                    }`}
                                    title={(locale && value.Name?.[locale]) || key}
                                >
                                    <Image
                                        src={`${process.env.CDN_URL}/${value.Icon}`}
                                        alt={key}
                                        unoptimized
                                        className="w-5 h-5 min-[385px]:w-5.5 min-[385px]:h-5.5 sm:w-6 sm:h-6 object-contain drop-shadow-xs"
                                        width={28}
                                        height={28}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-7 w-px bg-base-300 hidden md:block shrink-0" />

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {Object.entries(listRank).map(([key]) => {
                            const isActive = !!listRank[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setListRank({ ...listRank, [key]: !listRank[key] })}
                                    className={`h-7.5 px-2.5 min-[385px]:h-8 min-[385px]:px-3 sm:h-9 sm:px-3 rounded-lg sm:rounded-xl transition-all duration-150 active-press border flex items-center justify-center shrink-0 text-xs font-mono font-bold cursor-pointer ${
                                        isActive
                                            ? "bg-primary text-primary-content border-primary shadow-sm scale-105"
                                            : "bg-base-200 hover:bg-base-300 text-base-content/70 border-base-300"
                                    }`}
                                >
                                    {key}★
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {listAvatar.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-xs font-bold text-base-content/70">{transI18n("characterName")}</div>
                    <SelectCustomImage
                        customSet={listAvatar.map((avatar) => ({
                            value: avatar.ID.toString(),
                            label: getNameChar(locale, transI18n, avatar),
                            imageUrl: `${process.env.CDN_URL}/${avatar.Image.AvatarIconPath}`
                        }))}
                        excludeSet={[]}
                        selectedCustomSet={avatarCopySelected?.ID.toString() || ""}
                        placeholder={transI18n("selectCharacter")}
                        setSelectedCustomSet={(value) => setAvatarCopySelected(mapAvatar[value] || null)}
                    />
                </div>
            )}

            <div className="bg-base-200 border border-base-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-base-content">
                        {transI18n("selectedProfiles")}:
                    </span>
                    <span className="badge badge-primary font-mono font-bold text-xs">
                        {selectedProfiles.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={clearSelection}
                        className="btn btn-xs sm:btn-sm btn-ghost text-error hover:bg-error/10 border border-error/30 rounded-xl"
                    >
                        {transI18n("clearAll")}
                    </button>
                    <button
                        onClick={selectAll}
                        className="btn btn-xs sm:btn-sm btn-ghost text-primary hover:bg-primary/10 border border-primary/30 rounded-xl"
                    >
                        {transI18n("selectAll")}
                    </button>
                    {selectedProfiles.length > 0 && (
                        <button
                            onClick={handleCopy}
                            className="btn btn-xs sm:btn-sm btn-primary rounded-xl font-bold shadow-xs"
                        >
                            {transI18n("copy")}
                        </button>
                    )}
                </div>
            </div>

            {message.type && message.text && (
                <div className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
                    message.type === "error"
                        ? "bg-error/10 text-error border-error/30"
                        : "bg-success/10 text-success border-success/30"
                }`}>
                    <span>{message.type === "error" ? "⚠️" : "🎉"}</span>
                    <span>{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {avatarCopySelected && avatars[avatarCopySelected?.ID.toString()]?.profileList.map((profile, index) => {
                    if (!profile.lightcone?.item_id && Object.keys(profile.relics ?? {}).length == 0) {
                        return null;
                    }
                    return (
                        <ProfileCard
                            key={index}
                            profile={{ ...profile, key: index }}
                            selectedProfile={selectedProfiles}
                            onProfileToggle={handleProfileToggle}
                        />
                    )
                })}
            </div>
        </div>
    )
}
