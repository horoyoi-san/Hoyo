export const runtime = "edge";

import subAffixes from "@/cache/data/RelicSubAffixConfig.json";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = subAffixes;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
