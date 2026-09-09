using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class DestroyProp : TaskConfigInfo
{
    public DynamicFloat ID { get; set; } = new();
    public DynamicFloat GroupID { get; set; } = new();
    public List<GroupEntityInfo> DestroyList { get; set; } = [];
}

[MemoryPackable]
public partial class GroupEntityInfo
{
    public DynamicFloat GroupID { get; set; } = new();
    public DynamicFloat GroupInstanceID { get; set; } = new();
}

[MemoryPackable]
public partial class DynamicFloat
{
    public bool IsDynamic { get; set; }
    public FixedValueInfo<int> FixedValue { get; set; } = new();

    public int GetValue()
    {
        return IsDynamic ? 0 : FixedValue.Value;
    }
}
