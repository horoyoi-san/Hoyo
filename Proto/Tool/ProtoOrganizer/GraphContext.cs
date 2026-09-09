namespace March7thHoney.ProtoOrganizer;

/// <summary>
/// A merged reference graph over the CURATED type names (the only names we emit). Edges come from
/// curated <c>import</c>s plus master field-references mapped into the curated namespace, so closures
/// reach types that are only connected through messages lacking a curated file.
/// </summary>
public sealed class GraphContext
{
    private readonly HashSet<string> _curated;
    private readonly Translations _tr;
    private readonly Dictionary<string, HashSet<string>> _masterEdges;
    public Dictionary<string, HashSet<string>> Adjacency { get; } = new(StringComparer.Ordinal);

    private GraphContext(HashSet<string> curated, Translations tr, Dictionary<string, HashSet<string>> masterEdges)
    {
        _curated = curated;
        _tr = tr;
        _masterEdges = masterEdges;
    }

    /// <summary>Map a master-spelled type name onto a curated type name, or null if not emittable.</summary>
    public string? ToCurated(string name)
    {
        if (_curated.Contains(name)) return name;                                  // same spelling
        if (_tr.ObfToReal.TryGetValue(name, out var real) && _curated.Contains(real)) return real;  // obf -> real
        if (_tr.RealToObf.TryGetValue(name, out var obfs))                          // real -> obf
            foreach (var o in obfs) if (_curated.Contains(o)) return o;
        return null;
    }

    public static GraphContext Build(List<TypeDef> defs, Translations tr, Dictionary<string, HashSet<string>> masterEdges)
    {
        var curated = new HashSet<string>(defs.Select(d => d.Name), StringComparer.Ordinal);
        var ctx = new GraphContext(curated, tr, masterEdges);
        var adj = ctx.Adjacency;

        HashSet<string> Edge(string from)
            => adj.TryGetValue(from, out var s) ? s : adj[from] = new(StringComparer.Ordinal);

        // 1) curated field-reference edges
        foreach (var d in defs)
            foreach (var r in d.Refs)
                if (curated.Contains(r) && r != d.Name) Edge(d.Name).Add(r);

        // 2) master field-reference edges, projected into curated names
        foreach (var (a, brefs) in masterEdges)
        {
            var ca = ctx.ToCurated(a);
            if (ca == null) continue;
            foreach (var b in brefs)
            {
                var cb = ctx.ToCurated(b);
                if (cb != null && cb != ca) Edge(ca).Add(cb);
            }
        }

        return ctx;
    }

    /// <summary>Curated seed nodes for a cmdid: the root message, or — if the root has no curated file — its referenced children.</summary>
    public IEnumerable<string> RootSeeds(PacketIdRow row)
    {
        var direct = ToCurated(row.Name) ?? (row.Obf != null ? ToCurated(row.Obf) : null);
        if (direct != null) { yield return direct; yield break; }

        // master-only root: seed from its children so its sub-tree still gets grouped
        foreach (var masterName in new[] { row.Name, row.Obf })
        {
            if (masterName != null && _masterEdges.TryGetValue(masterName, out var refs))
            {
                foreach (var r in refs)
                {
                    var cr = ToCurated(r);
                    if (cr != null) yield return cr;
                }
                yield break;
            }
        }
    }
}
