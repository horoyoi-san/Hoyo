using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

public sealed record PacketIdRow(int CmdId, string Name, string? Obf, bool EnumOnly);

/// <summary>
/// Loads <c>Raw/packetIds.txt</c> — the authoritative cmdid → message map.
/// Format: <c>1626 = FinishTutorialCsReq  // obf: ILGJBBFKLDP</c>
/// or      <c>25 = JBHLDLGENMB  // enum-only: CmdPlayerType/...; proto class unresolved</c>
/// </summary>
public static class PacketIds
{
    private static readonly Regex RowRx =
        new(@"^(\d+)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?://\s*(.*))?$", RegexOptions.Compiled);
    private static readonly Regex ObfRx =
        new(@"obf:\s*([A-Za-z_][A-Za-z0-9_]*)", RegexOptions.Compiled);

    public static Dictionary<int, PacketIdRow> Load(string packetIdsPath)
    {
        var map = new Dictionary<int, PacketIdRow>();
        foreach (var raw in File.ReadLines(packetIdsPath))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith("//")) continue;
            var m = RowRx.Match(line);
            if (!m.Success) continue;

            int cmdId = int.Parse(m.Groups[1].Value);
            string name = m.Groups[2].Value;
            string? comment = m.Groups[3].Success ? m.Groups[3].Value : null;
            string? obf = comment != null ? ObfRx.Match(comment).Groups[1].Value is { Length: > 0 } o ? o : null : null;
            bool enumOnly = comment != null && comment.Contains("enum-only", StringComparison.Ordinal);

            map[cmdId] = new PacketIdRow(cmdId, name, obf, enumOnly);
        }
        return map;
    }

    public static int Translate(
        Dictionary<int, PacketIdRow> packetIds,
        IReadOnlyDictionary<string, string> mappings)
    {
        var changed = 0;
        foreach (var (cmdId, row) in packetIds.ToList())
        {
            if (row.Name.Any(char.IsLower)) continue;
            string? translated = null;
            if (row.Obf != null) mappings.TryGetValue(row.Obf, out translated);
            if (translated == null) mappings.TryGetValue(row.Name, out translated);
            if (translated == null || translated == row.Name) continue;
            packetIds[cmdId] = row with { Name = translated };
            changed++;
        }
        return changed;
    }
}
