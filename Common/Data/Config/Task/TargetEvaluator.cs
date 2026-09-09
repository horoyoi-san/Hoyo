using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
[MemoryPackUnion(0, typeof(UnknownTargetEvaluator))]
[MemoryPackUnion(1, typeof(TargetAlias))]
[MemoryPackUnion(2, typeof(TargetFetchAdvPropEx))]
public abstract partial class TargetEvaluator
{
    public string Type { get; set; } = "";
}

// Concrete fallback for the abstract union (mirrors UnknownTaskConfigInfo); the JSON loaders
// instantiate this when the source Type isn't a known TargetEvaluator subtype.
[MemoryPackable]
public partial class UnknownTargetEvaluator : TargetEvaluator;
