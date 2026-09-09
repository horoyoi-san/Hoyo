using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class BaseRogueBuffGroupExcel : ExcelResource
{
    public int GroupId { get; set; }
    [JsonIgnore] public List<BaseRogueBuffExcel> BuffList { get; set; } = [];
    [JsonIgnore] public bool IsLoaded { get; set; }

    public override int GetId()
    {
        return GroupId;
    }
}
