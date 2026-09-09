using MemoryPack;
using March7thHoney.Data.Config.Task;

namespace March7thHoney.Data.Config;

[MemoryPackable]
public partial class FetchAdvPropData
{
    public DynamicFloat GroupID { get; set; } = new();
    public DynamicFloat ID { get; set; } = new();
}
