namespace March7thHoney.ProtoOrganizer;

public enum DefKind { Message, Enum }

/// <summary>
/// One top-level proto definition as it exists in the curated <c>Proto/ProtoFile/</c> layer.
/// The curated layer is the authoritative DEFINITION source for the active version: re-emitting
/// these bodies verbatim (only regrouped into files) yields the exact same generated C# types.
/// </summary>
public sealed class TypeDef
{
    public required string Name { get; init; }
    public required DefKind Kind { get; init; }

    /// <summary>Type names this def directly references (parsed from its field declarations).</summary>
    public required IReadOnlyList<string> Refs { get; init; }

    /// <summary>The raw definition block, e.g. <c>message X { ... }</c>, ready to re-emit unchanged.</summary>
    public required string Body { get; init; }

    /// <summary>True when this is a <c>Cmd&lt;Xxx&gt;Type</c> command-category enum.</summary>
    public bool IsCmdEnum { get; init; }

    /// <summary>For a Cmd*Type enum: the cmdid values it enumerates (excluding the 0 / NONE entry).</summary>
    public IReadOnlyList<int> CmdIds { get; init; } = Array.Empty<int>();

    public override string ToString() => $"{Kind} {Name}";
}

/// <summary>The output file a <see cref="TypeDef"/> is assigned to.</summary>
public sealed class Bucket
{
    public required string FileName { get; init; }   // e.g. "CmdTutorialType.proto", "Common.proto"
    public bool Compiled { get; init; } = true;       // Unresolved stubs are not compiled
    public List<TypeDef> Members { get; } = new();
}
