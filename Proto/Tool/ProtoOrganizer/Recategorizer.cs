namespace March7thHoney.ProtoOrganizer;

/// <summary>
/// Subdivides the two large catch-all buckets (Common.proto, Orphans.proto) into per-major-category
/// files (CommonAvatar.proto, OrphansBattle.proto, ...). Categories are derived from the Cmd*Type
/// taxonomy. Common types categorize by their dominant referencing Cmd group (works even when the
/// type name is still obfuscated); orphans categorize by name prefix. Tiny categories collapse back
/// into the residual file, and a file-level SCC pass merges any import cycle the split would create.
/// </summary>
public static class Recategorizer
{
    private const int MinTypesPerCategory = 6;

    public static List<string> Run(GroupResult gr, List<TypeDef> defs, Dictionary<int, PacketIdRow> packetIds)
    {
        var report = new List<string>();
        var byName = defs.ToDictionary(d => d.Name, StringComparer.Ordinal);

        // --- category keywords from the Cmd*Type taxonomy (strip "Cmd" prefix + "Type" suffix) ---
        var keywords = defs.Where(d => d.IsCmdEnum)
            .Select(d => d.Name)
            .Where(n => n.StartsWith("Cmd", StringComparison.Ordinal) && n.EndsWith("Type", StringComparison.Ordinal))
            .Select(n => n[3..^4])
            .Where(k => k.Length >= 4)
            .Distinct(StringComparer.Ordinal)
            .OrderByDescending(k => k.Length).ThenBy(k => k, StringComparer.Ordinal)
            .ToList();

        // --- cmdid -> category (a packet orphan's cmdid tells us its module even when it's a forward
        //     orphan), and message-name -> cmdid (real name and obf hint). ---
        var cmdIdToCat = new Dictionary<int, string>();
        foreach (var e in defs.Where(d => d.IsCmdEnum))
        {
            var cat = e.Name[3..^4];
            foreach (var id in e.CmdIds) cmdIdToCat.TryAdd(id, cat);
        }
        var nameToCmdId = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var (id, row) in packetIds)
        {
            nameToCmdId.TryAdd(row.Name, id);
            if (row.Obf != null) nameToCmdId.TryAdd(row.Obf, id);
        }
        string? CategoryByCmdId(string name) =>
            nameToCmdId.TryGetValue(name, out var id) && cmdIdToCat.TryGetValue(id, out var c) ? c : null;

        string? CategoryByName(string name)
        {
            string? best = null;
            foreach (var k in keywords)                       // longest prefix wins
                if (name.StartsWith(k, StringComparison.Ordinal)) { best = k; break; }
            if (best != null) return best;
            foreach (var k in keywords)                       // else longest substring
                if (name.Contains(k, StringComparison.Ordinal)) return k;
            return null;
        }

        // --- dominant referencing Cmd group per Common type (graph signal) ---
        var referencers = new Dictionary<string, Dictionary<string, int>>(StringComparer.Ordinal);
        foreach (var d in defs)
        {
            var fromFile = gr.Assignment[d.Name];
            if (!fromFile.StartsWith("Cmd", StringComparison.Ordinal)) continue;
            var cat = fromFile[3..^("Type.proto".Length)];     // CmdAvatarType.proto -> Avatar
            foreach (var r in d.Refs)
            {
                if (!byName.ContainsKey(r)) continue;
                if (gr.Assignment[r] != Grouper.CommonFile) continue;
                if (!referencers.TryGetValue(r, out var m)) referencers[r] = m = new(StringComparer.Ordinal);
                m[cat] = m.GetValueOrDefault(cat) + 1;
            }
        }
        string? CategoryByReferencers(string name) =>
            referencers.TryGetValue(name, out var m)
                ? m.OrderByDescending(kv => kv.Value).ThenBy(kv => kv.Key, StringComparer.Ordinal).First().Key
                : null;

        // --- reassign Common & Orphans members to category files ---
        int Recat(string sourceFile, string prefix, Func<string, string?> categorize)
        {
            int moved = 0;
            foreach (var name in gr.Assignment.Keys.Where(k => gr.Assignment[k] == sourceFile).ToList())
            {
                var cat = categorize(name);
                gr.Category[name] = cat ?? "Misc";          // record for intra-file sectioning either way
                if (cat == null) continue;
                gr.Assignment[name] = $"{prefix}{cat}.proto";
                moved++;
            }
            return moved;
        }

        Recat(Grouper.CommonFile, "Common", n => CategoryByReferencers(n) ?? CategoryByCmdId(n) ?? CategoryByName(n));
        Recat(Grouper.OrphansFile, "Orphans", n => CategoryByCmdId(n) ?? CategoryByName(n));

        // --- collapse tiny category files back into the residual bucket ---
        CollapseSmall(gr, "Common", Grouper.CommonFile);
        CollapseSmall(gr, "Orphans", Grouper.OrphansFile);

        // --- resolve file-level import cycles introduced by the split ---
        int merges = ResolveCycles(gr, defs, byName);

        RebuildBuckets(gr, defs);

        var commonFiles = gr.Buckets.Keys.Count(f => f.StartsWith("Common", StringComparison.Ordinal));
        var orphanFiles = gr.Buckets.Keys.Count(f => f.StartsWith("Orphans", StringComparison.Ordinal));
        report.Add($"recategorized: Common -> {commonFiles} files, Orphans -> {orphanFiles} files (cycle-merges: {merges})");
        report.Add($"residual Common.proto: {(gr.Buckets.TryGetValue(Grouper.CommonFile, out var cb) ? cb.Members.Count : 0)}, " +
                   $"residual Orphans.proto: {(gr.Buckets.TryGetValue(Grouper.OrphansFile, out var orb) ? orb.Members.Count : 0)}");
        report.Add("all catch-all files after split:");
        foreach (var b in gr.Buckets.Values
                     .Where(b => b.FileName.StartsWith("Common", StringComparison.Ordinal) || b.FileName.StartsWith("Orphans", StringComparison.Ordinal))
                     .OrderByDescending(b => b.Members.Count))
            report.Add($"  {b.FileName,-36} {b.Members.Count} types");
        return report;
    }

    private static void CollapseSmall(GroupResult gr, string prefix, string residualFile)
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var f in gr.Assignment.Values)
            if (f.StartsWith(prefix, StringComparison.Ordinal) && f != residualFile)
                counts[f] = counts.GetValueOrDefault(f) + 1;
        var tiny = counts.Where(kv => kv.Value < MinTypesPerCategory).Select(kv => kv.Key).ToHashSet(StringComparer.Ordinal);
        if (tiny.Count == 0) return;
        foreach (var name in gr.Assignment.Keys.ToList())
            if (tiny.Contains(gr.Assignment[name])) gr.Assignment[name] = residualFile;
    }

    /// <summary>Merge each strongly-connected component of the file import graph into one file.</summary>
    private static int ResolveCycles(GroupResult gr, List<TypeDef> defs, Dictionary<string, TypeDef> byName)
    {
        // file -> files it imports
        var edges = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        foreach (var d in defs)
        {
            var f = gr.Assignment[d.Name];
            if (!edges.TryGetValue(f, out var s)) edges[f] = s = new(StringComparer.Ordinal);
            foreach (var r in d.Refs)
                if (byName.ContainsKey(r) && gr.Assignment[r] is var g && g != f) s.Add(g);
        }

        var sccs = Tarjan(edges);
        int merges = 0;
        foreach (var scc in sccs.Where(c => c.Count > 1))
        {
            // merge into the file with the most members (deterministic tie-break)
            var counts = scc.ToDictionary(f => f, f => gr.Assignment.Count(kv => kv.Value == f));
            var target = scc.OrderByDescending(f => counts[f]).ThenBy(f => f, StringComparer.Ordinal).First();
            var members = scc.ToHashSet(StringComparer.Ordinal);
            foreach (var name in gr.Assignment.Keys.ToList())
                if (members.Contains(gr.Assignment[name])) gr.Assignment[name] = target;
            merges++;
        }
        return merges;
    }

    private static List<List<string>> Tarjan(Dictionary<string, HashSet<string>> g)
    {
        var index = new Dictionary<string, int>(StringComparer.Ordinal);
        var low = new Dictionary<string, int>(StringComparer.Ordinal);
        var onStack = new HashSet<string>(StringComparer.Ordinal);
        var stack = new Stack<string>();
        var sccs = new List<List<string>>();
        int counter = 0;

        void Strong(string v)
        {
            index[v] = low[v] = counter++;
            stack.Push(v); onStack.Add(v);
            if (g.TryGetValue(v, out var ws))
                foreach (var w in ws)
                {
                    if (!index.ContainsKey(w)) { Strong(w); low[v] = Math.Min(low[v], low[w]); }
                    else if (onStack.Contains(w)) low[v] = Math.Min(low[v], index[w]);
                }
            if (low[v] == index[v])
            {
                var comp = new List<string>();
                string w;
                do { w = stack.Pop(); onStack.Remove(w); comp.Add(w); } while (w != v);
                sccs.Add(comp);
            }
        }

        foreach (var v in g.Keys)
            if (!index.ContainsKey(v)) Strong(v);
        return sccs;
    }

    private static void RebuildBuckets(GroupResult gr, List<TypeDef> defs)
    {
        gr.Buckets.Clear();
        Bucket Get(string f) => gr.Buckets.TryGetValue(f, out var b) ? b : gr.Buckets[f] = new Bucket { FileName = f };
        foreach (var d in defs.OrderBy(d => d.Name, StringComparer.Ordinal))
            Get(gr.Assignment[d.Name]).Members.Add(d);
    }
}
