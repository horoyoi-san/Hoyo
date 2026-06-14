export const runtime = "edge";

import { getLightcones } from "@/src/lib/neonteam/get-lightcone";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getLightcones();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
