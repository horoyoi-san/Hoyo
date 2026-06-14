export const runtime = "edge";

import { getCharacters } from "@/src/lib/neonteam/get-character";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getCharacters();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
