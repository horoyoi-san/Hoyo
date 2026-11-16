import { NextResponse } from 'next/server'
import axios from 'axios'
import { guardedHttpAgent, guardedHttpsAgent } from '@/lib/net/guard'
import type { EnkaErrorCode } from '@/types'

const ENKA_ORIGIN = 'https://enka.network'
const UID_PATTERN = /^\d{8,10}$/
const UPSTREAM_TIMEOUT_MS = 15000
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const MAX_CLIENT_CACHE_SECONDS = 300
// enka.network sits behind Cloudflare: requests without an identifying User-Agent
// are answered with a "Just a moment..." challenge page instead of JSON.
const USER_AGENT = 'kafka-srtools/1.0 (+https://github.com/firefly-tools)'

type EnkaUpstreamBody = {
  detailInfo?: unknown
  ttl?: unknown
  error?: unknown
  retryAfter?: unknown
}

function failure(status: number, code: EnkaErrorCode, message: string) {
  return NextResponse.json(
    { ok: false, code, message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params
  const cleanUid = String(uid ?? '').trim()

  if (!UID_PATTERN.test(cleanUid)) {
    return failure(400, 'INVALID_UID', 'Invalid UID')
  }

  try {
    // The upstream host is fixed and the UID is digits-only, so no user input can
    // steer this request; the guarded agents still keep DNS rebinding out.
    const response = await axios.get(`${ENKA_ORIGIN}/api/hsr/uid/${cleanUid}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      httpAgent: guardedHttpAgent,
      httpsAgent: guardedHttpsAgent,
      timeout: UPSTREAM_TIMEOUT_MS,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxRedirects: 0,
      validateStatus: () => true,
      responseType: 'json',
    })

    const body: unknown = response.data
    const isObject = typeof body === 'object' && body !== null
    const upstream = (isObject ? body : {}) as EnkaUpstreamBody
    const upstreamMessage = typeof upstream.error === 'string' ? upstream.error : ''

    if (response.status === 200) {
      if (!isObject || typeof upstream.detailInfo !== 'object' || upstream.detailInfo === null) {
        return failure(502, 'UPSTREAM', 'Enka returned an unexpected payload')
      }

      const ttl = Number(upstream.ttl)
      const maxAge = Number.isFinite(ttl)
        ? Math.max(0, Math.min(Math.floor(ttl), MAX_CLIENT_CACHE_SECONDS))
        : 0

      return NextResponse.json(
        { ok: true, ttl: Number.isFinite(ttl) ? ttl : 0, data: body },
        { headers: { 'Cache-Control': `private, max-age=${maxAge}` } }
      )
    }

    if (response.status === 400) {
      return failure(400, 'INVALID_UID', upstreamMessage || 'Invalid UID')
    }
    if (response.status === 404) {
      return failure(404, 'NOT_FOUND', upstreamMessage || 'Player not found')
    }
    if (response.status === 424) {
      return failure(424, 'NOT_READY', upstreamMessage || 'Game maintenance or data not ready')
    }
    if (response.status === 429) {
      const retryAfter = Number(upstream.retryAfter)
      const result = failure(429, 'RATE_LIMIT', upstreamMessage || 'Rate limited by Enka')
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        result.headers.set('Retry-After', String(Math.ceil(retryAfter)))
      }
      return result
    }

    return failure(502, 'UPSTREAM', upstreamMessage || `Enka responded with ${response.status}`)
  } catch (error) {
    return failure(502, 'NETWORK', (error as Error)?.message || 'Could not reach Enka')
  }
}
