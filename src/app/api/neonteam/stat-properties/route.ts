export const runtime = "edge";

import { getStatProperties } from "@/src/lib/neonteam/get-stat-properties";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getStatProperties();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
