import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

type CacheItem = { buf: Uint8Array; type: "json" | "br"; etag: string };
type CachedFile = { version: string; original: CacheItem };
const shared = globalThis as { __dataCache?: Map<string, CachedFile> };
const cache = (shared.__dataCache ??= new Map<string, CachedFile>());
const dir = path.join(process.cwd(), "data");

// Files in a subfolder are served as <folder>_<file> (avatar_detail/1001 -> avatar_detail_1001).
const sources = new Map<string, string>();
function scan(folder: string, prefix: string) {
  for (const entry of readdirSync(path.join(dir, folder), { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relative = folder ? `${folder}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      scan(relative, `${prefix}${entry.name}_`);
      continue;
    }
    if (entry.name.endsWith(".json")) sources.set(prefix + entry.name.slice(0, -5), relative);
    else if (entry.name.endsWith(".json.br") && !sources.has(prefix + entry.name.slice(0, -8))) {
      sources.set(prefix + entry.name.slice(0, -8), relative);
    }
  }
}
scan("", "");
const hash = (buf: Uint8Array) => createHash("sha256").update(buf).digest("hex");
const item = (buf: Uint8Array, type: CacheItem["type"]): CacheItem => ({ buf, type, etag: `"${hash(buf)}"` });

export function getDataCache(name: string): CacheItem | undefined {
  const file = sources.get(name);
  if (!file) return undefined;
  const sourcePath = path.join(dir, file);
  const isDev = process.env.NODE_ENV !== "production";
  let entry = cache.get(name);
  if (entry && !isDev) return entry.original;
  const stats = statSync(sourcePath);
  const version = `${stats.mtimeMs}:${stats.size}`;
  if (!entry || (isDev && entry.version !== version)) {
    const buf = readFileSync(sourcePath);
    entry = { version, original: item(buf, file.endsWith(".json.br") ? "br" : "json") };
    cache.set(name, entry);
  }
  return entry.original;
}
