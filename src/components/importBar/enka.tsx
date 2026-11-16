"use client"

import { useState, useRef } from "react";
import CharacterInfoCard from "../card/characterInfoCard";
import useEnkaStore from "@/stores/enkaStore";
import { FetchEnkaProfile } from "@/lib/api/api";
import { CharacterInfoCardType, EnkaErrorCode, EnkaResponse } from "@/types";
import useUserDataStore from "@/stores/userDataStore";
import { converterOneEnkaDataToAvatarStore } from "@/helper";
import useModelStore from "@/stores/modelStore";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { avatarEnkaDetailSchema, enkaResponseSchema } from "@/zod";
import * as z from "zod";
import useDetailDataStore from "@/stores/detailDataStore";
import { useShallow } from "zustand/react/shallow";
import { 
    Search, 
    CheckCheck, 
    RotateCcw, 
    AlertCircle, 
    Sparkles, 
    ArrowRight,
    Users,
    Globe,
    UserCheck,
    Loader2
} from "lucide-react";

type AvatarEnkaDetailInput = z.infer<typeof avatarEnkaDetailSchema>;

const UID_PATTERN = /^\d{8,10}$/;

const ENKA_ERROR_MESSAGE_KEY: Record<EnkaErrorCode, string> = {
    INVALID_UID: "invalidUid",
    NOT_FOUND: "enkaPlayerNotFound",
    RATE_LIMIT: "enkaRateLimited",
    NOT_READY: "enkaUnderMaintenance",
    UPSTREAM: "failedToFetchEnkaData",
    NETWORK: "failedToFetchEnkaData",
};

const toCharacterInfoCard = (character: AvatarEnkaDetailInput): CharacterInfoCardType => ({
    key: character.avatarId,
    avatar_id: character.avatarId,
    rank: character.rank ?? 0,
    level: character.level,
    lightcone: {
        level: character.equipment?.level ?? 0,
        rank: character.equipment?.rank ?? 0,
        item_id: character.equipment?.tid ?? 0,
    },
    relics: (character.relicList ?? []).map((relic) => ({
        level: relic.level,
        relic_id: relic.tid,
        relic_set_id: parseInt(relic.tid.toString().slice(1, -1), 10),
    })),
});

export default function EnkaImport() {
    const {
        uidInput,
        setUidInput,
        enkaData,
        selectedCharacters,
        setSelectedCharacters,
        setEnkaData,
    } = useEnkaStore(
        useShallow((state) => ({
            uidInput: state.uidInput,
            setUidInput: state.setUidInput,
            enkaData: state.enkaData,
            selectedCharacters: state.selectedCharacters,
            setSelectedCharacters: state.setSelectedCharacters,
            setEnkaData: state.setEnkaData,
        }))
    );
    const transI18n = useTranslations("DataPage");
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    );
    const { setIsOpenImport } = useModelStore(
        useShallow((state) => ({
            setIsOpenImport: state.setIsOpenImport,
        }))
    );
    const { mapAvatar } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
        }))
    );

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const uidInputRef = useRef<HTMLInputElement>(null);
    const validCharacters = enkaData?.detailInfo?.avatarDetailList?.filter((character) => mapAvatar?.[character.avatarId]) ?? [];

    const handlerFetchData = async () => {
        const cleanUid = uidInput.trim();
        if (!cleanUid) {
            setErrorMsg(transI18n("pleaseEnterUid"));
            return;
        }
        if (!UID_PATTERN.test(cleanUid)) {
            setEnkaData(null);
            setSelectedCharacters([]);
            setErrorMsg(transI18n("invalidUid"));
            return;
        }
        setIsLoading(true);
        setErrorMsg("");

        try {
            const result = await FetchEnkaProfile(cleanUid);

            if (!result.ok) {
                // Surface why it failed instead of collapsing everything into one generic toast.
                const message = transI18n(ENKA_ERROR_MESSAGE_KEY[result.code]);
                setEnkaData(null);
                setSelectedCharacters([]);
                setErrorMsg(result.message ? `${message} (${result.message})` : message);
                toast.error(message);
                return;
            }

            const parsed = enkaResponseSchema.safeParse(result.data);

            if (!parsed.success) {
                setEnkaData(null);
                setSelectedCharacters([]);
                setErrorMsg(transI18n("failedToFetchEnkaData"));
                toast.error(transI18n("failedToFetchEnkaData"));
                return;
            }

            setEnkaData(parsed.data as EnkaResponse);
            const validChars = (parsed.data.detailInfo?.avatarDetailList ?? [])
                .filter((character) => mapAvatar?.[character.avatarId])
                .map(toCharacterInfoCard);
            setSelectedCharacters(validChars);
            setErrorMsg("");
        } catch {
            setEnkaData(null);
            setSelectedCharacters([]);
            setErrorMsg(transI18n("failedToFetchEnkaData"));
            toast.error(transI18n("failedToFetchEnkaData"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handlerFetchData();
        }
    };

    const handleCharacterToggle = (character: CharacterInfoCardType) => {
        if (selectedCharacters.some((selected) => selected.key === character.key)) {
            setSelectedCharacters(selectedCharacters.filter((selected) => selected.key !== character.key));
            return;
        }
        setSelectedCharacters([...selectedCharacters, character]);
    };

    const clearSelection = () => {
        setSelectedCharacters([]);
    };

    const selectAll = () => {
        if (enkaData) {
            setSelectedCharacters(validCharacters.map(toCharacterInfoCard));
        }
    };

    const handleImport = () => {
        if (selectedCharacters.length === 0) {
            setErrorMsg(transI18n("pleaseSelectAtLeastOneCharacter"));
            return;
        }
        if (!enkaData) {
            setErrorMsg(transI18n("noDataToImport"));
            return;
        }
        setErrorMsg("");
        const listAvatars = { ...avatars };
        const parsed = enkaResponseSchema.safeParse(enkaData);
        if (!parsed.success) {
            setErrorMsg(transI18n("failedToFetchEnkaData"));
            return;
        }

        const filterData = (parsed.data.detailInfo?.avatarDetailList ?? []).filter((character) => 
            mapAvatar?.[character.avatarId] && selectedCharacters.some((selected) => selected.avatar_id === character.avatarId)
        );

        filterData.forEach((character) => {
            const currentAvatar = listAvatars[character.avatarId.toString()];
            if (currentAvatar && Object.keys(currentAvatar).length !== 0) {
                const newProfileList = [...(currentAvatar.profileList || [])];
                const newProfile = converterOneEnkaDataToAvatarStore(character as unknown as AvatarEnkaDetailInput, newProfileList.length);
                if (newProfile) {
                    newProfileList.push(newProfile);
                }
                const newAvatar = {
                    ...currentAvatar,
                    level: character.level ?? 0,
                    promotion: character.promotion ?? 0,
                    data: {
                        rank: character.rank ?? 0,
                        skills: (character.skillTreeList ?? []).reduce((acc, skill) => {
                            acc[skill.pointId] = skill.level;
                            return acc;
                        }, {} as Record<string, number>),
                    },
                    profileList: newProfileList,
                    profileSelect: newProfile ? newProfileList.length - 1 : currentAvatar.profileSelect,
                };
                setAvatar(newAvatar);
            }
        });

        setIsOpenImport(false);
        toast.success(transI18n("importEnkaDataSuccess"));
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            Enka.Network Live
                        </span>
                        <span className="text-xs text-base-content/50 font-medium">{transI18n("showcaseFetcher")}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-base-content flex items-center gap-2">
                        {transI18n("hsrUidShowcase")}
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50 pointer-events-none" />
                        <input
                            ref={uidInputRef}
                            type="text"
                            value={uidInput}
                            onChange={(e) => setUidInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full h-10 pl-10 pr-9 rounded-xl bg-base-200/90 text-base-content border border-base-content/20 text-sm font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all placeholder:font-sans placeholder:text-xs placeholder:text-base-content/40"
                            placeholder={transI18n("enterUidPlaceholder")}
                        />
                        {uidInput && (
                            <button
                                type="button"
                                onClick={() => setUidInput("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content text-xs p-0.5 rounded-full hover:bg-base-300 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={handlerFetchData} 
                        disabled={isLoading}
                        className={`h-10 min-h-10 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 select-none shrink-0 transition-all duration-200 shadow-md ${
                            isLoading
                                ? 'bg-cyan-600 text-white cursor-wait opacity-90 shadow-cyan-500/30'
                                : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                                <span className="text-white font-bold">{transI18n("fetchingData")}</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-white shrink-0" />
                                <span className="text-white font-bold">{transI18n("getData")}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {enkaData && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-3 px-4 rounded-xl bg-base-200/50 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-base shrink-0">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base-content text-sm sm:text-base truncate">
                                    {enkaData.detailInfo.nickname}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                                    Lv.{enkaData.detailInfo.level}
                                </span>
                                {enkaData.detailInfo.worldLevel && (
                                    <span className="text-[10px] font-mono text-base-content/60 px-1.5 py-0.5 rounded bg-base-300/60">
                                        WL {enkaData.detailInfo.worldLevel}
                                    </span>
                                )}
                            </div>
                            <div className="text-[11px] font-mono text-base-content/50 mt-0.5 truncate">
                                UID: {enkaData.detailInfo.uid}
                                {enkaData.detailInfo.signature && (
                                    <span className="ml-2 font-sans italic text-base-content/40">
                                        &ldquo;{enkaData.detailInfo.signature}&rdquo;
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-xs text-base-content/60">{transI18n("publicCharacters")}:</span>
                        <span className="badge badge-primary font-mono font-bold text-xs">
                            {validCharacters.length}
                        </span>
                    </div>
                </div>
            )}

            {enkaData && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-base-200/60 border border-white/10 shadow-xs">
                    <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-500" />
                            <span className="text-xs sm:text-sm font-bold text-base-content">
                                {transI18n("selectedCharacters")}:
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono font-bold text-xs">
                                {selectedCharacters.length} / {validCharacters.length}
                            </span>
                        </div>

                        <div className="h-4 w-px bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={selectAll}
                                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition-all flex items-center gap-1 cursor-pointer"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                {transI18n("selectAll")}
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
                    </div>

                    <button 
                        type="button"
                        onClick={handleImport}
                        disabled={selectedCharacters.length === 0}
                        className="h-9 px-5 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto cursor-pointer"
                    >
                        <span className="text-white">{transI18n("import")}</span>
                        <span className="font-mono text-xs text-cyan-100">({selectedCharacters.length})</span>
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

            {!isLoading && !enkaData && (
                <div 
                    onClick={() => uidInputRef.current?.focus()}
                    className="relative overflow-hidden py-12 sm:py-16 px-4 sm:px-6 rounded-2xl border border-dashed border-white/15 bg-base-200/20 hover:bg-base-200/40 transition-all duration-300 text-center cursor-pointer group select-none"
                >
                    <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-emerald-500/15 blur-2xl group-hover:scale-150 group-hover:bg-emerald-500/25 transition-all duration-700" />

                    <div className="relative z-10 max-w-md mx-auto space-y-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-base-300/60 border border-white/10 text-emerald-400 mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/20 transition-all duration-300">
                            <Globe className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5]" />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-base sm:text-lg font-bold text-base-content group-hover:text-emerald-400 transition-colors duration-200">
                                {transI18n("fetchFromEnka")}
                            </h3>
                            <p className="text-xs text-base-content/60 leading-relaxed">
                                {transI18n("fetchEnkaHint")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 text-left border-t border-white/5">
                            <div className="p-3 rounded-xl bg-base-300/30 group-hover:bg-base-300/50 transition-colors duration-200">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">{transI18n("step1")}</span>
                                <p className="text-[11px] text-base-content/70 leading-tight">{transI18n("inGameProfile")}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-base-300/30 group-hover:bg-base-300/50 transition-colors duration-200">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">{transI18n("step2")}</span>
                                <p className="text-[11px] text-base-content/70 leading-tight">{transI18n("displayCharactersPublicly")}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-base-300/30 group-hover:bg-base-300/50 transition-colors duration-200">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">{transI18n("step3")}</span>
                                <p className="text-[11px] text-base-content/70 leading-tight">{transI18n("enterUidAndSync")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && enkaData && validCharacters.length === 0 && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{transI18n("displayCharactersPublicly")}</span>
                </div>
            )}

            {!isLoading && enkaData && validCharacters.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {validCharacters.map((character) => (
                        <CharacterInfoCard
                            key={character.avatarId}
                            character={toCharacterInfoCard(character)}
                            selectedCharacters={selectedCharacters}
                            onCharacterToggle={handleCharacterToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

