using System.Text;
using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

public sealed record CmdIdEmitResult(int Constants, int Outputs, int Aliases, int UnresolvedAliases);

public static class CmdIdEmitter
{
    private static readonly Regex EntryRx = new(
        @"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)\s*;",
        RegexOptions.Compiled);
    private static readonly Regex ConstantRx = new(
        @"(?m)^\s*public\s+const\s+int\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)\s*;",
        RegexOptions.Compiled);

    public static CmdIdEmitResult Emit(
        List<TypeDef> defs,
        Dictionary<int, PacketIdRow> packetIds,
        IReadOnlyList<string> outputPaths,
        IReadOnlyList<string> aliasPaths)
    {
        if (outputPaths.Count == 0) return new CmdIdEmitResult(0, 0, 0, 0);
        var entries = new List<(string Name, int Value)>();
        var used = new Dictionary<string, int>(StringComparer.Ordinal);

        void Add(string rawName, int value)
        {
            if (value == 0 || rawName == "None") return;
            var name = rawName;
            if (used.TryGetValue(name, out var existing))
            {
                if (existing == value) return;
                name = $"{rawName}Cmd{value}";
                var serial = 2;
                while (used.ContainsKey(name)) name = $"{rawName}Cmd{value}_{serial++}";
            }
            used[name] = value;
            entries.Add((name, value));
        }

        foreach (var def in defs.Where(d => d.IsCmdEnum).OrderBy(d => d.Name, StringComparer.Ordinal))
        {
            var prefix = def.Name + "_";
            foreach (var line in def.Body.Replace("\r\n", "\n").Split('\n'))
            {
                var match = EntryRx.Match(line);
                if (!match.Success) continue;
                var value = int.Parse(match.Groups[2].Value);
                var name = match.Groups[1].Value;
                if (name.StartsWith(prefix, StringComparison.Ordinal)) name = name[prefix.Length..];
                if (name.StartsWith("Cmd", StringComparison.Ordinal) && name.Length > 3) name = name[3..];
                if (packetIds.TryGetValue(value, out var row) && row.Name.Any(char.IsLower)) name = row.Name;
                Add(name, value);
            }
        }
        foreach (var (value, row) in packetIds.OrderBy(pair => pair.Key)) Add(row.Name, value);

        var aliases = 0;
        var unresolvedAliases = 0;
        foreach (var path in aliasPaths.Where(File.Exists))
        foreach (var raw in File.ReadLines(path))
        {
            var line = raw.Split('#', 2)[0].Trim();
            if (line.Length == 0) continue;
            var parts = line.Split('=', 2, StringSplitOptions.TrimEntries);
            if (parts.Length != 2 || !used.TryGetValue(parts[1], out var value))
            {
                unresolvedAliases++;
                continue;
            }
            var before = entries.Count;
            Add(parts[0], value);
            if (entries.Count > before) aliases++;
        }

        var builder = new StringBuilder();
        builder.Append("namespace March7thHoney.Kcp;\n\npublic class CmdIds\n{\n");
        builder.Append("    public const int None = 0;\n");
        foreach (var (name, value) in entries)
            builder.Append("    public const int ").Append(name).Append(" = ").Append(value).Append(";\n");
        builder.Append("}\n");

        foreach (var path in outputPaths.Distinct(StringComparer.Ordinal))
        {
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(path, builder.ToString(), new UTF8Encoding(false));
        }
        return new CmdIdEmitResult(entries.Count, outputPaths.Distinct(StringComparer.Ordinal).Count(), aliases, unresolvedAliases);
    }

    public static CmdIdEmitResult AddAliases(
        IReadOnlyList<string> outputPaths,
        IReadOnlyList<string> aliasPaths)
    {
        var aliases = 0;
        var unresolvedAliases = 0;
        var outputs = 0;
        var constants = 0;

        foreach (var path in outputPaths.Distinct(StringComparer.Ordinal))
        {
            if (!File.Exists(path)) continue;
            var text = File.ReadAllText(path).Replace("\r\n", "\n");
            var values = new Dictionary<string, int>(StringComparer.Ordinal);
            foreach (Match match in ConstantRx.Matches(text))
                values[match.Groups[1].Value] = int.Parse(match.Groups[2].Value);
            constants = Math.Max(constants, values.Count);

            var additions = new List<(string Name, int Value)>();
            foreach (var aliasPath in aliasPaths.Where(File.Exists))
            foreach (var raw in File.ReadLines(aliasPath))
            {
                var line = raw.Split('#', 2)[0].Trim();
                if (line.Length == 0) continue;
                var parts = line.Split('=', 2, StringSplitOptions.TrimEntries);
                if (parts.Length != 2 || !values.TryGetValue(parts[1], out var value))
                {
                    unresolvedAliases++;
                    continue;
                }
                if (values.ContainsKey(parts[0])) continue;
                values[parts[0]] = value;
                additions.Add((parts[0], value));
            }
            if (additions.Count == 0) continue;

            var closingBrace = text.LastIndexOf('}');
            if (closingBrace < 0) continue;
            var builder = new StringBuilder();
            foreach (var (name, value) in additions)
                builder.Append("    public const int ").Append(name).Append(" = ").Append(value).Append(";\n");
            text = text.Insert(closingBrace, builder.ToString());
            File.WriteAllText(path, text, new UTF8Encoding(false));
            aliases += additions.Count;
            outputs++;
        }

        return new CmdIdEmitResult(constants + aliases, outputs, aliases, unresolvedAliases);
    }
}
