using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

/// <summary>
/// Parses <c>Raw/StarRail.proto</c> (the authoritative AST) into type -&gt; referenced-type edges.
/// Used only for GROUPING/closure: it connects the orphan islands that the curated import graph
/// can't reach (master has the full field references, including messages with no curated file).
/// Definitions are still emitted from the curated layer, never from here.
/// </summary>
public static class MasterParser
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

    /// <summary>type name -&gt; set of referenced (non-scalar) type names, as spelled in master.</summary>
    public static Dictionary<string, HashSet<string>> ParseEdges(string starRailPath)
    {
        var edges = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        var lines = File.ReadAllText(starRailPath).Replace("\r\n", "\n").Split('\n');

        string? current = null;        // current top-level message name (enums have no refs)
        int depth = 0;
        HashSet<string>? refs = null;

        foreach (var line in lines)
        {
            if (current == null)
            {
                var m = DefHeadRx.Match(line);
                if (m.Success && m.Groups[1].Value == "message")
                {
                    current = m.Groups[2].Value;
                    refs = edges.TryGetValue(current, out var ex) ? ex : edges[current] = new(StringComparer.Ordinal);
                    depth = line.Count(c => c == '{') - line.Count(c => c == '}');
                    if (depth <= 0) current = null; // single-line (won't happen here)
                }
                else if (m.Success)
                {
                    // record enum existence with no refs
                    if (!edges.ContainsKey(m.Groups[2].Value))
                        edges[m.Groups[2].Value] = new(StringComparer.Ordinal);
                }
                continue;
            }

            depth += line.Count(c => c == '{') - line.Count(c => c == '}');

            var map = MapRx.Match(line);
            if (map.Success)
            {
                var t = map.Groups[1].Value;
                if (!Scalars.Contains(t)) refs!.Add(StripQualifier(t));
            }
            else
            {
                var fm = FieldRx.Match(line);
                if (fm.Success)
                {
                    var t = fm.Groups[1].Value;
                    if (!Scalars.Contains(t) && t != "oneof" && t != "map")
                        refs!.Add(StripQualifier(t));
                }
            }

            if (depth <= 0) { current = null; refs = null; }
        }
        return edges;
    }

    // Master has no nested types, but ref tokens could theoretically be dotted; keep the leaf.
    private static string StripQualifier(string t)
    {
        int dot = t.LastIndexOf('.');
        return dot >= 0 ? t[(dot + 1)..] : t;
    }
}
