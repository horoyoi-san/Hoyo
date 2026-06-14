export const runtime = "edge";

import { getRelicSets } from "@/src/lib/neonteam/get-relic-sets";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getRelicSets();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
