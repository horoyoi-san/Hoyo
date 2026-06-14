export const runtime = "edge";

import mainAffixes from "@/cache/data/RelicMainAffixConfig.json";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = mainAffixes;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
