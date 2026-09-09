using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class TriggerCustomString : TaskConfigInfo
{
    public DynamicString CustomString { get; set; } = new();
}

[MemoryPackable]
public partial class DynamicString
{
    public string Value { get; set; } = string.Empty;
}
