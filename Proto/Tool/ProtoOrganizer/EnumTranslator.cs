using System.Text;
using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

/// <summary>
/// Translates <c>Cmd&lt;Xxx&gt;Type</c> enum entries. Each entry value IS a cmdid, so we recover a
/// readable member name from <c>packetIds.txt</c> (cmdid → message). The obfuscated class-prefix on
/// every entry (e.g. <c>KAAMCALPIPD_</c>) is replaced with the real enum name. Entries whose cmdid has
/// no real message (still obfuscated / enum-only) keep their original suffix — only the prefix is fixed.
/// These enums are pure cmdid catalogs, referenced by nothing, so this is a safe readability pass.
/// </summary>
public static class EnumTranslator
{
    private static readonly Regex EntryRx =
        new(@"^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+)\s*;(.*)$", RegexOptions.Compiled);

    // Obfuscated names are 11 uppercase letters with no lowercase; real proto names contain lowercase.
    private static bool IsReal(string name) => name.Any(char.IsLower);

    public static int TranslateAll(List<TypeDef> defs, Dictionary<int, PacketIdRow> packetIds)
    {
        int changed = 0;
        for (int i = 0; i < defs.Count; i++)
        {
            if (!defs[i].IsCmdEnum) continue;
            var (body, n) = Translate(defs[i].Name, defs[i].Body, packetIds);
            if (n > 0)
            {
                defs[i] = new TypeDef
                {
                    Name = defs[i].Name,
                    Kind = defs[i].Kind,
                    Refs = defs[i].Refs,
                    Body = body,
                    IsCmdEnum = true,
                    CmdIds = defs[i].CmdIds,
                };
                changed += n;
            }
        }
        return changed;
    }

    private static (string body, int changed) Translate(string enumName, string body, Dictionary<int, PacketIdRow> packetIds)
    {
        var lines = body.Replace("\r\n", "\n").Split('\n');
        var used = new HashSet<string>(StringComparer.Ordinal);
        int changed = 0;
        var sb = new StringBuilder();

        for (int i = 0; i < lines.Length; i++)
        {
            var m = EntryRx.Match(lines[i]);
            if (!m.Success) { sb.Append(lines[i]); if (i < lines.Length - 1) sb.Append('\n'); continue; }

            var indent = m.Groups[1].Value;
            var oldName = m.Groups[2].Value;
            int value = int.Parse(m.Groups[3].Value);
            var trailing = m.Groups[4].Value;

            // suffix = whatever follows the first '_' (the obf class-prefix or a prior real prefix)
            int us = oldName.IndexOf('_');
            string suffix = us >= 0 ? oldName[(us + 1)..] : oldName;

            // prefer the real message name for this cmdid
            if (value != 0 && packetIds.TryGetValue(value, out var row) && IsReal(row.Name))
                suffix = row.Name;

            string newName = $"{enumName}_{suffix}";
            if (!used.Add(newName)) { newName = $"{enumName}_{suffix}_{value}"; used.Add(newName); }

            if (newName != oldName) changed++;
            sb.Append(indent).Append(newName).Append(" = ").Append(value).Append(';').Append(trailing);
            if (i < lines.Length - 1) sb.Append('\n');
        }
        return (sb.ToString(), changed);
    }
}
