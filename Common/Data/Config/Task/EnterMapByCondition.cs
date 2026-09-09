using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class EnterMapByCondition : TaskConfigInfo
{
    public DynamicFloat EntranceID { get; set; } = new();
}
