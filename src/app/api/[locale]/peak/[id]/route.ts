import { NextRequest, NextResponse } from 'next/server'
import { loadPeak } from '@/lib/loader'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, locale: string }> }
) {

  const { id, locale } = await params
  const peakData = await loadPeak([id], locale)
  const peak = peakData[id]

  if (!peak) {
    return NextResponse.json({ error: 'Peak info not found' }, { status: 404 })
  }

  return NextResponse.json(peak)
}
