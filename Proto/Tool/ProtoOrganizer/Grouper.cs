namespace March7thHoney.ProtoOrganizer;

public sealed class GroupResult
{
    public required Dictionary<string, Bucket> Buckets { get; init; }   // fileName -> bucket
    public required Dictionary<string, string> Assignment { get; init; } // typeName -> fileName
    public required List<string> Report { get; init; }

    /// <summary>typeName -> major category, for intra-file sectioning of large catch-all files.</summary>
    public Dictionary<string, string> Category { get; } = new(StringComparer.Ordinal);
}

/// <summary>
/// Builds CmdType groups from the curated Cmd*Type enums + packetIds, computes per-group transitive
/// closures over the curated import graph, then buckets every type into exactly one output file.
/// </summary>
public static class Grouper
{
    public const string CommonFile = "Common.proto";
    public const string UngroupedFile = "Ungrouped.proto";
    public const string OrphansFile = "Orphans.proto";
    public const string UngroupedHome = "<ungrouped>";

    public static GroupResult Build(List<TypeDef> defs, Dictionary<int, PacketIdRow> packetIds, GraphContext graph)
    {
        var report = new List<string>();
        var byName = defs.ToDictionary(d => d.Name, StringComparer.Ordinal);

        // --- cmdid -> curated root seeds (via merged graph; falls back to children for master-only roots) ---
        IReadOnlyList<string> Seeds(int cmdId)
            => packetIds.TryGetValue(cmdId, out var row) ? graph.RootSeeds(row).ToList() : Array.Empty<string>();

        // --- index Cmd*Type enums ---
        var cmdEnums = defs.Where(d => d.IsCmdEnum).OrderBy(d => d.Name, StringComparer.Ordinal).ToList();
        var allGroupedCmdIds = new HashSet<int>(cmdEnums.SelectMany(e => e.CmdIds));

        // --- per-group closure ---
        var groupClosure = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        int unresolvedRootCount = 0;
        foreach (var e in cmdEnums)
        {
            var roots = new List<string>();
            foreach (var id in e.CmdIds)
            {
                var s = Seeds(id);
                if (s.Count > 0) roots.AddRange(s); else unresolvedRootCount++;
            }
            groupClosure[e.Name] = Closure(roots, graph);
        }

        // --- ungrouped roots: cmdids not in any Cmd*Type enum ---
        var ungroupedRoots = new List<string>();
        int ungroupedNoDef = 0;
        foreach (var (cmdId, row) in packetIds)
        {
            if (allGroupedCmdIds.Contains(cmdId)) continue;
            var s = graph.RootSeeds(row).ToList();
            if (s.Count > 0) ungroupedRoots.AddRange(s); else ungroupedNoDef++;
        }
        var ungroupedClosure = Closure(ungroupedRoots, graph);

        // --- homes per type ---
        var homes = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        void AddHome(string type, string home)
        {
            if (!homes.TryGetValue(type, out var set)) { set = new(StringComparer.Ordinal); homes[type] = set; }
            set.Add(home);
        }
        foreach (var (g, set) in groupClosure)
            foreach (var t in set) AddHome(t, g);
        foreach (var t in ungroupedClosure) AddHome(t, UngroupedHome);

        // Each Cmd*Type enum belongs to its own group file regardless of references.
        foreach (var e in cmdEnums) AddHome(e.Name, e.Name);

        // --- initial assignment ---
        var assignment = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var d in defs)
        {
            if (!homes.TryGetValue(d.Name, out var hs) || hs.Count == 0)
            {
                assignment[d.Name] = OrphansFile;
            }
            else if (hs.Count >= 2)
            {
                assignment[d.Name] = CommonFile;
            }
            else
            {
                var only = hs.First();
                assignment[d.Name] = only == UngroupedHome ? UngroupedFile : only + ".proto";
            }
        }

        // --- Common promotion fixpoint: anything a Common type references must also live in Common,
        //     otherwise Common would import a group file that already imports Common (a cycle). ---
        bool changed = true;
        while (changed)
        {
            changed = false;
            foreach (var d in defs)
            {
                if (assignment[d.Name] != CommonFile) continue;
                foreach (var r in d.Refs)
                {
                    if (!byName.ContainsKey(r)) continue;          // ref to a type missing from curated layer
                    if (assignment[r] != CommonFile)
                    {
                        assignment[r] = CommonFile;
                        changed = true;
                    }
                }
            }
        }

        // --- materialize buckets ---
        var buckets = new Dictionary<string, Bucket>(StringComparer.Ordinal);
        Bucket GetBucket(string file) =>
            buckets.TryGetValue(file, out var b) ? b
                : buckets[file] = new Bucket { FileName = file };
        foreach (var d in defs.OrderBy(d => d.Name, StringComparer.Ordinal))
            GetBucket(assignment[d.Name]).Members.Add(d);

        // --- report ---
        report.Add($"curated defs:           {defs.Count} ({defs.Count(d => d.Kind == DefKind.Message)} message, {defs.Count(d => d.Kind == DefKind.Enum)} enum)");
        report.Add($"Cmd*Type enums:         {cmdEnums.Count}");
        report.Add($"packetIds cmdids:       {packetIds.Count}");
        report.Add($"grouped cmdids:         {allGroupedCmdIds.Count}");
        report.Add($"unresolved group roots: {unresolvedRootCount} (cmdid in a Cmd*Type enum but no curated message)");
        report.Add($"ungrouped roots:        {ungroupedRoots.Count} resolved, {ungroupedNoDef} with no curated message");
        report.Add("");
        report.Add($"output files:           {buckets.Count}");
        report.Add($"  Common.proto:         {GetBucket(CommonFile).Members.Count} types");
        report.Add($"  Ungrouped.proto:      {(buckets.TryGetValue(UngroupedFile, out var ub) ? ub.Members.Count : 0)} types");
        report.Add($"  Orphans.proto:        {(buckets.TryGetValue(OrphansFile, out var ob) ? ob.Members.Count : 0)} types");
        var cmdFiles = buckets.Keys.Where(f => f.StartsWith("Cmd", StringComparison.Ordinal)).ToList();
        report.Add($"  Cmd*Type group files: {cmdFiles.Count}");
        report.Add("");
        report.Add("largest group files:");
        foreach (var b in buckets.Values
                     .Where(b => b.FileName.StartsWith("Cmd", StringComparison.Ordinal))
                     .OrderByDescending(b => b.Members.Count).Take(10))
            report.Add($"  {b.FileName,-40} {b.Members.Count} types");

        return new GroupResult { Buckets = buckets, Assignment = assignment, Report = report };
    }

    private static HashSet<string> Closure(IEnumerable<string> roots, GraphContext graph)
    {
        var visited = new HashSet<string>(StringComparer.Ordinal);
        var queue = new Queue<string>();
        foreach (var r in roots)
            if (visited.Add(r)) queue.Enqueue(r);

        while (queue.Count > 0)
        {
            var cur = queue.Dequeue();
            if (graph.Adjacency.TryGetValue(cur, out var deps))
                foreach (var dep in deps)
                    if (visited.Add(dep)) queue.Enqueue(dep);
        }
        return visited;
    }
}
