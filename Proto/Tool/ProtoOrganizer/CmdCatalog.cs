using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

public static class CmdCatalog
{
    private static readonly Regex EntryRx = new(
        @"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)\s*;",
        RegexOptions.Compiled);

    public static int Apply(List<TypeDef> defs, Dictionary<int, PacketIdRow> packetIds)
    {
        var readable = 0;
        foreach (var def in defs.Where(d => d.IsCmdEnum))
        {
            var prefix = def.Name + "_";
            foreach (var line in def.Body.Replace("\r\n", "\n").Split('\n'))
            {
                var match = EntryRx.Match(line);
                if (!match.Success) continue;
                var value = int.Parse(match.Groups[2].Value);
                if (value == 0) continue;
                var name = match.Groups[1].Value;
                if (name.StartsWith(prefix, StringComparison.Ordinal)) name = name[prefix.Length..];
                if (name.StartsWith("Cmd", StringComparison.Ordinal) && name.Length > 3)
                    name = name[3..];
                if (!name.Any(char.IsLower)) continue;

                packetIds.TryGetValue(value, out var existing);
                var obf = existing?.Obf;
                if (obf == null && existing != null && !existing.Name.Any(char.IsLower)) obf = existing.Name;
                packetIds[value] = new PacketIdRow(value, name, obf, existing?.EnumOnly ?? true);
                readable++;
            }
        }
        return readable;
    }
}
