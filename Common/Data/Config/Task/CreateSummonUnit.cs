using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class CreateSummonUnit : TaskConfigInfo
{
    public int SummonUnitID { get; set; }
    public DynamicFloat Duration { get; set; } = new();
}
