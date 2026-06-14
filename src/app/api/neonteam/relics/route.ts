export const runtime = "edge";

import { getRelics } from "@/src/lib/neonteam/get-relics";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getRelics();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
