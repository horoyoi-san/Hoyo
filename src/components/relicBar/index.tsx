"use client";
import useUserDataStore from '@/stores/userDataStore';
import { useEffect, useMemo, useState } from 'react';
import SelectCustomImage from '../select/customSelectImage';
import { calcAffixBonus, calcMainAffixBonus, randomPartition, randomStep, replaceByParam, getLocaleName } from '@/helper';
import { mappingStats } from '@/constant/constant';
import useModelStore from '@/stores/modelStore';
import useRelicMakerStore from '@/stores/relicMakerStore';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Trash2, Copy, AlertTriangle, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useDetailDataStore from '@/stores/detailDataStore';
import useCurrentDataStore from '@/stores/currentDataStore';
import { RelicSetDetail, SubAffixData } from '@/types';
import useLocaleStore from '@/stores/localeStore';
import { mappingRelicSlot } from "@/constant/constant";
import { useShallow } from 'zustand/react/shallow';
import Image from "next/image";
import { slotIconMap } from '@/components/card/relicCard';
import useRelicInventoryStore, { isRelicInventorySlot } from '@/stores/relicInventoryStore';
import { useRouter } from "next/navigation";
import type { RelicStore } from "@/types";

export default function RelicMaker({
    inventoryMode = false,
    editInstanceId,
}: {
    inventoryMode?: boolean;
    editInstanceId?: string;
}) {
    const router = useRouter();
    const { addRelic, removeRelic } = useRelicInventoryStore(
        useShallow((state) => ({
            addRelic: state.addRelic,
            removeRelic: state.removeRelic,
        }))
    );
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    )
    const { avatarSelected } = useCurrentDataStore(
        useShallow((state) => ({
            avatarSelected: state.avatarSelected,
        }))
    )
    const { setIsOpenRelic } = useModelStore(
        useShallow((state) => ({
            setIsOpenRelic: state.setIsOpenRelic,
        }))
    )
    const { mainAffix, subAffix, mapRelicSet } = useDetailDataStore(
        useShallow((state) => ({
            mainAffix: state.mainAffix,
            subAffix: state.subAffix,
            mapRelicSet: state.mapRelicSet,
        }))
    )
    const { locale } = useLocaleStore(
        useShallow((state) => ({
            locale: state.locale,
        }))
    )
    const transI18n = useTranslations("DataPage")
    const {
        selectedRelicSlot,
        selectedRelicSet,
        selectedMainStat,
        listSelectedSubStats,
        selectedRelicLevel,
        preSelectedSubStats,
        setSelectedRelicSlot,
        setSelectedRelicSet,
        setSelectedMainStat,
        setSelectedRelicLevel,
        setListSelectedSubStats,
        resetHistory,
        popHistory,
        addHistory,
    } = useRelicMakerStore(
        useShallow((state) => ({
            selectedRelicSlot: state.selectedRelicSlot,
            selectedRelicSet: state.selectedRelicSet,
            selectedMainStat: state.selectedMainStat,
            listSelectedSubStats: state.listSelectedSubStats,
            selectedRelicLevel: state.selectedRelicLevel,
            preSelectedSubStats: state.preSelectedSubStats,
            setSelectedRelicSlot: state.setSelectedRelicSlot,
            setSelectedRelicSet: state.setSelectedRelicSet,
            setSelectedMainStat: state.setSelectedMainStat,
            setSelectedRelicLevel: state.setSelectedRelicLevel,
            setListSelectedSubStats: state.setListSelectedSubStats,
            resetHistory: state.resetHistory,
            popHistory: state.popHistory,
            addHistory: state.addHistory,
        }))
    )
    const [error, setError] = useState<string>("");

    const avatar = useMemo(() => {
        return avatars[avatarSelected?.ID?.toString() || ""];
    }, [avatars, avatarSelected]);

    const currentProfile = useMemo(() => {
        if (!avatar) return null;
        return avatar.profileList?.[avatar.profileSelect] ?? avatar.profileList?.[0] ?? null;
    }, [avatar]);

    const [switchDialogType, setSwitchDialogType] = useState<"hasRelic" | "emptySlot" | null>(null);
    const [pendingTargetSlot, setPendingTargetSlot] = useState<string | null>(null);
    const [previewMainStat, setPreviewMainStat] = useState<string>("");
    const [conflictReplacementMap, setConflictReplacementMap] = useState<Record<string, string>>({});
    const [switchError, setSwitchError] = useState<string>("");

    const handleInventorySlotChange = (slot: string) => {
        if (!isRelicInventorySlot(slot)) return;
        setSelectedRelicSlot(slot);
        setSelectedRelicSet("");
        setSelectedMainStat("");
        setSelectedRelicLevel(15);
        for (let index = 0; index < 4; index++) resetSubStat(index);
        resetHistory(null);
        setError("");
    };

    const isCompatibleSet = (setId: string, targetSlot: string): boolean => {
        if (!setId) return false;
        const setDetail = mapRelicSet[setId];
        if (!setDetail || !setDetail.Parts) return false;
        const targetSlotKey = mappingRelicSlot[targetSlot];
        return Boolean(setDetail.Parts[targetSlotKey]);
    };

    const isCurrentRelicChanged = (): boolean => {
        const saved = currentProfile?.relics?.[selectedRelicSlot];
        if (!saved) {
            const hasSet = Boolean(selectedRelicSet);
            const hasMain = Boolean(selectedMainStat);
            const hasSub = listSelectedSubStats.some((s) => Boolean(s.affixId));
            return hasSet || hasMain || hasSub;
        }

        if ((saved.relic_set_id?.toString() || "") !== selectedRelicSet) return true;
        if ((saved.main_affix_id?.toString() || "") !== selectedMainStat) return true;
        if ((saved.level ?? 15) !== selectedRelicLevel) return true;

        const savedSubs = saved.sub_affixes || [];
        for (let i = 0; i < 4; i++) {
            const cur = listSelectedSubStats[i];
            const prev = savedSubs[i];
            if (!cur && !prev) continue;
            if (!cur || !prev) return true;
            if ((cur.affixId || "") !== (prev.sub_affix_id?.toString() || "")) return true;
            if (cur.rollCount !== (prev.count ?? 0)) return true;
            if (cur.stepCount !== (prev.step ?? 0)) return true;
        }

        return false;
    };

    const isCurrentRelicValid = (): boolean => {
        if (!selectedRelicSet || !selectedMainStat || !selectedRelicLevel || !selectedRelicSlot) return false;
        if (listSelectedSubStats.length !== 4) return false;
        if (listSelectedSubStats.some((item) => !item.affixId)) return false;
        return true;
    };

    const saveCurrentRelic = (): boolean => {
        if (!isCurrentRelicValid()) return false;
        if (avatar && currentProfile) {
            const profileIndex = avatar.profileSelect;
            const newProfileList = [...avatar.profileList];
            newProfileList[profileIndex] = {
                ...currentProfile,
                relics: {
                    ...currentProfile.relics,
                    [selectedRelicSlot]: {
                        level: selectedRelicLevel,
                        relic_id: Number(`6${selectedRelicSet}${selectedRelicSlot}`),
                        relic_set_id: Number(selectedRelicSet),
                        main_affix_id: Number(selectedMainStat),
                        sub_affixes: listSelectedSubStats.map((item) => ({
                            sub_affix_id: Number(item.affixId),
                            count: item.rollCount,
                            step: item.stepCount
                        }))
                    }
                }
            };
            setAvatar({
                ...avatar,
                profileList: newProfileList
            });
        }
        return true;
    };

    const doSwitchSlot = (newSlot: string) => {
        setError("");
        setSelectedRelicSlot(newSlot);
        resetHistory(null);

        const relic = currentProfile?.relics?.[newSlot];
        if (relic) {
            setSelectedMainStat(relic.main_affix_id ? relic.main_affix_id.toString() : "");
            setSelectedRelicSet(relic.relic_set_id ? relic.relic_set_id.toString() : "");
            setSelectedRelicLevel(relic.level ?? 15);
            const newSubAffixes = [
                { affixId: "", property: "", rollCount: 0, stepCount: 0 },
                { affixId: "", property: "", rollCount: 0, stepCount: 0 },
                { affixId: "", property: "", rollCount: 0, stepCount: 0 },
                { affixId: "", property: "", rollCount: 0, stepCount: 0 }
            ];
            relic.sub_affixes?.forEach((item, index) => {
                if (newSubAffixes[index]) {
                    newSubAffixes[index].affixId = item.sub_affix_id ? item.sub_affix_id.toString() : "";
                    newSubAffixes[index].property = subAffix["5"]?.[item.sub_affix_id?.toString()]?.Property || "";
                    newSubAffixes[index].rollCount = item.count || 0;
                    newSubAffixes[index].stepCount = item.step || 0;
                }
            });
            setListSelectedSubStats(newSubAffixes);
        } else {
            setSelectedMainStat("");
            setSelectedRelicSet(isCompatibleSet(selectedRelicSet, newSlot) ? selectedRelicSet : "");
            setSelectedRelicLevel(15);
            setListSelectedSubStats([
                { affixId: "", property: "", rollCount: 0, stepCount: 0 },
                { affixId: "", property: "", rollCount: 0, stepCount: 0 },
                { affixId: "", property: "", rollCount: 0, stepCount: 0 },
                { affixId: "", property: "", rollCount: 0, stepCount: 0 }
            ]);
        }
    };

    const handleSwitchSlot = (newSlot: string) => {
        if (newSlot === selectedRelicSlot) return;
        setSwitchError("");

        const hasTargetRelic = Boolean(currentProfile?.relics?.[newSlot]);
        const hasCurrentRelic = Boolean(currentProfile?.relics?.[selectedRelicSlot]) || isCurrentRelicChanged();

        // Target slot is empty: offer to copy this configuration.
        if (!hasTargetRelic && hasCurrentRelic) {
            setPendingTargetSlot(newSlot);
            setSwitchDialogType("emptySlot");
            const targetMainMap = mainAffix["5" + newSlot] || {};
            const firstKey = Object.keys(targetMainMap)[0] || "";
            setPreviewMainStat(firstKey);
            setConflictReplacementMap({});
            return;
        }

        // Target has a relic and unsaved changes: offer to save or discard.
        if (isCurrentRelicChanged()) {
            setPendingTargetSlot(newSlot);
            setSwitchDialogType("hasRelic");
            return;
        }

        doSwitchSlot(newSlot);
    };

    const targetSlotMainAffixes = useMemo(() => {
        if (!pendingTargetSlot) return {};
        return mainAffix["5" + pendingTargetSlot] || {};
    }, [mainAffix, pendingTargetSlot]);

    const targetMainProperty = useMemo(() => {
        return targetSlotMainAffixes[previewMainStat]?.Property || "";
    }, [targetSlotMainAffixes, previewMainStat]);

    const conflictingSubStatIndex = useMemo(() => {
        if (!targetMainProperty) return -1;
        return listSelectedSubStats.findIndex(
            (item) => item.affixId && item.property === targetMainProperty
        );
    }, [targetMainProperty, listSelectedSubStats]);

    const replacementOptions = useMemo(() => {
        if (conflictingSubStatIndex === -1) return {};
        const options: Record<string, SubAffixData> = {};
        const all5StarSubs = subAffix["5"] || {};

        const usedProperties = new Set<string>();
        usedProperties.add(targetMainProperty);
        listSelectedSubStats.forEach((sub, idx) => {
            if (idx !== conflictingSubStatIndex && sub.property) {
                usedProperties.add(sub.property);
            }
        });

        for (const [key, val] of Object.entries(all5StarSubs)) {
            if (!usedProperties.has(val.Property)) {
                options[key] = val;
            }
        }
        return options;
    }, [conflictingSubStatIndex, subAffix, targetMainProperty, listSelectedSubStats]);

    const hasUnresolvedConflict = useMemo(() => {
        if (conflictingSubStatIndex === -1) return false;
        const repId = conflictReplacementMap[targetMainProperty];
        return !repId || !replacementOptions[repId];
    }, [conflictingSubStatIndex, conflictReplacementMap, targetMainProperty, replacementOptions]);

    const previewResolvedSubStats = useMemo(() => {
        return listSelectedSubStats.map((item, idx) => {
            if (idx === conflictingSubStatIndex) {
                const repId = conflictReplacementMap[targetMainProperty] || "";
                const repData = subAffix["5"]?.[repId];
                return {
                    affixId: repId,
                    property: repData?.Property || "",
                    rollCount: item.rollCount,
                    stepCount: item.stepCount,
                    isConflict: true,
                    originalProperty: item.property,
                };
            }
            return {
                affixId: item.affixId,
                property: item.property,
                rollCount: item.rollCount,
                stepCount: item.stepCount,
                isConflict: false,
                originalProperty: item.property,
            };
        });
    }, [listSelectedSubStats, conflictingSubStatIndex, conflictReplacementMap, targetMainProperty, subAffix]);

    const handleConfirmSaveAndSwitchCase1 = () => {
        setSwitchError("");
        if (!pendingTargetSlot) return;

        if (!isCurrentRelicValid()) {
            setSwitchError(transI18n("incompleteRelicWarning"));
            return;
        }

        saveCurrentRelic();
        doSwitchSlot(pendingTargetSlot);
        const slotInfo = slotIconMap[pendingTargetSlot];
        const slotName = slotInfo?.key && transI18n.has(slotInfo.key)
            ? transI18n(slotIconMap[pendingTargetSlot].key)
            : pendingTargetSlot;
        setSwitchDialogType(null);
        setPendingTargetSlot(null);
        toast.success(transI18n("relicSavedAndSwitched", { slot: slotName }));
    };

    const handleConfirmCopyAndSwitch = () => {
        setSwitchError("");
        if (!pendingTargetSlot) return;

        if (!isCurrentRelicValid()) {
            setSwitchError(transI18n("incompleteRelicWarning"));
            return;
        }

        if (!previewMainStat) {
            setSwitchError(transI18n("pleaseSelectAllOptions"));
            return;
        }

        if (hasUnresolvedConflict) {
            setSwitchError(transI18n("pleaseSelectReplacement"));
            return;
        }

        if (isCurrentRelicChanged()) {
            saveCurrentRelic();
        }

        const targetSlot = pendingTargetSlot;
        setSelectedRelicSlot(targetSlot);
        resetHistory(null);
        setSelectedMainStat(previewMainStat);
        setSelectedRelicSet(isCompatibleSet(selectedRelicSet, targetSlot) ? selectedRelicSet : "");
        setSelectedRelicLevel(15);
        setListSelectedSubStats(
            previewResolvedSubStats.map((item) => ({
                affixId: item.affixId,
                property: item.property,
                rollCount: item.rollCount,
                stepCount: item.stepCount,
            }))
        );

        const slotInfo = slotIconMap[targetSlot];
        const slotName = slotInfo?.key && transI18n.has(slotInfo.key)
            ? transI18n(slotInfo.key)
            : targetSlot;
        setSwitchDialogType(null);
        setPendingTargetSlot(null);
        toast.success(transI18n("copiedSubstatsSuccessfully", { slot: slotName }));
    };

    const handleConfirmSaveOnlyAndSwitch = () => {
        setSwitchError("");
        if (!pendingTargetSlot) return;

        if (!isCurrentRelicValid()) {
            setSwitchError(transI18n("incompleteRelicWarning"));
            return;
        }

        saveCurrentRelic();
        doSwitchSlot(pendingTargetSlot);
        const slotInfo = slotIconMap[pendingTargetSlot];
        const slotName = slotInfo?.key && transI18n.has(slotInfo.key)
            ? transI18n(slotInfo.key)
            : pendingTargetSlot;
        setSwitchDialogType(null);
        setPendingTargetSlot(null);
        toast.success(transI18n("relicSavedAndSwitched", { slot: slotName }));
    };

    const handleConfirmDiscardAndSwitch = () => {
        if (!pendingTargetSlot) return;
        doSwitchSlot(pendingTargetSlot);
        setSwitchDialogType(null);
        setPendingTargetSlot(null);
    };

    const handleCancelSwitch = () => {
        setSwitchDialogType(null);
        setPendingTargetSlot(null);
        setSwitchError("");
    };

    const relicSets = useMemo(() => {
        const listSet: Record<string, RelicSetDetail> = {};
        for (const [key, value] of Object.entries(mapRelicSet  || {})) {
            let isOk = false;
            for (const key2 of Object.keys(value.Parts)) {
                if (key2 == mappingRelicSlot?.[selectedRelicSlot]) {
                    isOk = true;
                    break;
                }
            }
            if (isOk) {
                listSet[key] = value;
            }
        }
        return listSet;
    }, [mapRelicSet , selectedRelicSlot]);

    const subAffixOptions = useMemo(() => {
        const listSet: Record<string, SubAffixData> = {};
        const subAffixMap = subAffix["5"];
        const mainAffixMap = mainAffix["5" + selectedRelicSlot]

        if (Object.keys(subAffixMap || {}).length === 0 || Object.keys(mainAffixMap || {}).length === 0) return listSet;

        for (const [key, value] of Object.entries(subAffixMap)) {
            if (value.Property !== mainAffixMap[selectedMainStat]?.Property) {
                listSet[key] = value;
            }
        }
        return listSet;
    }, [subAffix, mainAffix, selectedRelicSlot, selectedMainStat]);

    useEffect(() => {
        const subAffixMap = subAffix["5"];
        const mainAffixMap = mainAffix["5" + selectedRelicSlot];

        if (!subAffixMap || !mainAffixMap) return;

        const mainProp = mainAffixMap[selectedMainStat]?.Property;
        if (!mainProp) return;

        const newSubAffixes = structuredClone(listSelectedSubStats);
        let updated = false;

        for (let i = 0; i < newSubAffixes.length; i++) {
            if (newSubAffixes[i].property === mainProp) {
                newSubAffixes[i].affixId = "";
                newSubAffixes[i].property = "";
                newSubAffixes[i].rollCount = 0;
                newSubAffixes[i].stepCount = 0;
                updated = true;
            }
        }

        if (updated) setListSelectedSubStats(newSubAffixes);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMainStat, subAffix, mainAffix, selectedRelicSlot]);

    const exSubAffixOptions = useMemo(() => {
        const listSet: Record<string, SubAffixData> = {};
        const subAffixMap = subAffix["5"];
        const mainAffixMap = mainAffix["5" + selectedRelicSlot];

        if (!subAffixMap || !mainAffixMap) return listSet;

        for (const [key, value] of Object.entries(subAffixMap)) {
            const subAffix = listSelectedSubStats.find((item) => item.property === value.Property);
            if (subAffix && value.Property !== mainAffixMap[selectedMainStat]?.Property) {
                listSet[key] = value;
            }
        }
        return listSet;
    }, [subAffix, listSelectedSubStats, mainAffix, selectedRelicSlot, selectedMainStat]);

    const effectBonus = useMemo(() => {
        const affixSet = mainAffix?.["5" + selectedRelicSlot];
        if (!affixSet) return 0;

        const data = affixSet[selectedMainStat];
        if (!data) return 0;

        return calcMainAffixBonus(data, selectedRelicLevel);
    }, [mainAffix, selectedRelicSlot, selectedMainStat, selectedRelicLevel]);

    const handleSubStatChange = (key: string, index: number, rollCount: number, stepCount: number) => {
        setError("");
        const newSubAffixes = structuredClone(listSelectedSubStats);
        if (!subAffixOptions[key]) {
            newSubAffixes[index].affixId = "";
            newSubAffixes[index].property = "";
            newSubAffixes[index].rollCount = rollCount;
            newSubAffixes[index].stepCount = stepCount;
            setListSelectedSubStats(newSubAffixes);
            addHistory(index, newSubAffixes[index]);
            return;
        }
        newSubAffixes[index].affixId = key;
        newSubAffixes[index].property = subAffixOptions[key].Property;
        newSubAffixes[index].rollCount = rollCount;
        newSubAffixes[index].stepCount = stepCount;
        setListSelectedSubStats(newSubAffixes);
        addHistory(index, newSubAffixes[index]);
    };

    const handlerRollback = (index: number) => {
        setError("");
        if (!preSelectedSubStats[index]) return;

        const keys = Object.keys(preSelectedSubStats[index]);
        if (keys.length <= 1) return;

        const newSubAffixes = structuredClone(listSelectedSubStats);
        const listHistory = structuredClone(preSelectedSubStats[index]);
        const secondLastKey = listHistory.length - 2;
        const preSubAffixes = { ...listHistory[secondLastKey] };
        newSubAffixes[index].rollCount = preSubAffixes.rollCount;
        newSubAffixes[index].stepCount = preSubAffixes.stepCount;
        setListSelectedSubStats(newSubAffixes);
        popHistory(index);
    };

    const resetSubStat = (index: number) => {
        const newSubAffixes = structuredClone(listSelectedSubStats);
        resetHistory(index);
        newSubAffixes[index].affixId = "";
        newSubAffixes[index].property = "";
        newSubAffixes[index].rollCount = 0;
        newSubAffixes[index].stepCount = 0;
        setListSelectedSubStats(newSubAffixes);
    };

    const randomizeStats = () => {
        const newSubAffixes = structuredClone(listSelectedSubStats);
        const exKeys = Object.keys(exSubAffixOptions);
        for (let i = 0; i < newSubAffixes.length; i++) {
            const keys = Object.keys(subAffixOptions).filter((key) => !exKeys.includes(key));
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            exKeys.push(randomKey);
            const randomValue = subAffixOptions[randomKey];
            newSubAffixes[i].affixId = randomKey;
            newSubAffixes[i].property = randomValue.Property;
            newSubAffixes[i].rollCount = 0;
            newSubAffixes[i].stepCount = 0;
        }
        for (let i = 0; i < newSubAffixes.length; i++) {
            addHistory(i, newSubAffixes[i]);
        }
        setListSelectedSubStats(newSubAffixes);

    };

    const randomizeRolls = () => {
        const newSubAffixes = structuredClone(listSelectedSubStats);
        const randomRolls = randomPartition(9, listSelectedSubStats.length);
        for (let i = 0; i < listSelectedSubStats.length; i++) {
            newSubAffixes[i].rollCount = randomRolls[i];
            newSubAffixes[i].stepCount = randomStep(randomRolls[i]);
        }
        setListSelectedSubStats(newSubAffixes);
        for (let i = 0; i < newSubAffixes.length; i++) {
            addHistory(i, newSubAffixes[i]);
        }
    };

    const handlerSaveRelic = (closeModal: boolean = true) => {
        setError("");
        if (!selectedRelicSet || !selectedMainStat || !selectedRelicLevel || !selectedRelicSlot) {
            setError(transI18n("pleaseSelectAllOptions"));
            return;
        };

        if (listSelectedSubStats.find((item) => item.affixId === "")) {
            setError(transI18n("pleaseSelectAllSubStats"));
            return;
        };

        const relic: RelicStore = {
            level: selectedRelicLevel,
            relic_id: Number(`6${selectedRelicSet}${selectedRelicSlot}`),
            relic_set_id: Number(selectedRelicSet),
            main_affix_id: Number(selectedMainStat),
            sub_affixes: listSelectedSubStats.map((item) => ({
                sub_affix_id: Number(item.affixId),
                count: item.rollCount,
                step: item.stepCount
            }))
        };

        if (inventoryMode) {
            if (!isRelicInventorySlot(selectedRelicSlot)) {
                setError(transI18n("pleaseSelectAllOptions"));
                return;
            }
            if (editInstanceId) removeRelic(editInstanceId);
            addRelic(selectedRelicSlot, relic);
            toast.success(transI18n("relicSavedSuccessfully"));
            router.push(`/relic-picker?slot=${selectedRelicSlot}`, { scroll: false });
            return;
        }

        if (avatar && currentProfile) {
            const profileIndex = avatar.profileSelect;
            const newProfileList = [...avatar.profileList];
            newProfileList[profileIndex] = {
                ...currentProfile,
                relics: {
                    ...currentProfile.relics,
                    [selectedRelicSlot]: relic
                }
            };
            setAvatar({
                ...avatar,
                profileList: newProfileList
            });
        }
        if (closeModal) {
            setIsOpenRelic(false);
        }

        toast.success(transI18n("relicSavedSuccessfully"));
    }

    const handlerDeleteCurrentRelic = () => {
        if (avatar && currentProfile && selectedRelicSlot) {
            const profileIndex = avatar.profileSelect;
            const newRelics = { ...currentProfile.relics };
            delete newRelics[selectedRelicSlot];
            const newProfileList = [...avatar.profileList];
            newProfileList[profileIndex] = {
                ...currentProfile,
                relics: newRelics,
            };
            setAvatar({
                ...avatar,
                profileList: newProfileList,
            });
            setIsOpenRelic(false);
            toast.success(transI18n("relicDeletedSuccessfully"));
        }
    };

    const renderSlotSwitcher = () => (
        <div className="p-1.5 sm:p-2.5 rounded-xl bg-base-200/50 border border-base-content/10 shadow-xs">
            <div className="flex items-center justify-between px-1 pb-1 sm:pb-1.5 border-b border-base-content/10 text-xs font-bold text-base-content/70">
                <span className="uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    {transI18n("slot")}
                </span>
                <span className="font-mono text-[11px] text-base-content/60">
                    {selectedRelicSlot && slotIconMap[selectedRelicSlot]?.key && transI18n.has(slotIconMap[selectedRelicSlot].key)
                        ? transI18n(slotIconMap[selectedRelicSlot].key)
                        : (selectedRelicSlot ? (slotIconMap[selectedRelicSlot]?.key || selectedRelicSlot) : "")}
                </span>
            </div>
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 pt-1 sm:pt-1.5">
                {["1", "2", "3", "4", "5", "6"].map((slotKey) => {
                    const isSelected = selectedRelicSlot === slotKey;
                    const equippedRelic = currentProfile?.relics?.[slotKey];
                    const slotInfo = slotIconMap[slotKey];
                    const slotName = slotInfo?.key && transI18n.has(slotInfo.key)
                        ? transI18n(slotInfo.key)
                        : (slotInfo?.key || slotKey);
                    const relicImgUrl = equippedRelic?.relic_set_id
                        ? `${process.env.CDN_URL}/spriteoutput/relicfigures/iconrelic_${equippedRelic.relic_set_id}_${slotKey}.webp`
                        : slotInfo?.icon;

                    return (
                        <button
                            key={slotKey}
                            type="button"
                            onClick={() => handleSwitchSlot(slotKey)}
                            className={`relative group flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                                isSelected
                                    ? "bg-primary text-primary-content border-primary shadow-xs shadow-primary/30 scale-[1.02] z-10"
                                    : equippedRelic
                                    ? "bg-base-100 hover:bg-base-200/80 border-base-content/15 text-base-content hover:border-primary/40"
                                    : "bg-base-100/40 hover:bg-base-100/80 border-dashed border-base-content/15 text-base-content/50 hover:border-base-content/30"
                            }`}
                            title={`${slotName}${equippedRelic ? ` (+${equippedRelic.level})` : ""}`}
                        >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center relative">
                                {relicImgUrl ? (
                                    <Image
                                        src={relicImgUrl}
                                        alt={slotName}
                                        unoptimized
                                        width={32}
                                        height={32}
                                        className={`w-6 h-6 sm:w-7 sm:h-7 object-contain transition-transform duration-150 ${
                                            isSelected ? "scale-105 drop-shadow-xs" : "group-hover:scale-105"
                                        } ${!equippedRelic && !isSelected ? "opacity-50" : ""}`}
                                    />
                                ) : null}
                                {equippedRelic && (
                                    <span
                                        className={`absolute -top-1 -right-1 text-[8px] font-mono font-black px-0.5 rounded-xs shadow-xs ${
                                            isSelected
                                                ? "bg-primary-content text-primary"
                                                : "bg-primary/20 text-primary border border-primary/30"
                                        }`}
                                    >
                                        +{equippedRelic.level}
                                    </span>
                                )}
                            </div>
                            <span
                                className={`text-[9px] sm:text-[10px] font-semibold truncate max-w-full text-center mt-0.5 leading-tight ${
                                    isSelected ? "text-primary-content font-bold" : "text-base-content/80"
                                }`}
                            >
                                {slotName}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="space-y-2 sm:space-y-3">
            {!inventoryMode && <div className="lg:hidden">{renderSlotSwitcher()}</div>}

            <div className="grid grid-cols-1 items-stretch gap-2 sm:gap-3 lg:grid-cols-2 lg:gap-4">
                <div className="h-full space-y-2 sm:space-y-2.5">
                    <div className={`p-2.5 sm:p-3.5 rounded-xl bg-base-200/50 border border-base-content/10 shadow-xs ${inventoryMode ? "flex h-full min-h-[440px] flex-col gap-2 sm:gap-2.5" : "space-y-2 sm:space-y-2.5"}`}>
                        <div className="pb-1 sm:pb-1.5 border-b border-base-content/10">
                            <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
                                <span className="w-1.5 h-3.5 bg-primary rounded-full"></span>
                                {transI18n("mainSettings")}
                            </h2>
                        </div>

                        <div className={inventoryMode ? "flex flex-1 flex-col gap-2 sm:gap-2.5" : "space-y-2 sm:space-y-2.5"}>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-base-content/75 mb-0.5 sm:mb-1">
                                    {transI18n("set")}
                                </label>
                                <div className={inventoryMode ? "grid grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] gap-2" : ""}>
                                    {inventoryMode && (
                                        <SelectCustomImage
                                            customSet={["1", "2", "3", "4", "5", "6"].map((slot) => ({
                                                value: slot,
                                                label: transI18n(slotIconMap[slot].key),
                                                imageUrl: slotIconMap[slot].icon,
                                            }))}
                                            excludeSet={[]}
                                            selectedCustomSet={selectedRelicSlot}
                                            placeholder={transI18n("slot")}
                                            setSelectedCustomSet={handleInventorySlotChange}
                                        />
                                    )}
                                    <SelectCustomImage
                                        customSet={Object.entries(relicSets).map(([key, value]) => ({
                                            value: key,
                                            label: getLocaleName(locale, value.Name),
                                            imageUrl: `${process.env.CDN_URL}/${value.Image.SetIconPath}`
                                        }))}
                                        excludeSet={[]}
                                        selectedCustomSet={selectedRelicSet}
                                        placeholder={transI18n("selectASet")}
                                        setSelectedCustomSet={setSelectedRelicSet}
                                    />
                                </div>
                            </div>

                            {/* Set Bonus Display (Expanded height on desktop, with overflow-y-auto so text is never truncated) */}
                            <div className="py-1.5 px-2 sm:py-2 sm:px-2.5 text-xs border border-base-content/10 rounded-lg bg-base-100/50 max-h-40 sm:max-h-48 xl:max-h-56 overflow-y-auto">
                                {selectedRelicSet !== "" && mapRelicSet[selectedRelicSet] ? (
                                    Object.entries(mapRelicSet[selectedRelicSet].Skills).map(([key, value]) => (
                                        <div key={key} className="mb-2 last:mb-0 space-y-0.5">
                                            <span className="font-bold text-amber-500 text-[11px]">{transI18n("pieceBonus", { count: key })}</span>
                                            <div
                                                className="text-base-content/85 text-[11px] leading-relaxed pl-1"
                                                dangerouslySetInnerHTML={{
                                                    __html: replaceByParam(
                                                        getLocaleName(locale, value.Desc),
                                                        value.Param || []
                                                    )
                                                }}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-base-content/40 italic py-1 text-[11px]">{transI18n("pleaseSelectASet")}</p>
                                )}
                            </div>

                            {inventoryMode && (
                                <p className="text-[11px] font-bold text-base-content/75">
                                    {transI18n("rarity")}: 5
                                </p>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-base-content/75 mb-0.5 sm:mb-1">
                                    {transI18n("mainStat")}
                                </label>
                                <SelectCustomImage
                                    customSet={Object.entries(mainAffix["5" + selectedRelicSlot] || {}).map(([key, value]) => ({
                                        value: key,
                                        label: mappingStats[value.Property].name + " " + mappingStats[value.Property].unit,
                                        imageUrl: `${process.env.CDN_URL}/${mappingStats[value.Property].icon}`
                                    }))}
                                    excludeSet={[]}
                                    selectedCustomSet={selectedMainStat}
                                    placeholder={transI18n("selectAMainStat")}
                                    setSelectedCustomSet={setSelectedMainStat}
                                />
                            </div>

                            <div className="space-y-1.5 sm:space-y-2 pt-0.5">
                                {!inventoryMode && (
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-base-content/75">{transI18n("effectBonus")}:</span>
                                        <span className="font-mono text-primary font-bold text-sm">+{effectBonus}</span>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-base-content/75">{transI18n("level")}</span>
                                        <span className="font-mono text-primary font-bold">+{selectedRelicLevel}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="15"
                                        value={selectedRelicLevel}
                                        onChange={(e) => setSelectedRelicLevel(parseInt(e.target.value))}
                                        className="range range-primary range-xs w-full"
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        key="error"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-xs text-error font-bold text-center bg-error/10 p-1.5 rounded-lg border border-error/20"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <div className={`flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-1 pt-1 border-t border-base-content/10 ${inventoryMode ? "mt-auto" : ""}`}>
                                {!inventoryMode && currentProfile?.relics?.[selectedRelicSlot] && (
                                    <button
                                        type="button"
                                        onClick={handlerDeleteCurrentRelic}
                                        className="btn btn-outline btn-error btn-sm rounded-xl font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer gap-1.5"
                                        title={transI18n("deleteRelic")}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{transI18n("deleteRelic")}</span>
                                    </button>
                                )}
                                {inventoryMode ? (
                                    <button
                                        type="button"
                                        onClick={() => handlerSaveRelic(false)}
                                        className="btn btn-primary btn-sm flex-1 rounded-xl font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        {transI18n("save")}
                                    </button>
                                ) : (
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => handlerSaveRelic(false)}
                                        className="btn btn-outline btn-primary btn-sm rounded-xl font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        {transI18n("save")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlerSaveRelic(true)}
                                        className="btn btn-primary btn-sm rounded-xl font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        {transI18n("saveAndClose")}
                                    </button>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                    {!inventoryMode && <div className="hidden lg:block">{renderSlotSwitcher()}</div>}

                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                        {listSelectedSubStats.map((v, index) => (
                            <div key={index} className={`rounded-xl bg-base-200/40 border border-base-content/10 shadow-xs ${inventoryMode ? "space-y-1 px-2 py-1.5 sm:px-2.5" : "space-y-1.5 p-2 sm:space-y-2.5 sm:p-2.5 md:p-3"}`}>
                                <div className={`items-center gap-2 ${inventoryMode ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "flex justify-between"}`}>
                                    <div className="flex-1 min-w-0">
                                        <SelectCustomImage
                                            customSet={Object.entries(subAffixOptions).map(([key, value]) => ({
                                                value: key,
                                                label: mappingStats[value.Property].name + " " + mappingStats[value.Property].unit,
                                                imageUrl: `${process.env.CDN_URL}/${mappingStats[value.Property].icon}`
                                            }))}
                                            excludeSet={Object.entries(exSubAffixOptions).map(([key, value]) => ({
                                                value: key,
                                                label: mappingStats[value.Property].name + " " + mappingStats[value.Property].unit,
                                                imageUrl: `${process.env.CDN_URL}/${mappingStats[value.Property].icon}`
                                            }))}
                                            selectedCustomSet={v.affixId}
                                            placeholder={transI18n("selectASubStat")}
                                            setSelectedCustomSet={(key) => handleSubStatChange(key, index, 0, 0)}
                                        />
                                    </div>

                                    <div className="rounded-lg bg-base-100 px-2 py-0.5 text-right shadow-xs">
                                        <span className="block whitespace-nowrap font-mono text-sm font-black leading-tight text-primary sm:text-base">
                                            {inventoryMode && !v.affixId ? "—" : (
                                                <>
                                                    {inventoryMode && `+${v.rollCount} `}
                                                    {inventoryMode ? "" : "+"}{calcAffixBonus(subAffixOptions[v.affixId], v.stepCount, v.rollCount)}{mappingStats?.[subAffixOptions[v.affixId]?.Property]?.unit || ""}
                                                </>
                                            )}
                                        </span>
                                        {!inventoryMode && (
                                            <span className="text-[11px] sm:text-xs text-base-content/60 font-mono font-semibold">
                                                R: {v.rollCount} | S: {v.stepCount}
                                            </span>
                                        )}
                                    </div>
                                    {inventoryMode && (
                                        <div className="grid grid-cols-3 gap-1">
                                            {[0, 1, 2].map((stepOffset) => (
                                                <button
                                                    key={stepOffset}
                                                    type="button"
                                                    disabled={!v.affixId}
                                                    onClick={() => handleSubStatChange(v.affixId, index, v.rollCount + 1, v.stepCount + stepOffset)}
                                                    className="btn btn-xs min-h-7 h-7 rounded-lg border border-base-content/15 bg-base-100 px-1 font-mono text-[11px] font-bold text-base-content shadow-xs hover:bg-base-200 sm:text-xs"
                                                >
                                                    {calcAffixBonus(subAffixOptions[v.affixId], v.stepCount + stepOffset, v.rollCount + 1)}{mappingStats?.[subAffixOptions[v.affixId]?.Property]?.unit || ""}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {inventoryMode ? (
                                    <div className="flex items-center justify-between gap-2 border-t border-base-content/10 pt-1">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs h-6 min-h-6 rounded-md px-2 text-[11px] font-bold text-error hover:bg-error/10"
                                                onClick={() => resetSubStat(index)}
                                            >
                                                {transI18n("reset")}
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={transI18n("rollBack")}
                                                title={transI18n("rollBack")}
                                                className="btn btn-ghost btn-xs h-6 min-h-6 w-7 rounded-md px-1 text-sm font-bold text-warning hover:bg-warning/10"
                                                onClick={() => handlerRollback(index)}
                                            >
                                                −
                                            </button>
                                        </div>
                                        <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-base-content/65">
                                            Roll {v.rollCount} Step {v.stepCount}
                                        </span>
                                    </div>
                                ) : (
                                <>
                                <div className="grid grid-cols-2 gap-1.5 pt-0.5 sm:gap-2">
                                    <div className="space-y-1 sm:space-y-1.5">
                                        <div className="flex items-center gap-1 text-xs font-bold text-success leading-none">
                                            <ChevronUp className="w-3.5 h-3.5" />
                                            <span>{transI18n("upRoll")}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[0, 1, 2].map((stepOffset) => (
                                                 <button
                                                    key={stepOffset}
                                                    type="button"
                                                    onClick={() => handleSubStatChange(v.affixId, index, v.rollCount + 1, v.stepCount + stepOffset)}
                                                    className="btn btn-xs btn-success rounded-lg font-mono font-bold shadow-xs px-1 text-xs sm:text-[13px] h-7 min-h-7 cursor-pointer"
                                                >
                                                    +{calcAffixBonus(subAffixOptions[v.affixId], v.stepCount + stepOffset, v.rollCount + 1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1 sm:space-y-1.5">
                                        <div className="flex items-center gap-1 text-xs font-bold text-error leading-none">
                                            <ChevronDown className="w-3.5 h-3.5" />
                                            <span>{transI18n("downRoll")}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[0, 1, 2].map((stepOffset) => (
                                                <button
                                                    key={stepOffset}
                                                    type="button"
                                                    onClick={() => handleSubStatChange(v.affixId, index, Math.max(v.rollCount - 1, 0), Math.max(v.stepCount - stepOffset, 0))}
                                                    className="btn btn-xs btn-error rounded-lg font-mono font-bold shadow-xs px-1 text-xs sm:text-[13px] h-7 min-h-7 cursor-pointer"
                                                >
                                                    -{calcAffixBonus(subAffixOptions[v.affixId], Math.max(v.stepCount - stepOffset, 0), Math.max(v.rollCount - 1, 0))}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 sm:gap-2 pt-1 border-t border-base-content/10">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-warning hover:bg-warning/10 rounded-md text-xs sm:text-[13px] font-bold h-7 min-h-7 px-2 sm:px-2.5 cursor-pointer"
                                        onClick={() => handlerRollback(index)}
                                    >
                                        {transI18n("rollBack")}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-md text-xs sm:text-[13px] font-bold h-7 min-h-7 px-2 sm:px-2.5 cursor-pointer"
                                        onClick={() => resetSubStat(index)}
                                    >
                                        {transI18n("reset")}
                                    </button>
                                </div>
                                </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-base-200/50 border border-base-content/10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold uppercase tracking-wider text-base-content/85">{transI18n("totalRoll")}:</span>
                            <span className="text-sm font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                {listSelectedSubStats.reduce((a, b) => a + b.rollCount, 0)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-xs sm:btn-sm btn-outline btn-primary rounded-lg font-bold text-xs sm:text-sm cursor-pointer"
                                onClick={randomizeStats}
                            >
                                {transI18n("randomizeStats")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs sm:btn-sm btn-outline btn-accent rounded-lg font-bold text-xs sm:text-sm cursor-pointer"
                                onClick={randomizeRolls}
                            >
                                {transI18n("randomizeRolls")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {switchDialogType === "emptySlot" && pendingTargetSlot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-lg bg-base-100 border border-base-content/15 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <Copy className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm sm:text-base text-base-content">
                                            {transI18n("emptySlotCopyTitle")}
                                        </h3>
                                        <p className="text-xs text-base-content/60">
                                            {transI18n("emptySlotCopyPrompt", {
                                                slot: slotIconMap[pendingTargetSlot]?.key && transI18n.has(slotIconMap[pendingTargetSlot].key)
                                                    ? transI18n(slotIconMap[pendingTargetSlot].key)
                                                    : pendingTargetSlot
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCancelSwitch}
                                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-3 rounded-xl bg-base-200/60 border border-base-content/10 space-y-2">
                                <label className="text-xs font-bold text-base-content flex items-center justify-between">
                                    <span>{transI18n("selectTargetMainStat")}</span>
                                    <span className="font-mono text-[11px] text-primary">
                                        {slotIconMap[pendingTargetSlot]?.key && transI18n.has(slotIconMap[pendingTargetSlot].key)
                                            ? transI18n(slotIconMap[pendingTargetSlot].key)
                                            : pendingTargetSlot}
                                    </span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {Object.entries(targetSlotMainAffixes).map(([key, affix]) => {
                                        const statMeta = mappingStats[affix.Property];
                                        const isSelected = previewMainStat === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setPreviewMainStat(key)}
                                                className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "bg-primary text-primary-content border-primary shadow-xs font-bold"
                                                        : "bg-base-100 hover:bg-base-200 border-base-content/10 text-base-content"
                                                }`}
                                            >
                                                {statMeta?.icon && (
                                                    <Image
                                                        src={`${process.env.CDN_URL}/${statMeta.icon}`}
                                                        alt={statMeta.name}
                                                        unoptimized
                                                        width={18}
                                                        height={18}
                                                        className="w-4 h-4 object-contain"
                                                    />
                                                )}
                                                <span className="text-xs truncate">
                                                    {statMeta?.name} {statMeta?.unit}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-base-content/80">
                                    <span>{transI18n("subStatsPreview")}</span>
                                    {hasUnresolvedConflict ? (
                                        <span className="text-warning flex items-center gap-1 text-[11px]">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {transI18n("mainStatConflict", {
                                                stat: mappingStats[targetMainProperty]?.name || targetMainProperty
                                            })}
                                        </span>
                                    ) : (
                                        <span className="text-success flex items-center gap-1 text-[11px]">
                                            <Check className="w-3.5 h-3.5" />
                                            {transI18n("valid")}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {previewResolvedSubStats.map((sub, idx) => {
                                        const originalMeta = mappingStats[sub.originalProperty];
                                        if (sub.isConflict) {
                                            const currentReplacementId = conflictReplacementMap[targetMainProperty] || "";
                                            const isResolved = Boolean(currentReplacementId && replacementOptions[currentReplacementId]);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-2.5 rounded-xl border-2 transition-all space-y-1.5 ${
                                                        isResolved
                                                            ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-400/30"
                                                            : "border-warning/50 bg-warning/5"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                                        {isResolved ? (
                                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>{transI18n("valid")}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-warning">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {transI18n("mainStatConflict", {
                                                                    stat: originalMeta?.name || sub.originalProperty
                                                                })}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-mono text-base-content/60">
                                                            {sub.rollCount > 0 ? transI18n("rollCount", { count: sub.rollCount }) : ""}
                                                        </span>
                                                    </div>
                                                    <select
                                                        value={currentReplacementId}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setConflictReplacementMap(prev => ({
                                                                ...prev,
                                                                [targetMainProperty]: val,
                                                            }));
                                                        }}
                                                        className={`select select-xs w-full bg-base-100 text-xs font-semibold rounded-lg ${
                                                            isResolved
                                                                ? "border-emerald-500/30 focus:border-emerald-500"
                                                                : "border-warning/40 focus:border-warning"
                                                        }`}
                                                    >
                                                        <option value="" disabled>-- {transI18n("replaceWith")} --</option>
                                                        {Object.entries(replacementOptions).map(([affixKey, affixVal]) => {
                                                            const repMeta = mappingStats[affixVal.Property];
                                                            return (
                                                                <option key={affixKey} value={affixKey}>
                                                                    {repMeta?.name} {repMeta?.unit}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                    {isResolved && sub.affixId && (
                                                        <div className="flex items-center justify-between pt-1 border-t border-emerald-500/15 text-xs">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                {mappingStats[sub.property]?.icon && (
                                                                    <Image
                                                                        src={`${process.env.CDN_URL}/${mappingStats[sub.property].icon}`}
                                                                        alt={mappingStats[sub.property]?.name || "Stat"}
                                                                        unoptimized
                                                                        width={16}
                                                                        height={16}
                                                                        className="w-4 h-4 object-contain"
                                                                    />
                                                                )}
                                                                <span className="font-semibold text-base-content truncate">
                                                                    {mappingStats[sub.property]?.name} {mappingStats[sub.property]?.unit}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                                                +{calcAffixBonus(subAffix["5"]?.[sub.affixId], sub.stepCount, sub.rollCount)}{mappingStats?.[subAffix["5"]?.[sub.affixId]?.Property]?.unit || ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        const statMeta = mappingStats[sub.property];
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2 rounded-xl bg-base-200/40 border border-base-content/10 text-xs"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {statMeta?.icon && (
                                                        <Image
                                                            src={`${process.env.CDN_URL}/${statMeta.icon}`}
                                                            alt={statMeta?.name || "Stat"}
                                                            unoptimized
                                                            width={16}
                                                            height={16}
                                                            className="w-4 h-4 object-contain"
                                                        />
                                                    )}
                                                    <span className="font-semibold text-base-content truncate">
                                                        {statMeta?.name || transI18n("notSelected")} {statMeta?.unit}
                                                    </span>
                                                </div>
                                                {sub.affixId && (
                                                    <span className="font-mono font-bold text-primary text-[11px]">
                                                        +{calcAffixBonus(subAffix["5"]?.[sub.affixId], sub.stepCount, sub.rollCount)}{mappingStats?.[subAffix["5"]?.[sub.affixId]?.Property]?.unit || ""}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {switchError && (
                                <div className="p-2 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-bold text-center">
                                    {switchError}
                                </div>
                            )}

                            <div className="flex flex-col gap-2 pt-2 border-t border-base-content/10">
                                <button
                                    type="button"
                                    onClick={handleConfirmCopyAndSwitch}
                                    className="btn btn-primary btn-sm rounded-xl font-bold shadow-md shadow-primary/25 cursor-pointer gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span>{isCurrentRelicChanged() ? transI18n("saveAndCopy") : transI18n("copy")}</span>
                                </button>
                                {isCurrentRelicChanged() ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={handleConfirmSaveOnlyAndSwitch}
                                            className="btn btn-outline btn-sm rounded-xl font-bold cursor-pointer"
                                        >
                                            {transI18n("saveOnly")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmDiscardAndSwitch}
                                            className="btn btn-ghost btn-sm text-error hover:bg-error/10 rounded-xl font-bold cursor-pointer"
                                        >
                                            {transI18n("discardAndSwitch")}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleConfirmDiscardAndSwitch}
                                        className="btn btn-outline btn-sm rounded-xl font-bold cursor-pointer"
                                    >
                                        {transI18n("discardAndSwitch")}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {switchDialogType === "hasRelic" && pendingTargetSlot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-base-100 border border-base-content/15 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
                                <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                                    <span className="w-2 h-4 bg-primary rounded-full"></span>
                                    {transI18n("switchSlotTitle")}
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleCancelSwitch}
                                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-sm text-base-content/80 leading-relaxed">
                                {transI18n("saveChangesPrompt")}
                            </p>

                            {switchError && (
                                <div className="p-2 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-bold text-center">
                                    {switchError}
                                </div>
                            )}

                            <div className="flex flex-col gap-2 pt-2 border-t border-base-content/10">
                                <button
                                    type="button"
                                    onClick={handleConfirmSaveAndSwitchCase1}
                                    className="btn btn-primary btn-sm rounded-xl font-bold shadow-md shadow-primary/25 cursor-pointer"
                                >
                                    {transI18n("saveAndSwitch")}
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleConfirmDiscardAndSwitch}
                                        className="btn btn-outline btn-warning btn-sm rounded-xl font-bold cursor-pointer"
                                    >
                                        {transI18n("discardAndSwitch")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelSwitch}
                                        className="btn btn-ghost btn-sm rounded-xl font-bold cursor-pointer"
                                    >
                                        {transI18n("cancel")}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
