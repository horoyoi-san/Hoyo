"use client"
import { looksLikeHtml, normalizePsResponse } from "@/lib/api/response"
import { isPrivateUrl } from "@/lib/net/ipRules"
import useConnectStore from "@/stores/connectStore"
import useUserDataStore from "@/stores/userDataStore"
import { converterToFreeSRJson } from "./converterToFreeSRJson"
import { converterToCollapseConnection } from "./converterToCollapse"
import { buildConnectUrl } from "./connectEndpoint"
import { ensureBattleData } from "@/lib/ensureBattleData"
import useGlobalStore from "@/stores/globalStore"
import { ActionResult, ConnectErrorCode, ExtraData, FreeSRJson, ProxyPayload, PSConnectType, PSResponse } from "@/types"


// axios only loads when the user actually connects or syncs.
const withApi = <T,>(run: (m: typeof import("@/lib/api/api")) => Promise<T | string>): Promise<T | string> =>
    import("@/lib/api/api").then(run, (error: unknown) => (error as Error)?.message || "Failed to load the connection module")

const buildPushPayload = (): FreeSRJson => {
    const { avatars, battle_type, moc_config, pf_config, as_config, ce_config, peak_config } = useUserDataStore.getState()
    return converterToFreeSRJson(avatars, battle_type, moc_config, pf_config, as_config, ce_config, peak_config)
}

const sendData = (
    connectionType: PSConnectType | string,
    username: string,
    password: string,
    urlQuery: string,
    data?: FreeSRJson,
    extraData?: ExtraData
): Promise<PSResponse | string> => {
    if (connectionType === PSConnectType.March7thHoney) {
        return withApi(m => m.SendDataToMarch7thHoney(username, password, urlQuery, data))
    }
    if (connectionType === PSConnectType.Collapse) {
        if (!data) return withApi(m => m.ProbeCollapseConnection(username, password, urlQuery))

        const converted = converterToCollapseConnection(data, username, password)
        return withApi(m => m.SendDataToCollapse(username, password, urlQuery, converted.Avatars))
    }
    return withApi(m => m.SendDataToServer(username, password, urlQuery, data, extraData))
}

const sendThroughProxy = async (payload: ProxyPayload): Promise<PSResponse | string> => {
    const result = await import("@/lib/api/api")
        .then(m => m.SendDataThroughProxy({ data: { ...payload, method: "POST" } }))
        .catch((error: unknown) => error instanceof Error ? error : new Error("Failed to load the connection module"))
    if (result instanceof Error) return result.message
    return normalizePsResponse(result, 200)
}

const requestServer = (
    connectionType: PSConnectType | string,
    privateType: string,
    serverUrl: string,
    username: string,
    password: string,
    data?: FreeSRJson,
    extraData?: ExtraData
): Promise<PSResponse | string> => {
    if (connectionType === PSConnectType.Other && privateType === "Server") {
        return sendThroughProxy({ username, password, serverUrl, data })
    }

    return sendData(connectionType, username, password, buildConnectUrl(connectionType, serverUrl), data, extraData)
}

const MAX_LISTED_WARNINGS = 5

const joinWarnings = (warnings: string[]): string => {
    const listed = warnings.slice(0, MAX_LISTED_WARNINGS).join("; ")
    return warnings.length > MAX_LISTED_WARNINGS ? `${listed}; +${warnings.length - MAX_LISTED_WARNINGS} more` : listed
}

const handleServerResponse = (
    response: PSResponse | string,
    setIsConnectPS: (val: boolean) => void,
    onSuccess: (extraData?: ExtraData) => void
): ActionResult => {
    if (typeof response === "string") {
        setIsConnectPS(false)
        return { success: false, message: response }
    }
    if (response.status < 200 || response.status >= 300) {
        setIsConnectPS(false)
        const reasons = response.warnings?.length ? ` (${joinWarnings(response.warnings)})` : ""
        return { success: false, message: `${response.message || `HTTP ${response.status}`}${reasons}` }
    }
   
    if (looksLikeHtml(response.message)) {
        setIsConnectPS(false)
        return { success: false, message: response.message }
    }

    setIsConnectPS(true)
    onSuccess(response.extra_data)
    return {
        success: true,
        message: "",
        warning: response.warnings?.length ? joinWarnings(response.warnings) : undefined,
        stats: response.stats,
    }
}

const needsLocalMode = (connectionType: PSConnectType | string, privateType: string, serverUrl: string): boolean =>
    connectionType === PSConnectType.Other &&
    privateType === "Server" &&
    isPrivateUrl(serverUrl)

const privateHostResult = (): ActionResult => ({
    success: false,
    message: "This address is on your local network, switch to Local mode to connect directly.",
    code: ConnectErrorCode.PrivateHostUseLocal,
})


export const connectToPS = async (): Promise<ActionResult> => {
    const { connectionType, privateType, serverUrl, username, password } = useConnectStore.getState()
    const { setExtraData, setIsConnectPS } = useGlobalStore.getState()

    if (needsLocalMode(connectionType, privateType, serverUrl)) return privateHostResult()

    const response = await requestServer(connectionType, privateType, serverUrl, username, password)

    return handleServerResponse(response, setIsConnectPS, (extraData) => {
        if (!extraData) return
        setExtraData(extraData)
    })
}

export const syncDataToPS = async (): Promise<ActionResult> => {
    const { connectionType, privateType, serverUrl, username, password } = useConnectStore.getState()
    const { extraData, setIsConnectPS, setExtraData, isEnableChangePath, isEnableLua } = useGlobalStore.getState()

    if (needsLocalMode(connectionType, privateType, serverUrl)) return privateHostResult()

    try {
        await ensureBattleData(useUserDataStore.getState().battle_type)
    } catch {
        return { success: false, message: "Failed to load the battle data, so the battle config could not be checked. Try again." }
    }
    const data = buildPushPayload()

    const payloadExtra: PSResponse['extra_data'] = structuredClone(extraData)
    if (payloadExtra) {
        if (!isEnableChangePath) payloadExtra.multi_path = undefined
        if (!isEnableLua) payloadExtra.lua = null
    }

    const response = await requestServer(connectionType, privateType, serverUrl, username, password, data, payloadExtra)

    return handleServerResponse(response, setIsConnectPS, (responseExtraData) => {
        if (!responseExtraData) return
        const newData = structuredClone(responseExtraData)
        newData.lua = extraData?.lua || null
        setExtraData(newData)
    })
}
