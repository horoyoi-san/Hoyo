export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;

  try {
    const res = await fetch(
      `https://api.mihomo.me/sr_info_parsed/${uid}?lang=en`,
    );
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
