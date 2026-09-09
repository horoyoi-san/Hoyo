using System.Text;

namespace March7thHoney.Util;

public static class HoyoToonLuaPayloadBuilder
{
    private static readonly string[] HoyoToonLuaModules =
    [
        "core",
        "catalog",
        "ids",
        "values",
        "resources",
        "scope",
        "runtime",
        "hotkeys",
        "character"
    ];

    private static readonly string[] CharacterScriptHoyoToonLuaModules =
    [
        "core",
        "catalog",
        "ids",
        "values",
        "resources",
        "scope",
        "character"
    ];

    private static readonly string[] MinimalHoyoToonLuaModules =
    [
        "core"
    ];

    public static async Task<byte[]> BuildAsync(string luaRoot, string relativePath)
    {
        var filePath = ResolveLuaPath(luaRoot, relativePath);
        var fileText = await File.ReadAllTextAsync(filePath);

        if (!ShouldBundle(relativePath, fileText))
            return Encoding.UTF8.GetBytes(fileText);

        var normalized = NormalizeLuaPath(relativePath);
        var entryText = SlimEntryForPath(normalized, fileText);
        var modules = IsCharacterScriptPath(normalized) ? CharacterScriptHoyoToonLuaModules : null;
        return Encoding.UTF8.GetBytes(await BuildBundleAsync(luaRoot, relativePath, entryText, moduleNames: modules));
    }

    public static async Task<byte[]> BuildScriptAsync(string luaRoot, string relativePath)
    {
        var filePath = ResolveLuaPath(luaRoot, relativePath);
        var fileText = await File.ReadAllTextAsync(filePath);
        var normalized = NormalizeLuaPath(relativePath);
        var entryText = SlimEntryForPath(normalized, fileText);
        return Encoding.UTF8.GetBytes(await BuildBundleAsync(luaRoot, relativePath, entryText,
            moduleNames: CharacterScriptHoyoToonLuaModules));
    }

    public static async Task<byte[]> BuildInlineAsync(string luaRoot, string virtualPath, string fileText,
        bool minimalBoot = false)
    {
        return Encoding.UTF8.GetBytes(await BuildBundleAsync(luaRoot, virtualPath, CompactLua(fileText), minimalBoot));
    }

    public static string ResolveLuaPath(string luaRoot, string relativePath)
    {
        luaRoot = Path.GetFullPath(luaRoot);
        var filePath = Path.GetFullPath(Path.Combine(luaRoot, relativePath));
        var rootedRelative = Path.GetRelativePath(luaRoot, filePath);
        if (Path.IsPathRooted(rootedRelative) ||
            rootedRelative.Equals("..", StringComparison.Ordinal) ||
            rootedRelative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal) ||
            rootedRelative.StartsWith(".." + Path.AltDirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new IOException("Lua path escapes Lua root: " + relativePath);
        }
        return filePath;
    }

    public static bool ShouldBundle(string relativePath, string fileText)
    {
        var normalized = relativePath.Replace("\\", "/");
        return fileText.Contains("--#hoyotoonlua", StringComparison.OrdinalIgnoreCase)
               || normalized.Equals("HoyoToonLua.lua", StringComparison.OrdinalIgnoreCase)
               || normalized.StartsWith("Avatar/", StringComparison.OrdinalIgnoreCase)
               || normalized.StartsWith("Characters/", StringComparison.OrdinalIgnoreCase)
               || normalized.StartsWith("Auto/", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<string> BuildBundleAsync(string luaRoot, string relativePath, string entryText,
        bool minimalBoot = false, IReadOnlyList<string>? moduleNames = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine("-- Bundled by March7thHoney for HoyoToonLua.");
        sb.AppendLine("_G.HoyoToonLua_BUNDLE = _G.HoyoToonLua_BUNDLE or {}");
        if (minimalBoot)
            sb.AppendLine("_G.HoyoToonLua_MINIMAL_BOOT = true");
        if (NormalizeLuaPath(relativePath).StartsWith("Auto/", StringComparison.OrdinalIgnoreCase))
            sb.AppendLine("_G.HoyoToonLua_QUIET_BOOT = true");

        var modules = moduleNames ?? (minimalBoot ? MinimalHoyoToonLuaModules : HoyoToonLuaModules);

        foreach (var module in modules)
        {
            var modulePath = ResolveFirstExistingPath(luaRoot,
            [
                Path.Combine("SDK", module + ".lua"),
                Path.Combine("HoyoToonLua", module + ".lua")
            ]);
            if (!File.Exists(modulePath)) continue;

            var moduleText = CompactLua(await File.ReadAllTextAsync(modulePath));
            sb.Append("_G.HoyoToonLua_BUNDLE[");
            sb.Append(ToLuaString(module));
            sb.AppendLine("] = function()");
            sb.AppendLine(moduleText);
            sb.AppendLine("end");
        }

        var normalized = relativePath.Replace("\\", "/");
        if (!normalized.Equals("HoyoToonLua.lua", StringComparison.OrdinalIgnoreCase))
        {
            var bootPath = Path.Combine(luaRoot, "HoyoToonLua.lua");
            if (File.Exists(bootPath))
            {
                sb.AppendLine("-- HoyoToonLua bootstrap.");
                sb.AppendLine(CompactLua(await File.ReadAllTextAsync(bootPath)));
            }
        }

        sb.AppendLine("-- /windy or auto-run entry.");
        sb.AppendLine("if _G.HTL ~= nil and _G.HTL.log ~= nil then _G.HTL.log(\"entry start: \" .. " +
                      ToLuaString(relativePath.Replace("\\", "/")) + ") end");
        sb.AppendLine("local __htl_entry_ok, __htl_entry_err = xpcall(function()");
        sb.AppendLine(entryText);
        sb.AppendLine("end, function(err)");
        sb.AppendLine("    if debug ~= nil and debug.traceback ~= nil then return debug.traceback(err) end");
        sb.AppendLine("    return tostring(err)");
        sb.AppendLine("end)");
        sb.AppendLine("if not __htl_entry_ok then");
        sb.AppendLine("    local __htl = _G.HoyoToonLua or _G.HTL");
        sb.AppendLine("    if __htl ~= nil and __htl.log ~= nil then __htl.log(\"entry failed: \" .. tostring(__htl_entry_err)) end");
        sb.AppendLine("    if __htl ~= nil and __htl.notify ~= nil then __htl.notify(\"HoyoToonLua entry failed: \" .. tostring(__htl_entry_err), { notify = true, force = true, color = \"red\" }) end");
        sb.AppendLine("    error(__htl_entry_err)");
        sb.AppendLine("end");
        return sb.ToString();
    }

    private static string NormalizeLuaPath(string relativePath)
    {
        return relativePath.Replace("\\", "/", StringComparison.Ordinal);
    }

    private static bool IsCharacterScriptPath(string normalizedPath)
    {
        return normalizedPath.StartsWith("Avatar/", StringComparison.OrdinalIgnoreCase)
               || normalizedPath.StartsWith("Characters/", StringComparison.OrdinalIgnoreCase);
    }

    private static string SlimEntryForPath(string normalizedPath, string fileText)
    {
        return IsCharacterScriptPath(normalizedPath)
            ? SlimGeneratedCharacterEntry(fileText)
            : CompactLua(fileText);
    }

    private static string SlimGeneratedCharacterEntry(string fileText)
    {
        var sb = new StringBuilder();
        var skippingMetadataBlock = false;
        var skippingTraceFieldsBlock = false;
        var metadataBlockDepth = 0;
        var traceFieldsBlockDepth = 0;
        var inTraceSheet = false;
        var traceSheetDepth = 0;

        foreach (var rawLine in SplitLines(fileText))
        {
            var trimmed = rawLine.Trim();
            var lineNoComment = StripLuaLineComment(trimmed);
            var currentLineInTraceSheet = inTraceSheet || IsGeneratedTraceSheetStart(lineNoComment);

            if (skippingMetadataBlock)
            {
                metadataBlockDepth += CountLuaTableBraceDelta(lineNoComment);
                if (metadataBlockDepth <= 0)
                    skippingMetadataBlock = false;
                UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
                continue;
            }

            if (skippingTraceFieldsBlock)
            {
                traceFieldsBlockDepth += CountLuaTableBraceDelta(lineNoComment);
                if (traceFieldsBlockDepth <= 0)
                    skippingTraceFieldsBlock = false;
                UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
                continue;
            }

            if (IsGeneratedMetadataBlockStart(trimmed))
            {
                metadataBlockDepth = CountLuaTableBraceDelta(lineNoComment);
                if (metadataBlockDepth > 0)
                    skippingMetadataBlock = true;
                UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
                continue;
            }

            if (currentLineInTraceSheet && IsGeneratedTraceFieldsBlockStart(trimmed))
            {
                traceFieldsBlockDepth = CountLuaTableBraceDelta(lineNoComment);
                if (traceFieldsBlockDepth > 0)
                    skippingTraceFieldsBlock = true;
                UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
                continue;
            }

            if (IsGeneratedMetadataScalar(trimmed))
            {
                UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
                continue;
            }

            var compactLine = CompactGeneratedLuaLine(lineNoComment.Trim());
            if (compactLine.Length == 0 || compactLine.StartsWith("--", StringComparison.Ordinal))
            {
                UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
                continue;
            }

            sb.AppendLine(compactLine);
            UpdateTraceSheetState(lineNoComment, ref inTraceSheet, ref traceSheetDepth);
        }

        return sb.ToString();
    }

    private static bool IsGeneratedMetadataBlockStart(string trimmedLine)
    {
        var equalsIndex = trimmedLine.IndexOf('=');
        if (equalsIndex <= 0)
            return false;

        var key = trimmedLine[..equalsIndex].Trim();
        if (key is not ("info" or "params"))
            return false;

        return trimmedLine[(equalsIndex + 1)..].TrimStart().StartsWith("{", StringComparison.Ordinal);
    }

    private static bool IsGeneratedTraceSheetStart(string trimmedLine)
    {
        return trimmedLine.StartsWith("mod:Traces({", StringComparison.Ordinal)
               || trimmedLine.StartsWith("mod:Talents({", StringComparison.Ordinal);
    }

    private static bool IsGeneratedTraceFieldsBlockStart(string trimmedLine)
    {
        var equalsIndex = trimmedLine.IndexOf('=');
        if (equalsIndex <= 0)
            return false;

        var key = trimmedLine[..equalsIndex].Trim();
        return key == "fields"
               && trimmedLine[(equalsIndex + 1)..].TrimStart().StartsWith("{", StringComparison.Ordinal);
    }

    private static void UpdateTraceSheetState(string line, ref bool inTraceSheet, ref int traceSheetDepth)
    {
        if (!inTraceSheet && IsGeneratedTraceSheetStart(line))
            inTraceSheet = true;

        if (!inTraceSheet)
            return;

        traceSheetDepth += CountLuaTableBraceDelta(line);
        if (traceSheetDepth <= 0)
        {
            inTraceSheet = false;
            traceSheetDepth = 0;
        }
    }

    private static bool IsGeneratedMetadataScalar(string trimmedLine)
    {
        var equalsIndex = trimmedLine.IndexOf('=');
        if (equalsIndex <= 0)
            return false;

        var key = trimmedLine[..equalsIndex].Trim();
        return key is "typeName" or "tag";
    }

    private static string CompactGeneratedLuaLine(string trimmedLine)
    {
        if (!trimmedLine.StartsWith("[\"#", StringComparison.Ordinal))
            return trimmedLine;

        var numberStart = 3;
        var numberEnd = numberStart;
        while (numberEnd < trimmedLine.Length && char.IsDigit(trimmedLine[numberEnd]))
            numberEnd++;

        if (numberEnd == numberStart)
            return trimmedLine;

        var quoteIndex = trimmedLine.IndexOf('"', numberEnd);
        if (quoteIndex <= numberEnd ||
            quoteIndex + 1 >= trimmedLine.Length ||
            trimmedLine[quoteIndex + 1] != ']')
        {
            return trimmedLine;
        }

        return "[" + trimmedLine[numberStart..numberEnd] + "]" + trimmedLine[(quoteIndex + 2)..];
    }

    private static string CompactLua(string fileText)
    {
        var sb = new StringBuilder();

        foreach (var rawLine in SplitLines(fileText))
        {
            var trimmed = StripLuaLineComment(rawLine).Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith("--", StringComparison.Ordinal))
                continue;

            sb.AppendLine(trimmed);
        }

        return sb.ToString();
    }

    private static IEnumerable<string> SplitLines(string text)
    {
        return text.Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n');
    }

    private static string StripLuaLineComment(string line)
    {
        var inString = false;
        var quote = '\0';
        var escaping = false;

        for (var index = 0; index < line.Length - 1; index++)
        {
            var c = line[index];
            if (inString)
            {
                if (escaping)
                {
                    escaping = false;
                }
                else if (c == '\\')
                {
                    escaping = true;
                }
                else if (c == quote)
                {
                    inString = false;
                }
                continue;
            }

            if (c is '"' or '\'')
            {
                inString = true;
                quote = c;
                continue;
            }

            if (c == '-' && line[index + 1] == '-')
                return line[..index].TrimEnd();
        }

        return line;
    }

    private static int CountLuaTableBraceDelta(string line)
    {
        var inString = false;
        var quote = '\0';
        var escaping = false;
        var delta = 0;

        foreach (var c in line)
        {
            if (inString)
            {
                if (escaping)
                {
                    escaping = false;
                }
                else if (c == '\\')
                {
                    escaping = true;
                }
                else if (c == quote)
                {
                    inString = false;
                }
                continue;
            }

            if (c is '"' or '\'')
            {
                inString = true;
                quote = c;
                continue;
            }

            if (c == '{')
                delta++;
            else if (c == '}')
                delta--;
        }

        return delta;
    }

    private static string ResolveFirstExistingPath(string luaRoot, IEnumerable<string> relativePaths)
    {
        foreach (var relativePath in relativePaths)
        {
            var filePath = Path.Combine(luaRoot, relativePath);
            if (File.Exists(filePath)) return filePath;
        }

        return Path.Combine(luaRoot, relativePaths.First());
    }

    private static string ToLuaString(string value)
    {
        return "\"" + value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal)
            .Replace("\r", "\\r", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal) + "\"";
    }

}
