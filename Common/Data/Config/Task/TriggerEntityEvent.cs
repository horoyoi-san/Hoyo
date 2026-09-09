using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class TriggerEntityEvent : TaskConfigInfo
{
    public DynamicFloat InstanceID { get; set; } = new();
}
