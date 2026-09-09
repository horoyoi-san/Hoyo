using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class DestroySummonUnit : TaskConfigInfo
{
    public SummonUnitSelector SummonUnit { get; set; } = new();
}

[MemoryPackable]
public partial class SummonUnitSelector
{
    public int SummonUnitID { get; set; }
}
