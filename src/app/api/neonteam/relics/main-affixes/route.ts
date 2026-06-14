export const runtime = "edge";

import { getMainAffixes } from "@/src/lib/neonteam/get-main-affixes";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getMainAffixes();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
