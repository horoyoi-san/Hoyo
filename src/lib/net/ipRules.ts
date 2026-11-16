const BLOCKED_IPV4: ReadonlyArray<readonly [number, number]> = [
    [0x00000000, 8], // 0.0.0.0/8 "this network"
    [0x0a000000, 8], // 10.0.0.0/8 private
    [0x64400000, 10], // 100.64.0.0/10 CGNAT
    [0x7f000000, 8], // 127.0.0.0/8 loopback
    [0xa9fe0000, 16], // 169.254.0.0/16 link-local, cloud metadata
    [0xac100000, 12], // 172.16.0.0/12 private
    [0xc0000000, 24], // 192.0.0.0/24
    [0xc0000200, 24], // 192.0.2.0/24 documentation
    [0xc0a80000, 16], // 192.168.0.0/16 private
    [0xc6120000, 15], // 198.18.0.0/15 benchmark
    [0xc6336400, 24], // 198.51.100.0/24 documentation
    [0xcb007100, 24], // 203.0.113.0/24 documentation
    [0xe0000000, 4], // 224.0.0.0/4 multicast
    [0xf0000000, 4], // 240.0.0.0/4 reserved
]

export function isIPv4(value: string): boolean {
    const parts = value.split(".")
    return (
        parts.length === 4 &&
        parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
    )
}

export function isIPv6(value: string): boolean {
    if (!value.includes(":")) return false
    if (!/^[0-9a-fA-F:.]+$/.test(value)) return false
    return value.split(":").length <= 9
}

export function ipv4ToNumber(ip: string): number | null {
    const parts = ip.split(".")
    if (parts.length !== 4) return null

    let value = 0
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return null
        const octet = Number(part)
        if (octet > 255) return null
        value = value * 256 + octet
    }
    return value >>> 0
}

export function isBlockedIPv4(ip: string): boolean {
    const value = ipv4ToNumber(ip)
    // Anything that does not parse is treated as unsafe.
    if (value === null) return true

    return BLOCKED_IPV4.some(([network, bits]) => {
        const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
        return ((value & mask) >>> 0) === ((network & mask) >>> 0)
    })
}

const firstHextet = (ip: string): number => {
    const clean = ip.split("%")[0].toLowerCase()
    if (clean.startsWith("::")) return 0
    return Number.parseInt(clean.split(":")[0], 16)
}

export function isBlockedIPv6(ip: string): boolean {
    const clean = ip.split("%")[0].toLowerCase()

    if (clean === "::" || clean === "::1") return true

    const mapped = clean.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (mapped) return isBlockedIPv4(mapped[1])

    const first = firstHextet(clean)
    if (Number.isNaN(first)) return true

    if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast

    return false
}

export function isBlockedAddress(address: string): boolean {
    const ip = address.replace(/^\[|\]$/g, "")
    if (isIPv4(ip)) return isBlockedIPv4(ip)
    if (isIPv6(ip)) return isBlockedIPv6(ip)
    return true
}

export function hostnameOf(rawUrl: string): string {
    const trimmed = rawUrl.trim()
    if (!trimmed) return ""
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`

    try {
        return new URL(candidate).hostname.replace(/^\[|\]$/g, "")
    } catch {
        return ""
    }
}

export function isPrivateHostname(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "")
    if (!host) return false

    if (
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith(".local") ||
        host.endsWith(".internal")
    ) {
        return true
    }

    if (isIPv4(host) || isIPv6(host)) return isBlockedAddress(host)

    return false
}

export function isPrivateUrl(rawUrl: string): boolean {
    return isPrivateHostname(hostnameOf(rawUrl))
}
