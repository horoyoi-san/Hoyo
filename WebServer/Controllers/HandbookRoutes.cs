using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using March7thHoney.Util;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

// Exposes the generated GM handbook over HTTP so tools (e.g. the launcher)
// can query item/avatar/etc. ids. The directory is derived from config, the
// same way HandbookGenerator writes it — no hardcoded path, identical on the
// server and a local instance.
//
// Content is cached in memory and served gzip-compressed (when the client
// accepts it) so the endpoint can't be abused as a disk/bandwidth amplifier:
// the 2MB file is read & compressed once, then served from RAM.
public static class HandbookRoutes
{
    private static string HandbookDir => Path.Combine(ConfigManager.Config.Path.ConfigPath, "Handbook");

    private sealed record CacheEntry(long MTimeTicks, byte[] Raw, byte[] Gzip);

    private static readonly Dictionary<string, CacheEntry> Cache = new(StringComparer.OrdinalIgnoreCase);
    private static readonly object CacheLock = new();

    public static void MapHandbookRoutes(this IEndpointRouteBuilder app)
    {
        app.MapGet("/handbook/languages",
            () => Results.Text(
                JsonSerializer.Serialize(new HandbookLanguages(GetLanguages()), WebJsonContext.Default.HandbookLanguages),
                "application/json"));

        app.MapGet("/handbook/content", (HttpContext ctx, string? lang) =>
        {
            lang = (lang ?? "").Trim();
            if (!GetLanguages().Contains(lang, StringComparer.OrdinalIgnoreCase))
                return Results.Text("unknown handbook language", "text/plain", null, 404);

            var entry = GetCachedEntry(lang);

            if (ctx.Request.Headers.AcceptEncoding.ToString().Contains("gzip", StringComparison.OrdinalIgnoreCase))
            {
                ctx.Response.Headers["Content-Encoding"] = "gzip";
                return Results.Bytes(entry.Gzip, "text/plain; charset=utf-8");
            }

            return Results.Bytes(entry.Raw, "text/plain; charset=utf-8");
        });
    }

    private static CacheEntry GetCachedEntry(string lang)
    {
        var dir = new DirectoryInfo(HandbookDir);
        // A language may be split across parts (e.g. "Handbook KR_0.txt", "Handbook KR_1.txt").
        var rx = new Regex($"^Handbook {Regex.Escape(lang)}(_[0-9]+)?\\.txt$", RegexOptions.IgnoreCase);
        var files = dir.GetFiles("Handbook *.txt")
            .Where(f => rx.IsMatch(f.Name))
            .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        long mtime = 0;
        foreach (var f in files)
            mtime = Math.Max(mtime, f.LastWriteTimeUtc.Ticks);

        lock (CacheLock)
        {
            if (Cache.TryGetValue(lang, out var cached) && cached.MTimeTicks == mtime)
                return cached;
        }

        var sb = new StringBuilder();
        foreach (var f in files)
            sb.Append(File.ReadAllText(f.FullName, Encoding.UTF8));

        var raw = Encoding.UTF8.GetBytes(sb.ToString());
        byte[] gzip;
        using (var ms = new MemoryStream())
        {
            using (var gz = new GZipStream(ms, CompressionLevel.SmallestSize, leaveOpen: true))
                gz.Write(raw, 0, raw.Length);
            gzip = ms.ToArray();
        }

        var entry = new CacheEntry(mtime, raw, gzip);
        lock (CacheLock)
        {
            Cache[lang] = entry;
        }

        return entry;
    }

    private static List<string> GetLanguages()
    {
        var dir = new DirectoryInfo(HandbookDir);
        if (!dir.Exists) return [];

        var set = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var f in dir.GetFiles("Handbook *.txt"))
        {
            var name = Path.GetFileNameWithoutExtension(f.Name); // "Handbook EN" / "Handbook KR_0"
            if (!name.StartsWith("Handbook ", StringComparison.OrdinalIgnoreCase)) continue;
            var lang = Regex.Replace(name["Handbook ".Length..], "_[0-9]+$", "");
            if (lang.Length > 0) set.Add(lang);
        }

        return set.ToList();
    }
}
