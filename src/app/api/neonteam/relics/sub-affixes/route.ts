export const runtime = "edge";

import { getSubAffixes } from "@/src/lib/neonteam/get-sub-affixes";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getSubAffixes();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
