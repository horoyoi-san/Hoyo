/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import MountOnOpen from "../mountOnOpen";
import { downloadJson } from "@/helper";
import { converterToFreeSRJson } from "@/helper/converterToFreeSRJson";
import { ensureBattleData } from "@/lib/ensureBattleData";
import { useChangeTheme } from "@/hooks/useChangeTheme";
import { listCurrentLanguage, listCurrentLanguageApi } from "@/constant/constant";
import useLocaleStore from "@/stores/localeStore";
import useUserDataStore from "@/stores/userDataStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import useModelStore from "@/stores/modelStore";
import { toast } from "react-toastify";
import { micsSchema } from "@/zod";
import useGlobalStore from "@/stores/globalStore";
import { ActionResult, ConnectErrorCode, ModalConfig } from "@/types";
import { Menu, RefreshCw, ScrollText } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { createPortal } from "react-dom";

import ModalLoading from "../modalLoading";
import { NeedChangelog, NeedLightcone, NeedLightconeAndRelic, NeedRelic } from "../requireData";
import { connectToPS, syncDataToPS } from "@/helper";

const MonsterBar = dynamic(() => import("../monsterBar"), {
    ssr: false,
    loading: () => <ModalLoading message="Loading Monster Data..." />
});
const ExtraSettingBar = dynamic(() => import("../extraSettingBar"), {
    ssr: false,
    loading: () => <ModalLoading type="form" message="Loading Settings..." />
});
import ChangelogBar from "../changelog";
const ConnectBar = dynamic(() => import("../connectBar"), {
    ssr: false,
    loading: () => <ModalLoading type="form" message="Loading Connection..." />
});
const EnkaImport = dynamic(() => import("../importBar/enka"), {
    ssr: false,
    loading: () => <ModalLoading message="Loading Enka Importer..." />
});
const FreeSRImport = dynamic(() => import("../importBar/freesr"), {
    ssr: false,
    loading: () => <ModalLoading message="Loading FreeSR Importer..." />
});
const HoyolabImport = dynamic(() => import("../importBar/hoyolab"), {
    ssr: false,
    loading: () => <ModalLoading message="Loading HoYoLAB Importer..." />
});
const FribbelsImport = dynamic(() => import("../importBar/fribbels"), {
    ssr: false,
    loading: () => <ModalLoading message="Loading Fribbels Importer..." />
});
/** Placeholder while the config.json chunk loads; portalled out of the sticky header. */
function ConfigJsonLoading() {
    const theme = useLocaleStore((state) => state.theme)
    if (typeof document === "undefined") return null

    return createPortal(
        <div
            data-theme={theme}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-3 sm:p-4"
        >
            <div className="w-11/12 max-w-4xl rounded-2xl border border-base-content/10 bg-base-100 shadow-2xl">
                <ModalLoading type="form" message="Loading config.json..." />
            </div>
        </div>,
        document.body
    )
}

const ConfigJsonExport = dynamic(() => import("../configJsonExport"), {
    ssr: false,
    // Fixed and portalled: an in-flow placeholder would stretch the sticky header, and a fixed child would stay trapped in its stacking context.
    loading: () => <ConfigJsonLoading />
});

const themes = [
    { label: "Winter" },
    { label: "Night" },
    { label: "Cupcake" },
    { label: "Coffee" },
];

function setCookieLocale(localeVal: string) {
    if (typeof document !== "undefined") {
        document.cookie = `MYNEXTAPP_LOCALE=${localeVal}; path=/; max-age=31536000;`;
    }
}

export default function Header() {
    const { changeTheme } = useChangeTheme()
    const { locale, setLocale } = useLocaleStore(
        useShallow((state) => ({
            locale: state.locale,
            setLocale: state.setLocale,
        }))
    )

    const router = useRouter()
    const transI18n = useTranslations("DataPage")
    const {
        setIsOpenImport,
        isOpenImport,
        setIsOpenMonster,
        isOpenMonster,
        setIsOpenConnect,
        isOpenConnect,
        setIsOpenExtra,
        isOpenExtra,
        setIsChangelog,
        isChangelog,
        setIsOpenConfigJson,
        isOpenConfigJson
    } = useModelStore(
        useShallow((state) => ({
            setIsOpenImport: state.setIsOpenImport,
            isOpenImport: state.isOpenImport,
            setIsOpenMonster: state.setIsOpenMonster,
            isOpenMonster: state.isOpenMonster,
            setIsOpenConnect: state.setIsOpenConnect,
            isOpenConnect: state.isOpenConnect,
            setIsOpenExtra: state.setIsOpenExtra,
            isOpenExtra: state.isOpenExtra,
            setIsChangelog: state.setIsChangelog,
            isChangelog: state.isChangelog,
            setIsOpenConfigJson: state.setIsOpenConfigJson,
            isOpenConfigJson: state.isOpenConfigJson,
        }))
    )

    const [importModal, setImportModal] = useState("enka");

    const { isConnectPS, hasExtraData } = useGlobalStore(
        useShallow((state) => ({
            isConnectPS: state.isConnectPS,
            hasExtraData: !!state.extraData,
        }))
    )

    const handleConnectOrSyncPS = async () => {
        const describe = (res: ActionResult): string =>
            res.code === ConnectErrorCode.PrivateHostUseLocal ? transI18n("useLocalModeHint") : res.message

        if (isConnectPS) {
            const res = await syncDataToPS()
            if (res.success) {
                toast.success(transI18n("syncSuccess"))
            } else {
                toast.error(`${transI18n("syncFailed")}: ${describe(res)}`)
            }
        } else {
            const res = await connectToPS()
            if (res.success) {
                toast.success(transI18n("connectedSuccess"))
            } else {
                toast.error(`${transI18n("connectedFailed")}: ${describe(res)}`)
            }
        }
    }

    useEffect(() => {

        const cookieLocale = document.cookie.split("; ")
            .find((row) => row.startsWith("MYNEXTAPP_LOCALE"))
            ?.split("=")[1];

        if (cookieLocale) {
            if (!listCurrentLanguageApi.hasOwnProperty(cookieLocale)) {
                setLocale("en")
                document.cookie = "MYNEXTAPP_LOCALE=en;"
                router.refresh()
            } else {
                setLocale(cookieLocale)
            }

        } else {
            let browserLocale = navigator.language.slice(0, 2);

            if (!listCurrentLanguageApi.hasOwnProperty(browserLocale)) {
                browserLocale = "en"
            }
            setLocale(browserLocale);
            document.cookie = `MYNEXTAPP_LOCALE=${browserLocale};`
            router.refresh()
        }
    }, [router, setLocale])

    const changeLocale = (newLocale: string) => {
        setLocale(newLocale)
        setCookieLocale(newLocale)
        router.refresh()
    }

    const handleShow = (modalId: string) => {
        const modal = document.getElementById(modalId) as HTMLDialogElement | null;
        if (modal) {
            modal.classList.add("modal-open");
            modal.setAttribute("open", "true");
        }
    };

    const handleCloseModal = (modalId: string) => {
        const modal = document.getElementById(modalId) as HTMLDialogElement | null;
        if (modal) {
            modal.classList.remove("modal-open");
            modal.removeAttribute("open");
            if (typeof modal.close === "function" && modal.open) {
                try { modal.close(); } catch {}
            }
        }
    };

    const modalConfigs: ModalConfig[] = [
        {
            id: "connect_modal",
            title: transI18n("psConnection"),
            isOpen: isOpenConnect,
            onClose: () => {
                setIsOpenConnect(false)
                handleCloseModal("connect_modal")
            },
            content: <ConnectBar />
        },
        {
            id: "import_modal",
            title: transI18n("importSetting"),
            isOpen: isOpenImport,
            onClose: () => {
                setIsOpenImport(false)
                handleCloseModal("import_modal")
            },
            content: (
                <>
                    {importModal === "enka" && <NeedLightcone><EnkaImport /></NeedLightcone>}
                    {importModal === "freesr" && <NeedLightconeAndRelic><FreeSRImport /></NeedLightconeAndRelic>}
                    {importModal === "hoyolab" && <NeedRelic><HoyolabImport /></NeedRelic>}
                    {importModal === "fribbels" && <NeedLightconeAndRelic><FribbelsImport /></NeedLightconeAndRelic>}
                </>
            )
        },
        {
            id: "monster_modal",
            title: transI18n("monsterSetting"),
            isOpen: isOpenMonster,
            onClose: () => {
                setIsOpenMonster(false)
                handleCloseModal("monster_modal")
            },
            content: <MonsterBar />
        },
        {
            id: "extra_modal",
            title: transI18n("extraSetting"),
            isOpen: isOpenExtra,
            onClose: () => {
                setIsOpenExtra(false)
                handleCloseModal("extra_modal")
            },
            content: <ExtraSettingBar />
        },
        {
            id: "changelog_modal",
            title: "Changelog",
            isOpen: isChangelog,
            onClose: () => {
                setIsChangelog(false)
                handleCloseModal("changelog_modal")
            },
            content: <NeedChangelog><ChangelogBar /></NeedChangelog>
        }
    ]

    useEffect(() => {
        for (const item of modalConfigs) {
            if (!item?.isOpen) {
                handleCloseModal(item?.id || "")
            } else {
                handleShow(item?.id || "")
            }
        }
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                for (const item of modalConfigs) {
                    item.onClose()
                }
            }
        };

        window.addEventListener('keydown', handleEscKey);
        return () => window.removeEventListener('keydown', handleEscKey);
    }, [isOpenImport, isOpenMonster, isOpenConnect, isOpenExtra, isChangelog]);

    useEffect(() => {
        const closeMenus = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null
            document.querySelectorAll<HTMLDetailsElement>(".navbar-center details[open]").forEach((menu) => {
                if (!menu.contains(target) || target?.closest("details ul a, details ul button")) menu.removeAttribute("open")
            })
        }
        document.addEventListener("click", closeMenus)
        return () => document.removeEventListener("click", closeMenus)
    }, [])

    const handleImportDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {

        const file = event.target.files?.[0];
        if (!file) {
            toast.error(transI18n("pleaseSelectAFile"))
            return
        }
        if (!file.name.endsWith(".json") || file.type !== "application/json") {
            toast.error(transI18n("fileMustBeAValidJsonFile"))
            return
        }

        if (file) {

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    const parsed = micsSchema.parse(data)
                    // One write for the whole import.
                    useUserDataStore.setState(parsed)
                    toast.success(transI18n("importDatabaseSuccess"))
                } catch {
                    toast.error(transI18n("fileMustBeAValidJsonFile"))
                }
            };
            reader.readAsText(file);
        }

    };

    const handleExportFreeSR = async () => {
        try {
            await ensureBattleData(useUserDataStore.getState().battle_type)
        } catch {
            toast.error(transI18n("failedToLoadData", { type: "battle" }))
            return
        }
        const { avatars, battle_type, moc_config, pf_config, as_config, ce_config, peak_config } = useUserDataStore.getState()
        downloadJson("freesr-data", converterToFreeSRJson(avatars, battle_type, moc_config, pf_config, as_config, ce_config, peak_config))
    }
    const handleExportDatabase = () => {
        const { avatars, battle_type, moc_config, pf_config, as_config, ce_config, peak_config } = useUserDataStore.getState()
        downloadJson("database-data", { avatars, battle_type, moc_config, pf_config, as_config, ce_config, peak_config })
    }

    return (
        <div className="contents">
            <div className="contents">
                <div className="contents">
                    <div className="dropdown dropdown-top fixed bottom-3 left-20 sm:left-28 z-[70]">
                        <div tabIndex={0} role="button" aria-label={transI18n("actions")} className="btn btn-circle btn-ghost btn-sm lg:hidden rounded-full border border-base-content/15 bg-base-100/35 shadow-lg backdrop-blur-md hover:bg-base-100/55 transition-all duration-200">
                            <Menu className="h-5 w-5" />
                        </div>
                        <ul
                            tabIndex={0}
                            className="menu menu-sm dropdown-content bg-base-100/70 backdrop-blur-xl rounded-2xl z-50 mt-3 w-56 p-2 shadow-xl border border-base-content/10"
                        >
                            <li>
                                <details>
                                    <summary className="px-3 py-2 hover:bg-base-100/25 rounded-lg transition-all duration-200 font-medium w-full">{transI18n("loadData")}</summary>
                                    <ul className="p-2 space-y-1">
                                        <li><button type="button" className="rounded-md" onClick={() => {
                                            setImportModal("freesr")
                                            setIsOpenImport(true)
                                        }}>{transI18n("freeSr")}</button></li>
                                        <li>
                                            <>
                                                <input
                                                    type="file"
                                                    accept="application/json"
                                                    id="database-data-upload"
                                                    className="hidden"
                                                    onChange={handleImportDatabase}
                                                />
                                                <button
                                                    className="rounded-md w-full text-left"
                                                    onClick={() => document.getElementById('database-data-upload')?.click()}
                                                >
                                                    {transI18n("database")}
                                                </button>
                                            </>
                                        </li>
                                        <li><button type="button" className="rounded-md" onClick={() => {
                                            setImportModal("enka")
                                            setIsOpenImport(true)
                                        }}>{transI18n("enka")}</button></li>
                                        <li><button type="button" className="rounded-md" onClick={() => {
                                            setImportModal("hoyolab")
                                            setIsOpenImport(true)
                                        }}>{transI18n("hoyolab")}</button></li>
                                        <li><button type="button" className="rounded-md" onClick={() => {
                                            setImportModal("fribbels")
                                            setIsOpenImport(true)
                                        }}>{transI18n("fribbels")}</button></li>
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details>
                                    <summary className="px-3 py-2 hover:bg-base-100/25 rounded-lg transition-all duration-200 font-medium">{transI18n("exportData")}</summary>
                                    <ul className="p-2 space-y-1">
                                        <li><button type="button" className="rounded-md" onClick={handleExportFreeSR}>{transI18n("freeSr")}</button></li>
                                        <li><button type="button" className="rounded-md" onClick={handleExportDatabase}>{transI18n("database")}</button></li>
                                        <li><button type="button" className="rounded-md" onClick={() => setIsOpenConfigJson(true)}>{transI18n("configJson")}</button></li>
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    onClick={handleConnectOrSyncPS}
                                    className="rounded-lg"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isConnectPS ? "text-accent" : ""}`} />
                                    {isConnectPS ? transI18n("sync") : transI18n("connectPs")}
                                </button>
                            </li>
                            <li>
                                <button
                                    className="px-3 py-2 hover:bg-base-100/25 rounded-lg transition-all duration-200 font-medium"
                                    onClick={() => {
                                        setIsOpenConnect(true)
                                    }}
                                >
                                    {transI18n("connectSetting")}
                                </button>
                            </li>
                            {hasExtraData && (
                                <li>
                                    <button
                                        onClick={() => {
                                            setIsOpenExtra(true)
                                        }}
                                        className="px-3 py-2 hover:bg-base-100/25 rounded-lg transition-all duration-200 font-medium"
                                    >
                                        {transI18n("extraSetting")}
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>

                </div>

                <div className="navbar-center fixed bottom-3 left-28 z-[70] hidden lg:flex rounded-xl border border-base-content/10 bg-base-100/15 px-2 py-1 shadow-sm backdrop-blur-md">
                    <ul className="menu menu-horizontal gap-1.5 p-0 text-sm font-medium">
                        <li>
                            <details className="dropdown dropdown-top">
                                <summary className="px-3 py-1.5 hover:bg-base-100/25 rounded-lg transition-all duration-200">{transI18n("loadData")}</summary>
                                <ul className="dropdown-content p-2 bg-base-100/70 backdrop-blur-xl rounded-xl shadow-xl border border-base-content/10 space-y-1 w-44 z-50">
                                    <li><button type="button" className="rounded-md" onClick={() => {
                                        setImportModal("freesr")
                                        setIsOpenImport(true)
                                    }}>{transI18n("freeSr")}</button></li>
                                    <li>
                                        <>
                                            <input
                                                type="file"
                                                accept="application/json"
                                                id="database-data-upload"
                                                className="hidden"
                                                onChange={handleImportDatabase}
                                            />
                                            <button
                                                className="rounded-md w-full text-left"
                                                onClick={() => document.getElementById('database-data-upload')?.click()}
                                            >
                                                {transI18n("database")}
                                            </button>
                                        </>
                                    </li>
                                    <li><button type="button" className="rounded-md" onClick={() => {
                                        setImportModal("enka")
                                        setIsOpenImport(true)
                                    }}>{transI18n("enka")}</button></li>
                                    <li><button type="button" className="rounded-md" onClick={() => {
                                        setImportModal("hoyolab")
                                        setIsOpenImport(true)
                                    }}>{transI18n("hoyolab")}</button></li>
                                    <li><button type="button" className="rounded-md" onClick={() => {
                                        setImportModal("fribbels")
                                        setIsOpenImport(true)
                                    }}>{transI18n("fribbels")}</button></li>
                                </ul>
                            </details>
                        </li>
                        <li>
                            <details className="dropdown dropdown-top">
                                <summary className="px-3 py-1.5 hover:bg-base-100/25 rounded-lg transition-all duration-200">{transI18n("exportData")}</summary>
                                <ul className="dropdown-content p-2 bg-base-100/70 backdrop-blur-xl rounded-xl shadow-xl border border-base-content/10 space-y-1 w-44 z-50">
                                    <li><button type="button" className="rounded-md" onClick={handleExportFreeSR}>{transI18n("freeSr")}</button></li>
                                    <li><button type="button" className="rounded-md" onClick={handleExportDatabase}>{transI18n("database")}</button></li>
                                    <li><button type="button" className="rounded-md" onClick={() => setIsOpenConfigJson(true)}>{transI18n("configJson")}</button></li>
                                </ul>
                            </details>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={handleConnectOrSyncPS}
                                className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
                                    isConnectPS ? "text-accent hover:bg-accent/10" : "hover:bg-base-100/25"
                                }`}
                            >
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                {isConnectPS ? transI18n("sync") : transI18n("connectPs")}
                            </button>
                        </li>
                        <li>
                            <button
                                className="px-3 py-1.5 hover:bg-base-100/25 rounded-lg transition-all duration-200"
                                onClick={() => {
                                    setIsOpenConnect(true)
                                }}
                            >
                                {transI18n("connectSetting")}
                            </button>
                        </li>
                        {hasExtraData && (
                            <li>
                                <button
                                    onClick={() => {
                                        setIsOpenExtra(true)
                                    }}
                                    className="px-3 py-1.5 hover:bg-base-100/25 rounded-lg transition-all duration-200"
                                >
                                    {transI18n("extraSetting")}
                                </button>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="hidden">
                    <div data-tip={isConnectPS ? "Connected to PS" : "Not Connected"} className="tooltip tooltip-bottom">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-base-200/60 border border-white/5 shadow-xs">
                            <span className="relative flex h-2 w-2">
                                {isConnectPS && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnectPS ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></span>
                            </span>
                            <span className={`hidden xl:block text-xs font-semibold tracking-tight ${isConnectPS ? 'text-emerald-500' : 'text-base-content/50'}`}>
                                {isConnectPS ? transI18n("connected") : transI18n("unconnected")}
                            </span>
                        </div>
                    </div>

                    <button
                        data-tip={transI18n("changelog")}
                        title={transI18n("changelog")}
                        className="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom text-warning/90 hover:bg-warning/10 transition-colors"
                        onClick={() => {
                            setIsChangelog(true)
                        }}
                    >
                        <ScrollText className="w-4 h-4" />
                    </button>

                    <div className="dropdown dropdown-end tooltip tooltip-bottom" data-tip={transI18n("language")}>
                        <div
                            tabIndex={0}
                            role="button"
                            className="flex items-center gap-1.5 border border-base-content/10 bg-base-200/40 rounded-lg text-xs px-2.5 py-1 hover:bg-base-200/80 transition-all duration-200 font-semibold uppercase tracking-wider"
                        >
                            <span className="font-bold">{listCurrentLanguage[locale as keyof typeof listCurrentLanguage]?.flag || "EN"}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 opacity-60">
                                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                        </div>

                        <ul
                            tabIndex={0}
                            className="dropdown-content z-50 menu p-1.5 shadow-2xl bg-base-100 rounded-xl w-48 mt-2 border border-base-content/15 space-y-0.5"
                        >
                            {Object.entries(listCurrentLanguage).map(([key, value]) => (
                                <li key={key}>
                                    <button
                                        className={`flex justify-between rounded-lg py-1.5 text-xs font-medium ${locale === key ? "active bg-primary/20 text-primary font-bold" : "hover:bg-base-200/70"}`}
                                        onClick={() => {
                                            changeLocale(key);
                                            const elem = document.activeElement;
                                            if (elem instanceof HTMLElement) {
                                                elem.blur();
                                            }
                                        }}
                                    >
                                        <span className="font-bold">{value.flag}</span>
                                        <span>{value.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="dropdown dropdown-end tooltip tooltip-bottom" data-tip={transI18n("theme")}>
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm rounded-lg hover:bg-base-200/70 transition-all duration-200 px-2" title={transI18n("theme")}>
                            <svg
                                width={16}
                                height={16}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="h-4 w-4 stroke-current"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                                />
                            </svg>
                        </div>

                        <div
                            tabIndex={0}
                            className="dropdown-content bg-base-100 text-base-content rounded-xl overflow-hidden border border-base-content/15 shadow-2xl mt-2 z-50"
                        >
                            <ul className="menu w-36 p-1.5 space-y-0.5">
                                {themes.map((theme) => (
                                    <li
                                        key={theme.label}
                                        onClick={() => {
                                            if (changeTheme) changeTheme(theme.label.toLowerCase());
                                        }}
                                    >
                                        <button
                                            className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-base-200/70 rounded-lg text-xs font-medium transition-all duration-200"
                                            data-set-theme={theme.label.toLowerCase()}
                                        >
                                            <div
                                                data-theme={theme.label.toLowerCase()}
                                                className="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded p-1 shadow-xs border border-white/10"
                                            >
                                                <div className="bg-base-content size-1 rounded-full" />
                                                <div className="bg-primary size-1 rounded-full" />
                                                <div className="bg-secondary size-1 rounded-full" />
                                                <div className="bg-accent size-1 rounded-full" />
                                            </div>
                                            <span>{theme.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {modalConfigs?.map(({ id, title, isOpen, onClose, content }) => (
                <dialog key={id} id={id} className={`modal ${isOpen ? "modal-open" : ""}`}>
                    <div className={`modal-box ${
                        id === 'monster_modal'
                            ? 'w-[98vw] max-w-[98vw] xl:w-[94vw] xl:max-w-[94vw] 2xl:w-[92vw] 2xl:max-w-[1750px] h-[90vh]'
                            : id === 'import_modal' || id === 'extra_modal'
                            ? 'w-11/12 max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] 2xl:max-w-350 h-[88vh]'
                            : id === 'connect_modal'
                            ? 'w-11/12 max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[88vh]'
                            : id === 'changelog_modal'
                            ? 'w-11/12 max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-[85vh]'
                            : 'w-11/12 max-w-[92vw] sm:max-w-[88vw] max-h-[90vh]'
                    } max-h-[90vh] my-auto flex flex-col bg-base-100 text-base-content border border-base-content/10 shadow-2xl rounded-2xl p-0 overflow-hidden`}>
                        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-base-content/10 bg-base-100 shrink-0">
                            <h3 className="font-bold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary via-accent to-secondary">
                                {title}
                            </h3>
                            <button
                                className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                                onClick={onClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                            <MountOnOpen open={isOpen}>{content}</MountOnOpen>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={onClose}>close</button>
                    </form>
                </dialog>
            ))}

            {isOpenConfigJson && (
                <ConfigJsonExport open={isOpenConfigJson} onClose={() => setIsOpenConfigJson(false)} />
            )}
        </div>
    )
}
