using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

public static class ProtoRewriteMode
{
    private static readonly Regex DefinitionHead = new(
        @"(?m)^(?:message|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{",
        RegexOptions.Compiled);
    private static readonly Regex FieldDefinition = new(
        @"(?m)^\s*(?:(?:repeated|optional|required)\s+)?(?:map<[^>]+>|[A-Za-z_][A-Za-z0-9_.]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)",
        RegexOptions.Compiled);

    public static int Run(Args opts)
    {
        if (opts.TranslationPaths.Count == 0)
        {
            Console.Error.WriteLine("[organizer] --rewrite-proto requires --translation.");
            return 2;
        }

        var translations = Translations.Load(opts.TranslationPaths);
        if (translations.ForcedTypes.Count == 0)
        {
            Console.Error.WriteLine("[organizer] rewrite mode requires forced type rows prefixed with '!'.");
            return 2;
        }

        AppendMissingForcedDefinitions(opts, translations);
        var rewriteTypes = BuildRewriteTypes(translations);
        var tagTranslations = BuildTagTranslations(translations, rewriteTypes, opts.RawDir, opts.RewriteProtoPaths);

        foreach (var path in opts.RewriteProtoPaths.Distinct(StringComparer.Ordinal))
        {
            var changed = Rewrite(path, translations, rewriteTypes, tagTranslations);
            Console.WriteLine($"[organizer] rewrite {(changed ? "updated" : "unchanged")}: {path}");
        }

        var cmdIdResult = CmdIdEmitter.AddAliases(
            opts.CmdIdsOutPaths,
            opts.CmdIdAliasPaths);
        if (cmdIdResult.Outputs > 0)
            Console.WriteLine($"[organizer] cmdid aliases = {cmdIdResult.Aliases} -> {cmdIdResult.Outputs} files");

        return Compile(opts);
    }

    private static void AppendMissingForcedDefinitions(Args opts, Translations translations)
    {
        var destination = opts.RewriteProtoPaths[0];
        var destinationNames = CuratedParser.ParseFile(destination)
            .Select(definition => definition.Name)
            .ToHashSet(StringComparer.Ordinal);
        var namesByPath = opts.RewriteProtoPaths.ToDictionary(
            path => path,
            path => CuratedParser.ParseFile(path).Select(definition => definition.Name).ToHashSet(StringComparer.Ordinal),
            StringComparer.Ordinal);
        var compiledPaths = opts.CompileRewritePaths
            .Select(Path.GetFullPath)
            .ToHashSet(StringComparer.Ordinal);
        var rawByName = CuratedParser.ParseDirectory(opts.RawDir)
            .GroupBy(definition => definition.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);
        var additions = new List<string>();
        foreach (var source in translations.ForcedTypes)
        {
            var target = translations.ObfToReal[source];
            if (destinationNames.Contains(source) || destinationNames.Contains(target) || !rawByName.ContainsKey(source))
                continue;
            var owner = namesByPath.FirstOrDefault(pair => pair.Key != destination &&
                (pair.Value.Contains(source) || pair.Value.Contains(target))).Key;
            if (owner != null && compiledPaths.Contains(Path.GetFullPath(owner))) continue;
            if (owner != null) RemoveDefinition(owner, source, target);
            additions.Add(rawByName[source].Body);
        }
        if (additions.Count == 0) return;

        var text = File.ReadAllText(destination).TrimEnd() + "\n\n" + string.Join("\n\n", additions) + "\n";
        File.WriteAllText(destination, text, new UTF8Encoding(false));
        Console.WriteLine($"[organizer] appended {additions.Count} forced definitions to {destination}");
    }

    private static void RemoveDefinition(string path, params string[] definitionNames)
    {
        var original = File.ReadAllText(path).Replace("\r\n", "\n");
        var block = FindDefinitions(original).FirstOrDefault(block => definitionNames.Contains(block.Name));
        if (block == null) return;
        var start = block.Start;
        var end = block.End;
        while (end < original.Length && original[end] == '\n') end++;
        var rewritten = original.Remove(start, end - start);
        File.WriteAllText(path, rewritten, new UTF8Encoding(false));
    }

    private static bool Rewrite(
        string path,
        Translations translations,
        IReadOnlySet<string> rewriteTypes,
        IReadOnlyDictionary<string, Dictionary<int, string>> tagTranslations)
    {
        var original = File.ReadAllText(path).Replace("\r\n", "\n");
        var rewritten = original;
        var blocks = FindDefinitions(original);

        foreach (var block in blocks.OrderByDescending(block => block.Start))
        {
            var body = original[block.Start..block.End];
            var targetName = translations.ObfToReal.GetValueOrDefault(block.Name, block.Name);
            if ((rewriteTypes.Contains(block.Name) || rewriteTypes.Contains(targetName)) &&
                (translations.ScopedFields.TryGetValue(block.Name, out var fields) ||
                 translations.ScopedFields.TryGetValue(targetName, out fields)))
            {
                body = ReplaceIdentifiers(body, fields);
            }
            if (tagTranslations.TryGetValue(block.Name, out var tags) ||
                tagTranslations.TryGetValue(targetName, out tags))
            {
                foreach (var (tag, name) in tags)
                {
                    body = DisambiguateFieldName(body, tag, name);
                    body = ReplaceFieldAtTag(body, tag, name);
                }
            }
            body = ReplaceIdentifiers(body, translations.ForcedTypes.ToDictionary(
                name => name,
                name => translations.ObfToReal[name],
                StringComparer.Ordinal));
            rewritten = rewritten.Remove(block.Start, block.End - block.Start).Insert(block.Start, body);
        }

        if (rewritten == original) return false;
        File.WriteAllText(path, rewritten, new UTF8Encoding(false));
        return true;
    }

    private static Dictionary<string, Dictionary<int, string>> BuildTagTranslations(
        Translations translations,
        IReadOnlySet<string> rewriteTypes,
        string rawDir,
        IReadOnlyList<string> rewritePaths)
    {
        var result = new Dictionary<string, Dictionary<int, string>>(StringComparer.Ordinal);
        var raw = CuratedParser.ParseDirectory(rawDir);
        var grouped = rewritePaths
            .SelectMany(CuratedParser.ParseFile)
            .GroupBy(definition => definition.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);
        var rawByName = raw
            .GroupBy(definition => definition.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

        foreach (var (type, fields) in translations.ScopedFields)
        {
            if (!rewriteTypes.Contains(type)) continue;
            var candidates = new List<TypeDef>();
            if (rawByName.TryGetValue(type, out var exact)) candidates.Add(exact);
            foreach (var source in translations.ForcedTypes.Where(source => translations.ObfToReal[source] == type))
                if (rawByName.TryGetValue(source, out var forced)) candidates.Add(forced);
            if (candidates.Count == 0)
            {
                candidates.AddRange(raw.Where(definition => fields.Keys.Any(name =>
                    Regex.IsMatch(definition.Body, $@"\b{Regex.Escape(name)}\b"))));
            }
            if (candidates.Count == 0) continue;

            var groupedDefinition = grouped.GetValueOrDefault(type);
            if (groupedDefinition == null)
            {
                var groupedSource = translations.ForcedTypes.FirstOrDefault(source =>
                    translations.ObfToReal[source] == type && grouped.ContainsKey(source));
                if (groupedSource != null) groupedDefinition = grouped[groupedSource];
            }
            var groupedTags = groupedDefinition == null
                ? new HashSet<int>()
                : ParseFieldTags(groupedDefinition.Body).Values.ToHashSet();
            var candidate = candidates
                .DistinctBy(definition => definition.Name, StringComparer.Ordinal)
                .OrderByDescending(definition => fields.Keys.Count(name =>
                    Regex.IsMatch(definition.Body, $@"\b{Regex.Escape(name)}\b")) * 1000 +
                    ParseFieldTags(definition.Body).Values.Count(groupedTags.Contains))
                .First();
            var rawFields = ParseFieldTags(candidate.Body);
            var tags = new Dictionary<int, string>();
            foreach (var (rawName, semanticName) in fields)
                if (rawFields.TryGetValue(rawName, out var tag))
                    tags[tag] = semanticName;
            if (tags.Count > 0) result[type] = tags;
        }

        Console.WriteLine($"[organizer] resolved tag translations for {result.Count} scoped types");
        return result;
    }

    private static HashSet<string> BuildRewriteTypes(Translations translations)
    {
        var result = new HashSet<string>(translations.ForcedTypes, StringComparer.Ordinal);
        foreach (var source in translations.ForcedTypes)
            result.Add(translations.ObfToReal[source]);
        foreach (var field in translations.ForcedFields)
            result.Add(field[..field.IndexOf('.')]);
        return result;
    }

    private static Dictionary<string, int> ParseFieldTags(string body)
    {
        return FieldDefinition.Matches(body)
            .Cast<Match>()
            .ToDictionary(
                match => match.Groups[1].Value,
                match => int.Parse(match.Groups[2].Value),
                StringComparer.Ordinal);
    }

    private static string ReplaceFieldAtTag(string body, int tag, string name)
    {
        var pattern = $@"(?m)^(\s*(?:(?:repeated|optional|required)\s+)?(?:map<[^>]+>|[A-Za-z_][A-Za-z0-9_.]*)\s+)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*{tag}\b[^;]*;)";
        return Regex.Replace(body, pattern, $"$1{name}$3");
    }

    private static string DisambiguateFieldName(string body, int targetTag, string name)
    {
        foreach (Match match in FieldDefinition.Matches(body))
        {
            if (match.Groups[1].Value != name) continue;
            var existingTag = int.Parse(match.Groups[2].Value);
            if (existingTag != targetTag)
                body = ReplaceFieldAtTag(body, existingTag, $"unknown_field_{existingTag}");
        }
        return body;
    }

    private static List<DefinitionBlock> FindDefinitions(string text)
    {
        var result = new List<DefinitionBlock>();
        foreach (Match match in DefinitionHead.Matches(text))
        {
            var brace = text.IndexOf('{', match.Index);
            var depth = 0;
            var end = -1;
            for (var index = brace; index < text.Length; index++)
            {
                if (text[index] == '{') depth++;
                else if (text[index] == '}' && --depth == 0)
                {
                    end = index + 1;
                    break;
                }
            }
            if (end > 0) result.Add(new DefinitionBlock(match.Index, end, match.Groups[1].Value));
        }
        return result;
    }

    private static string ReplaceIdentifiers(string text, IReadOnlyDictionary<string, string> mappings)
    {
        foreach (var (source, target) in mappings)
            text = Regex.Replace(text, $@"\b{Regex.Escape(source)}\b", target);
        return text;
    }

    private static int Compile(Args opts)
    {
        if (opts.CompileRewritePaths.Count == 0) return 0;
        opts.Protoc = Compiler.ResolveProtoc(opts.Protoc);
        Directory.CreateDirectory(opts.CsOutDir);
        var failures = 0;

        foreach (var path in opts.CompileRewritePaths.Distinct(StringComparer.Ordinal))
        {
            var relative = Path.GetRelativePath(opts.OutDir, path);
            var processInfo = new ProcessStartInfo
            {
                FileName = opts.Protoc,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
            };
            processInfo.ArgumentList.Add($"--proto_path={opts.OutDir}");
            processInfo.ArgumentList.Add($"--csharp_out={opts.CsOutDir}");
            processInfo.ArgumentList.Add(relative);
            using var process = Process.Start(processInfo);
            if (process == null)
            {
                Console.Error.WriteLine($"[organizer] failed to launch protoc for {relative}.");
                return 3;
            }
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();
            if (process.ExitCode == 0)
                Console.WriteLine($"[organizer] protoc OK: {relative}");
            else
            {
                failures++;
                Console.Error.WriteLine($"[organizer] protoc failed on {relative}:\n{error}");
            }
        }

        return failures == 0 ? 0 : 4;
    }

    private sealed record DefinitionBlock(int Start, int End, string Name);
}
