using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class TargetAlias : TargetEvaluator
{
    public string Alias { get; set; } = "";
}
