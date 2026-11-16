import dns from "node:dns/promises"
import http from "node:http"
import https from "node:https"
import { isBlockedAddress, isIPv4, isIPv6 } from "./ipRules"


export { isBlockedAddress, ipv4ToNumber, isBlockedIPv4, isBlockedIPv6 } from "./ipRules"

export class BlockedTargetError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "BlockedTargetError"
    }
}

export async function assertPublicUrl(
    rawUrl: string,
    allowedProtocols: readonly string[] = ["http:", "https:"]
): Promise<URL> {
    let url: URL
    try {
        url = new URL(rawUrl)
    } catch {
        throw new Error(`Invalid target URL: ${rawUrl}`)
    }

    if (!allowedProtocols.includes(url.protocol)) {
        throw new BlockedTargetError(`Protocol ${url.protocol} is not allowed`)
    }

    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (!host) throw new Error("Missing target host")

    if (isIPv4(host) || isIPv6(host)) {
        if (isBlockedAddress(host)) {
            throw new BlockedTargetError(`Connection to private/internal address (${host}) is not allowed`)
        }
        return url
    }

    let addresses: Array<{ address: string; family: number }>
    try {
        addresses = await dns.lookup(host, { all: true, verbatim: true })
    } catch {
        throw new Error(`Could not resolve host: ${host}`)
    }

    if (addresses.length === 0) throw new Error(`Could not resolve host: ${host}`)

    const blocked = addresses.find((entry) => isBlockedAddress(entry.address))
    if (blocked) {
        throw new BlockedTargetError(
            `Connection to private/internal address (${host} -> ${blocked.address}) is not allowed`
        )
    }

    return url
}

type LookupOptions = { family?: number; all?: boolean }
type LookupCallback = (
    error: NodeJS.ErrnoException | null,
    address?: string | Array<{ address: string; family: number }>,
    family?: number
) => void

export const guardedLookup = (hostname: string, options: LookupOptions, callback: LookupCallback): void => {
    dns.lookup(hostname, { all: true, verbatim: true }).then(
        (addresses) => {
            const blocked = addresses.find((entry) => isBlockedAddress(entry.address))
            if (blocked) {
                callback(new BlockedTargetError(`Blocked target address: ${blocked.address}`))
                return
            }

            if (options?.all) {
                callback(null, addresses)
                return
            }

            const chosen = addresses.find((entry) => !options?.family || entry.family === options.family) ?? addresses[0]
            callback(null, chosen.address, chosen.family)
        },
        (error: NodeJS.ErrnoException) => callback(error)
    )
}

const withGuardedLookup = <T extends http.Agent | https.Agent>(agent: T): T => {
    ;(agent as unknown as { options: Record<string, unknown> }).options.lookup = guardedLookup
    return agent
}

export const guardedHttpAgent = withGuardedLookup(new http.Agent({ keepAlive: true }))
export const guardedHttpsAgent = withGuardedLookup(new https.Agent({ keepAlive: true }))
