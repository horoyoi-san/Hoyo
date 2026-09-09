using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class CreateProp : TaskConfigInfo
{
    public DynamicFloat GroupID { get; set; } = new();
    public DynamicFloat GroupPropID { get; set; } = new();
    public List<GroupEntityInfo> CreateList { get; set; } = [];
}
