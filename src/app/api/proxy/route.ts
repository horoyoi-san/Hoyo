import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import {
  assertPublicUrl,
  BlockedTargetError,
  guardedHttpAgent,
  guardedHttpsAgent,
} from '@/lib/net/guard'

const UPSTREAM_TIMEOUT_MS = 15000
const MAX_REQUEST_BYTES = 1024 * 1024
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024

const AGENTS = {
  httpAgent: guardedHttpAgent,
  httpsAgent: guardedHttpsAgent,
  timeout: UPSTREAM_TIMEOUT_MS,
  maxContentLength: MAX_RESPONSE_BYTES,
  maxBodyLength: MAX_REQUEST_BYTES,
  maxRedirects: 0,
}

function failure(error: unknown, fallbackStatus = 502) {
  const status = error instanceof BlockedTargetError ? 403 : fallbackStatus
  return NextResponse.json({ error: (error as Error)?.message || 'Proxy failed' }, { status })
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }
    const { serverUrl, method, ...payload } = body

    if (!serverUrl) {
      return NextResponse.json({ error: 'Missing serverUrl' }, { status: 400 })
    }
    if (!method) {
      return NextResponse.json({ error: 'Missing method' }, { status: 400 })
    }
    if (String(method).toUpperCase() !== 'POST') {
      return NextResponse.json(
        { error: `Method ${method} is not allowed through this proxy` },
        { status: 405 }
      )
    }

    const target = await assertPublicUrl(String(serverUrl).trim())

    const response = await axios.post(target.toString(), payload, AGENTS)
    if (response.data === undefined || response.data === null || response.data === '') {
      return NextResponse.json({ message: '' })
    }

    return NextResponse.json(response.data)
  } catch (err: unknown) {
    const upstream = (err as { response?: { status?: number; data?: unknown } }).response
    if (upstream) {
      if (upstream.status && upstream.status >= 300 && upstream.status < 400) {
        return NextResponse.json(
          { error: 'Upstream attempted a redirect that was not followed' },
          { status: 502 }
        )
      }

      const data = upstream.data
      const message =
        typeof data === 'string' && data.trim()
          ? data.trim()
          : data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : (err as Error)?.message || 'Proxy failed'
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return failure(err)
  }
}
