using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AdvByCompareDynamicValue : PredicateConfigInfo
{
    public string DynamicKey { get; set; } = string.Empty;
    public string CompareType { get; set; } = string.Empty;
    public DynamicFloat CompareValue { get; set; } = new();
}
