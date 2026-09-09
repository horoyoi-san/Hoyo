using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

/// <summary>Loads type and scoped field translations from <c>Raw/translations.txt</c>.</summary>
public sealed class Translations
{
    public Dictionary<string, string> ObfToReal { get; } = new(StringComparer.Ordinal);
    public Dictionary<string, List<string>> RealToObf { get; } = new(StringComparer.Ordinal);
    public Dictionary<string, Dictionary<string, string>> ScopedFields { get; } = new(StringComparer.Ordinal);
    public HashSet<string> ForcedTypes { get; } = new(StringComparer.Ordinal);
    public HashSet<string> ForcedFields { get; } = new(StringComparer.Ordinal);

    private static readonly Regex RowRx =
        new(@"^!?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*$", RegexOptions.Compiled);
    private static readonly Regex FieldRowRx =
        new(@"^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*$", RegexOptions.Compiled);

    public void Add(string obf, string real, bool force = false)
    {
        if (ForcedTypes.Contains(obf) && !force) return;
        if (force) ForcedTypes.Add(obf);
        ObfToReal[obf] = real;
        if (!RealToObf.TryGetValue(real, out var list)) RealToObf[real] = list = new();
        if (!list.Contains(obf, StringComparer.Ordinal)) list.Add(obf);
    }

    public void AddField(string type, string obf, string real, bool force = false)
    {
        var key = $"{type}.{obf}";
        if (ForcedFields.Contains(key) && !force) return;
        if (force) ForcedFields.Add(key);
        if (!ScopedFields.TryGetValue(type, out var fields))
            ScopedFields[type] = fields = new Dictionary<string, string>(StringComparer.Ordinal);
        fields[obf] = real;
    }

    public static Translations Load(string path) => Load(new[] { path });

    public static Translations Load(IEnumerable<string> paths)
    {
        var t = new Translations();
        foreach (var path in paths.Where(File.Exists))
        foreach (var raw in File.ReadLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith("//")) continue;
            var force = line.StartsWith('!');
            if (force) line = line[1..].TrimStart();
            var fieldMatch = FieldRowRx.Match(line);
            if (fieldMatch.Success)
            {
                t.AddField(fieldMatch.Groups[1].Value, fieldMatch.Groups[2].Value, fieldMatch.Groups[3].Value, force);
                continue;
            }
            var m = RowRx.Match(line);
            if (!m.Success) continue;
            var obf = m.Groups[1].Value;
            var real = m.Groups[2].Value;
            t.Add(obf, real, force);
        }
        return t;
    }

    public static Translations FromMappings(IReadOnlyDictionary<string, string> mappings)
    {
        var t = new Translations();
        foreach (var (obf, real) in mappings)
        {
            t.Add(obf, real);
        }
        return t;
    }
}
