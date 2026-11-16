import { getDataCache } from "@/lib/cache/cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const item = getDataCache(name);
  if (!item) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Revalidate every time: no timestamp cache-busting and no stale deploy data.
    "Cache-Control": process.env.NODE_ENV === "production"
      ? "public, no-cache, must-revalidate" : "no-cache, no-store, must-revalidate",
    "ETag": item.etag,
  };
  const matches = req.headers.get("if-none-match")?.split(",").some(tag =>
    tag.trim() === "*" || tag.trim().replace(/^W\//, "") === item.etag);
  if (matches) return new Response(null, { status: 304, headers });
  if (item.type === "br") headers["Content-Encoding"] = "br";
  return new Response(new Uint8Array(item.buf), { headers });
}
