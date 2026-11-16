"use client"

import { useState, useRef, useMemo } from "react";
import CharacterInfoCard from "../card/characterInfoCard";
import useHoyolabStore from "@/stores/hoyolabStore";
import useModelStore from "@/stores/modelStore";
import useUserDataStore from "@/stores/userDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { CharacterInfoCardType, AvatarJson } from "@/types";
import { ParsedImportData, parseHoyolabData, converterOneHoyolabDataToAvatarStore } from "@/helper";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";
import {
    FileJson,
    CheckCheck,
    RotateCcw,
    AlertCircle,
    ArrowRight,
    Users,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    UploadCloud,
    FileCheck,
    Sparkles,
    Trash2,
    Copy,
    Check,
    WrapText,
    Zap,
} from "lucide-react";

const HIGHLIGHT_LIMIT = 30000;

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightJson(code: string): string {
    if (!code) return "";
    if (code.length <= HIGHLIGHT_LIMIT) {
        return Prism.highlight(code, Prism.languages.json, "json");
    }
    const nextNewline = code.indexOf("\n", HIGHLIGHT_LIMIT);
    const splitIndex = nextNewline !== -1 && nextNewline <= HIGHLIGHT_LIMIT + 2000 ? nextNewline : HIGHLIGHT_LIMIT;
    const head = code.slice(0, splitIndex);
    const tail = code.slice(splitIndex);
    return Prism.highlight(head, Prism.languages.json, "json") + escapeHtml(tail);
}

const toCharacterInfoCard = (
    data: ParsedImportData,
    character: AvatarJson
): CharacterInfoCardType => {
    const lightcone = data.lightcones.find((lc) => lc.equip_avatar === character.avatar_id);
    const relics = data.relics.filter((relic) => relic.equip_avatar === character.avatar_id);

    return {
        key: character.avatar_id,
        avatar_id: character.avatar_id,
        rank: character.data.rank ?? 0,
        level: character.level,
        lightcone: {
            level: lightcone?.level ?? 0,
            rank: lightcone?.rank ?? 0,
            item_id: lightcone?.item_id ?? 0,
        },
        relics: relics.map((relic) => ({
            level: relic.level,
            relic_id: relic.relic_id,
            relic_set_id: relic.relic_set_id,
        })),
    };
};

export default function HoyolabImport() {
    const { avatars, setAvatar } = useUserDataStore(
        useShallow((state) => ({
            avatars: state.avatars,
            setAvatar: state.setAvatar,
        }))
    );
    const { mapAvatar, mapRelicSet, mainAffix, subAffix } = useDetailDataStore(
        useShallow((state) => ({
            mapAvatar: state.mapAvatar,
            mapRelicSet: state.mapRelicSet,
            mainAffix: state.mainAffix,
            subAffix: state.subAffix,
        }))
    );
    const { setIsOpenImport } = useModelStore(
        useShallow((state) => ({
            setIsOpenImport: state.setIsOpenImport,
        }))
    );

    const {
        selectedCharacters,
        setSelectedCharacters,
        hoyolabData,
        setHoyolabData,
        jsonInput,
        setJsonInput,
        fileName,
        setFileName,
    } = useHoyolabStore(
        useShallow((state) => ({
            selectedCharacters: state.selectedCharacters,
            setSelectedCharacters: state.setSelectedCharacters,
            hoyolabData: state.hoyolabData,
            setHoyolabData: state.setHoyolabData,
            jsonInput: state.jsonInput,
            setJsonInput: state.setJsonInput,
            fileName: state.fileName,
            setFileName: state.setFileName,
        }))
    );

    const transI18n = useTranslations("DataPage");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showTutorial, setShowTutorial] = useState(false);
    const [isWordWrap, setIsWordWrap] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const jsonStats = useMemo(() => {
        if (!jsonInput) return null;
        const bytes = new Blob([jsonInput]).size;
        const sizeStr = bytes > 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
            : bytes > 1024
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${bytes} B`;
        const lines = jsonInput.split("\n").length;
        const isLarge = bytes > 50 * 1024;
        return { sizeStr, lines, isLarge };
    }, [jsonInput]);

    const handleCopy = () => {
        if (!jsonInput) return;
        navigator.clipboard.writeText(jsonInput);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
        toast.success(transI18n("copied"));
    };

    const handleFormatJson = () => {
        if (!jsonInput.trim()) return;
        try {
            const parsed = JSON.parse(jsonInput);
            const formatted = JSON.stringify(parsed, null, 2);
            setJsonInput(formatted);
            toast.success(transI18n("formattedJson"));
        } catch {
            toast.error(transI18n("fileMustBeAValidJsonFile"));
        }
    };

    const availableCharacters = hoyolabData
        ? Object.values(hoyolabData.avatars).filter((it) => mapAvatar?.[it.avatar_id.toString()])
        : [];

    const handleParseJsonString = (content: string, name?: string) => {
        const trimmed = content.trim();
        if (!trimmed) {
            setErrorMsg(transI18n("noDataToImport"));
            toast.error(transI18n("noDataToImport"));
            return;
        }

        setIsLoading(true);
        setErrorMsg("");

        try {
            const result = parseHoyolabData(trimmed, mapAvatar, mapRelicSet, mainAffix, subAffix);
            if (!result) {
                setHoyolabData(null);
                setSelectedCharacters([]);
                setErrorMsg(transI18n("fileMustBeAValidJsonFile"));
                toast.error(transI18n("fileMustBeAValidJsonFile"));
                return;
            }

            setHoyolabData(result);
            setFileName(name || null);

            const validChars = Object.values(result.avatars)
                .filter((it) => mapAvatar?.[it.avatar_id.toString()])
                .map((char) => toCharacterInfoCard(result, char));
            setSelectedCharacters(validChars);
            setErrorMsg("");
        } catch {
            setHoyolabData(null);
            setSelectedCharacters([]);
            setErrorMsg(transI18n("fileMustBeAValidJsonFile"));
            toast.error(transI18n("fileMustBeAValidJsonFile"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setJsonInput(text);
            handleParseJsonString(text, file.name);
        };
        reader.onerror = () => {
            setErrorMsg(transI18n("fileMustBeAValidJsonFile"));
            toast.error(transI18n("fileMustBeAValidJsonFile"));
        };
        reader.readAsText(file);
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
        if (hoyolabData) {
            setSelectedCharacters(availableCharacters.map((char) => toCharacterInfoCard(hoyolabData, char)));
        }
    };

    const handleReset = () => {
        setHoyolabData(null);
        setSelectedCharacters([]);
        setJsonInput("");
        setFileName(null);
        setErrorMsg("");
    };

    const handleImport = () => {
        if (selectedCharacters.length === 0) {
            setErrorMsg(transI18n("pleaseSelectAtLeastOneCharacter"));
            return;
        }
        if (!hoyolabData) {
            setErrorMsg(transI18n("noDataToImport"));
            return;
        }

        setErrorMsg("");
        const listAvatars = { ...avatars };
        const filterData = Object.values(hoyolabData.avatars).filter((character) =>
            selectedCharacters.some((selected) => selected.avatar_id === character.avatar_id)
        );

        filterData.forEach((character) => {
            const currentAvatar = listAvatars[character.avatar_id.toString()];
            if (currentAvatar && Object.keys(currentAvatar).length !== 0) {
                const newProfileList = [...(currentAvatar.profileList || [])];
                const newProfile = converterOneHoyolabDataToAvatarStore(
                    hoyolabData,
                    newProfileList.length,
                    character.avatar_id
                );
                if (newProfile) {
                    newProfileList.push(newProfile);
                }
                const newAvatar = {
                    ...currentAvatar,
                    level: character.level,
                    promotion: character.promotion,
                    data: {
                        rank: character.data.rank ?? 0,
                        skills: character.data.skills,
                    },
                    profileList: newProfileList,
                    profileSelect: newProfile ? newProfileList.length - 1 : currentAvatar.profileSelect,
                };
                setAvatar(newAvatar);
            }
        });

        setIsOpenImport(false);
        toast.success(transI18n("importHoyolabDataSuccess"));
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            {transI18n("hoyolabBattleChronicle")}
                        </span>
                        <span className="text-xs text-base-content/50 font-medium">{transI18n("accountImporter")}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-base-content flex items-center gap-2">
                        {transI18n("hoyolabImport")}
                    </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowTutorial(!showTutorial)}
                        className="h-9 px-3 rounded-xl text-xs font-semibold bg-base-200/80 hover:bg-base-200 text-base-content border border-base-content/15 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{transI18n("tutorialAndGuide")}</span>
                        {showTutorial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-base-200/80 hover:bg-base-200 text-base-content border border-base-content/15 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <UploadCloud className="w-3.5 h-3.5 text-primary" />
                        <span>{transI18n("pickAFile")}</span>
                    </button>

                    {hoyolabData && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-9 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all flex items-center gap-1 cursor-pointer"
                            title={transI18n("reset")}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {showTutorial && (
                <div className="p-4 sm:p-5 rounded-2xl bg-base-200/60 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 text-xs sm:text-sm">
                            <h4 className="font-bold text-base-content">{transI18n("howToGetHoyolabData")}</h4>
                            <ol className="list-decimal list-inside space-y-1 text-base-content/75 text-xs">
                                <li>
                                    {transI18n.rich("hoyolabStep1", {
                                        site: () => (
                                            <a href="https://www.hoyolab.com" target="_blank" rel="noreferrer" className="text-amber-400 underline font-mono">
                                                hoyolab.com
                                            </a>
                                        ),
                                    })}
                                </li>
                                <li>{transI18n("hoyolabStep2")}</li>
                                <li>{transI18n("hoyolabStep3")}</li>
                                <li>
                                    {transI18n.rich("hoyolabStep4", {
                                        endpoint: () => (
                                            <code className="px-1.5 py-0.5 rounded bg-base-300 font-mono text-[11px] text-amber-300">
                                                game_record/hkrpg/api/avatar/info
                                            </code>
                                        ),
                                    })}
                                </li>
                                <li>{transI18n("hoyolabStep5")}</li>
                                <li>{transI18n("hoyolabStep6")}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* JSON Input Area (if not yet loaded, or collapsible) */}
            {!hoyolabData && (
                <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-[#0d0e15] overflow-hidden shadow-lg transition-all focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/25">
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#141622] border-b border-white/5 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setJsonInput("")}
                                        title={jsonInput ? "Clear content" : "Empty"}
                                        className="w-2.5 h-2.5 rounded-full bg-rose-500/70 hover:bg-rose-500 transition-colors cursor-pointer"
                                    />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                                </div>
                                <div className="h-3.5 w-px bg-white/10 mx-1" />
                                <div className="flex items-center gap-1.5 text-xs text-base-content/70 font-mono">
                                    <FileJson className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{fileName || "hoyolab.json"}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                {jsonStats && (
                                    <>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-base-content/60 border border-white/5">
                                            {jsonStats.lines.toLocaleString()} lines • {jsonStats.sizeStr}
                                        </span>
                                        {jsonStats.isLarge && (
                                            <span
                                                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                title={transI18n("fastModeActive")}
                                            >
                                                <Zap className="w-3 h-3 text-amber-400" />
                                                <span>{transI18n("fastMode")}</span>
                                            </span>
                                        )}
                                    </>
                                )}

                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/5 text-base-content/50 border border-white/5">
                                    JSON
                                </span>

                                <div className="h-3.5 w-px bg-white/10 hidden sm:block" />

                                {jsonInput && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsWordWrap(!isWordWrap)}
                                            className={`h-7 px-2 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                                                isWordWrap
                                                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                                    : "bg-white/5 hover:bg-white/10 text-base-content/70 border-white/10"
                                            }`}
                                            title={transI18n("toggleWordWrap")}
                                        >
                                            <WrapText className="w-3 h-3" />
                                            <span className="hidden md:inline">{transI18n("wrap")}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleFormatJson}
                                            className="h-7 px-2 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-base-content/70 hover:text-base-content border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                                            title={transI18n("formatJson")}
                                        >
                                            <Sparkles className="w-3 h-3 text-amber-400" />
                                            <span className="hidden md:inline">{transI18n("format")}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="h-7 px-2 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-base-content/70 hover:text-base-content border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                                            title={transI18n("copyContent")}
                                        >
                                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                            <span className="hidden md:inline">{isCopied ? transI18n("copied") : transI18n("copy")}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setJsonInput("")}
                                            className="h-7 px-2 rounded-lg text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                            title={transI18n("clear")}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            <span className="hidden md:inline">{transI18n("clear")}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="max-h-72 sm:max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <Editor
                                value={jsonInput}
                                onValueChange={(code) => setJsonInput(code)}
                                highlight={highlightJson}
                                padding={16}
                                placeholder="// Paste your HoYoLAB game_record/hkrpg/api/avatar/info JSON response here..."
                                textareaClassName={`outline-none font-mono selection:bg-amber-500/30 text-xs sm:text-sm ${
                                    isWordWrap ? "!whitespace-pre-wrap" : "!whitespace-pre"
                                }`}
                                preClassName={`font-mono text-xs sm:text-sm ${
                                    isWordWrap ? "!whitespace-pre-wrap" : "!whitespace-pre"
                                }`}
                                className="text-xs sm:text-sm font-mono min-h-52 text-slate-100 bg-[#0d0e15]"
                                style={{
                                    background: "#0d0e15",
                                    color: "#e2e8f0",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-base-content/40 font-medium">
                            {jsonInput.trim()
                                ? `${jsonStats?.lines.toLocaleString() || 0} lines ready. Click Parse JSON to import.`
                                : "Paste JSON from HoYoLAB Battle Chronicle network response"}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleParseJsonString(jsonInput)}
                            disabled={isLoading || !jsonInput.trim()}
                            className="h-10 px-6 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 transition-all cursor-pointer shrink-0"
                        >
                            <FileJson className="w-4 h-4" />
                            <span>{transI18n("parseJson")}</span>
                        </button>
                    </div>
                </div>
            )}

            {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {hoyolabData && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-base-200/60 border border-white/10 shadow-xs">
                    <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-xs sm:text-sm font-bold text-base-content">
                                {transI18n("selectedCharacters")}:
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-xs">
                                {selectedCharacters.length} / {availableCharacters.length}
                            </span>
                        </div>

                        {fileName && (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                                <FileCheck className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-36">{fileName}</span>
                            </div>
                        )}

                        <div className="h-4 w-px bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={selectAll}
                                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all flex items-center gap-1 cursor-pointer"
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
                        className="h-9 px-5 rounded-xl font-bold text-xs sm:text-sm bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto cursor-pointer"
                    >
                        <span className="text-white">{transI18n("import")}</span>
                        <span className="font-mono text-xs text-amber-100">({selectedCharacters.length})</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
            )}

            {!isLoading && hoyolabData && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {availableCharacters.map((character) => (
                        <CharacterInfoCard
                            key={character.avatar_id}
                            character={toCharacterInfoCard(hoyolabData, character)}
                            selectedCharacters={selectedCharacters}
                            onCharacterToggle={handleCharacterToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
