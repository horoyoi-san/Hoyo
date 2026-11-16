"use client"

import { connectToPS, syncDataToPS } from "@/helper"
import { isPrivateUrl } from "@/lib/net/ipRules"
import useConnectStore from "@/stores/connectStore"
import useGlobalStore from "@/stores/globalStore"
import { ActionResult, ConnectErrorCode, PSConnectType } from "@/types"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { Server, RefreshCw, AlertCircle } from "lucide-react"

export default function ConnectBar() {
    const transI18n = useTranslations("DataPage")
    const [message, setMessage] = useState({ text: '', type: '' });
    const {
        connectionType,
        privateType,
        serverUrl,
        username,
        password,
        setConnectionType,
        setPrivateType,
        setServerUrl,
        setUsername,
        setPassword
    } = useConnectStore(
        useShallow((state) => ({
            connectionType: state.connectionType,
            privateType: state.privateType,
            serverUrl: state.serverUrl,
            username: state.username,
            password: state.password,
            setConnectionType: state.setConnectionType,
            setPrivateType: state.setPrivateType,
            setServerUrl: state.setServerUrl,
            setUsername: state.setUsername,
            setPassword: state.setPassword,
        }))
    )
    const { isConnectPS, setIsConnectPS } = useGlobalStore(
        useShallow((state) => ({
            isConnectPS: state.isConnectPS,
            setIsConnectPS: state.setIsConnectPS,
        }))
    )

    // Through the proxy a LAN address is a dead end, so warn before the click.
    const privateThroughProxy =
        connectionType === PSConnectType.Other &&
        privateType === "Server" &&
        isPrivateUrl(serverUrl)

    const describeResult = (result: ActionResult): string =>
        result.code === ConnectErrorCode.PrivateHostUseLocal
            ? transI18n("useLocalModeHint")
            : result.message

    const describeSuccess = (base: string, result: ActionResult): string => {
        const { stats, warning } = result
        const parts = [base]
        if (stats) parts.push(`${stats.avatars} avatar · ${stats.created} created · ${stats.updated} updated · ${stats.deleted} deleted`)
        if (warning) parts.push(warning)
        return parts.join(" — ")
    }

    return (
        <div className="space-y-4">
            <div className="p-4 sm:p-6 rounded-2xl bg-base-200/60 border border-white/10 space-y-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-base-content/70">
                        {transI18n("connectionType")}
                    </label>
                    <select
                        className="select select-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary text-sm font-medium"
                        value={connectionType}
                        onChange={(e) => { 
                            setIsConnectPS(false) 
                            setConnectionType(e.target.value)
                        }}
                    >
                        <option value={PSConnectType.FireflyGo}>FireflyGo</option>
                        <option value={PSConnectType.RobinSR}>RobinSR</option>
                        <option value={PSConnectType.March7thHoney}>March7thHoney</option>
                        <option value={PSConnectType.Collapse}>Collapse-RPG</option>
                        <option value={PSConnectType.Other}>{transI18n("other")}</option>
                    </select>
                </div>

                {(connectionType === PSConnectType.Other || connectionType === PSConnectType.March7thHoney || connectionType === PSConnectType.Collapse) && (
                    <div className={`grid grid-cols-1 ${connectionType === PSConnectType.Other ? "sm:grid-cols-2" : ""} gap-3 pt-2`}>
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-base-content/70">
                                {transI18n("serverUrl")}
                            </label>
                            <input
                                type="text"
                                placeholder={transI18n("placeholderServerUrl")}
                                className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary text-xs sm:text-sm"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                            />
                        </div>

                        {connectionType === PSConnectType.Other && (
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-base-content/70">
                                    {transI18n("privateType")}
                                </label>
                                <select
                                    className="select select-sm sm:select-md select-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary text-xs sm:text-sm"
                                    value={privateType}
                                    onChange={(e) => setPrivateType(e.target.value)}
                                >
                                    <option value="Local">{transI18n("local")}</option>
                                    <option value="Server">{transI18n("server")}</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-base-content/70">
                                {transI18n("username")}
                            </label>
                            <input
                                type="text"
                                placeholder={transI18n("placeholderUsername")}
                                className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary text-xs sm:text-sm"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-base-content/70">
                                {transI18n("password")}
                            </label>
                            <input
                                type="password"
                                placeholder={transI18n("placeholderPassword")}
                                className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary text-xs sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {privateThroughProxy && (
                    <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-400 text-xs flex flex-col sm:flex-row sm:items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{transI18n("useLocalModeHint")}</span>
                        <button
                            onClick={() => {
                                setPrivateType("Local")
                                setMessage({ text: "", type: "" })
                            }}
                            className="btn btn-xs rounded-xl font-bold"
                        >
                            {transI18n("switchToLocal")}
                        </button>
                    </div>
                )}

                {message.text && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        message.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : message.type === 'error'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-info/10 border-info/30 text-info'
                    }`}>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-base-content/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-base-content/60">{transI18n("status")}:</span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                            isConnectPS
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${isConnectPS ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                            <span>{isConnectPS ? transI18n("connected") : transI18n("unconnected")}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={async () => {
                                const response = await connectToPS();
                                if (response.success) {
                                    setMessage({
                                        type: "success",
                                        text: describeSuccess(transI18n("connectedSuccess"), response),
                                    });
                                } else {
                                    setMessage({
                                        type: "error",
                                        text: describeResult(response),
                                    });
                                }
                            }}
                            className="btn btn-sm btn-primary rounded-xl font-bold flex-1 sm:flex-none shadow-xs"
                        >
                            <Server className="w-3.5 h-3.5" />
                            {transI18n("connectPs")}
                        </button>

                        {isConnectPS && (
                            <button
                                onClick={async () => {
                                    const response = await syncDataToPS();
                                    if (response.success) {
                                        setMessage({
                                            type: "success",
                                            text: describeSuccess(transI18n("syncSuccess"), response),
                                        });
                                    } else {
                                        setMessage({
                                            type: "error",
                                            text: `${transI18n("syncFailed")}: ${describeResult(response)}`,
                                        });
                                    }
                                }}
                                className="btn btn-sm btn-accent rounded-xl font-bold flex-1 sm:flex-none shadow-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {transI18n("sync")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
