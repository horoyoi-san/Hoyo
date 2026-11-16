import { PSConnectType } from "@/types"

const FIREFLYGO_SYNC_URL = "http://localhost:21000/sync"
const ROBINSR_SYNC_URL = "http://localhost:21000/srtools"

const PATH_SUFFIX: Record<string, string> = {
    [PSConnectType.March7thHoney]: "/sr-tools",
    [PSConnectType.Collapse]: "/query_connection",
}

export const withScheme = (serverUrl: string): string => {
    if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
        return `http://${serverUrl}`
    }
    return serverUrl
}

const normalizeBase = (serverUrl: string): string => withScheme(serverUrl.trim()).replace(/\/+$/, "")

const hasPathSuffix = (url: string, suffix: string): boolean => {
    try {
        return new URL(url).pathname.replace(/\/+$/, "").toLowerCase().endsWith(suffix)
    } catch {
        return url.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase().endsWith(suffix)
    }
}

export const buildConnectUrl = (connectionType: string, serverUrl: string): string => {
    if (connectionType === PSConnectType.FireflyGo) return FIREFLYGO_SYNC_URL
    if (connectionType === PSConnectType.RobinSR) return ROBINSR_SYNC_URL

    const suffix = PATH_SUFFIX[connectionType]
    if (suffix) {
        const base = normalizeBase(serverUrl)
        return hasPathSuffix(base, suffix) ? base : `${base}${suffix}`
    }

    return withScheme(serverUrl)
}
