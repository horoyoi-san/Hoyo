using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class TriggerBattle : TaskConfigInfo
{
    public DynamicFloat EventID { get; set; } = new();
}
