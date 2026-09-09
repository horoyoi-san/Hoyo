using System.Text;
using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

/// <summary>
/// Parses the curated <c>Proto/ProtoFile/*.proto</c> files. A file may contain one or more top-level
/// message/enum defs, and a def's name need not match its filename — so we index by the type names
/// found INSIDE each file and derive references from field declarations (never from import filenames).
/// </summary>
public static class CuratedParser
{
    private static readonly HashSet<string> Scalars = new(StringComparer.Ordinal)
    {
        "double","float","int32","int64","uint32","uint64","sint32","sint64",
        "fixed32","fixed64","sfixed32","sfixed64","bool","string","bytes",
    };
    private static readonly Regex DefHeadRx =
        new(@"^(message|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{", RegexOptions.Compiled);
    private static readonly Regex MapRx =
        new(@"^\s*map<\s*[A-Za-z0-9_]+\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)\s*>\s+[A-Za-z_]", RegexOptions.Compiled);
    private static readonly Regex FieldRx =
        new(@"^\s*(?:repeated\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*\d+\s*;", RegexOptions.Compiled);
    private static readonly Regex EnumEntryRx =
        new(@"^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*(-?\d+)\s*;", RegexOptions.Compiled);

    public static List<TypeDef> ParseDirectory(string protoFileDir)
    {
        var defs = new List<TypeDef>();
        foreach (var path in Directory.EnumerateFiles(protoFileDir, "*.proto").OrderBy(p => p, StringComparer.Ordinal))
            defs.AddRange(ParseFile(path));
        return defs;
    }

    public static List<TypeDef> ParseFile(string path)
    {
        var result = new List<TypeDef>();
        var lines = File.ReadAllText(path).Replace("\r\n", "\n").Split('\n');

        int i = 0;
        while (i < lines.Length)
        {
            var head = DefHeadRx.Match(lines[i]);
            if (!head.Success) { i++; continue; }

            var kind = head.Groups[1].Value == "enum" ? DefKind.Enum : DefKind.Message;
            var name = head.Groups[2].Value;

            var bodySb = new StringBuilder();
            var refs = new HashSet<string>(StringComparer.Ordinal);
            var cmdIds = new List<int>();
            int depth = 0;
            int start = i;

            for (; i < lines.Length; i++)
            {
                var line = lines[i];
                bodySb.Append(line).Append('\n');
                depth += line.Count(c => c == '{') - line.Count(c => c == '}');

                if (i > start)
                {
                    var map = MapRx.Match(line);
                    if (map.Success) { var t = map.Groups[1].Value; if (!Scalars.Contains(t)) refs.Add(Leaf(t)); }
                    else
                    {
                        var fm = FieldRx.Match(line);
                        if (fm.Success)
                        {
                            var t = fm.Groups[1].Value;
                            if (!Scalars.Contains(t) && t != "oneof" && t != "map") refs.Add(Leaf(t));
                        }
                    }
                    var em = EnumEntryRx.Match(line);
                    if (em.Success && int.TryParse(em.Groups[1].Value, out var v) && v != 0) cmdIds.Add(v);
                }

                if (depth <= 0 && i > start) { i++; break; }
            }

            bool isCmdEnum = kind == DefKind.Enum && Regex.IsMatch(name, @"^Cmd[A-Za-z0-9]*Type$");
            result.Add(new TypeDef
            {
                Name = name,
                Kind = kind,
                Refs = refs.ToList(),
                Body = bodySb.ToString().TrimEnd('\n'),
                IsCmdEnum = isCmdEnum,
                CmdIds = isCmdEnum ? cmdIds : Array.Empty<int>(),
            });
        }
        return result;
    }

    private static string Leaf(string t) { int d = t.LastIndexOf('.'); return d >= 0 ? t[(d + 1)..] : t; }
}
