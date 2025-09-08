import { loadPeak } from "@/lib/loader";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  try {
    const body = await request.json();
    const peakIds = body.peakIds as string[];
    const { locale } = await params;
    
    if (!Array.isArray(peakIds) || peakIds.some(id => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Invalid peakIds' }, { status: 400 });
    }

    const peakData = await loadPeak(peakIds, locale);

    return NextResponse.json(peakData);
  } catch {
    return NextResponse.json({ error: 'Failed to load peak data' }, { status: 500 });
  }
}
