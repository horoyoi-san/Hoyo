using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MessageSectionConfig.json")]
[MemoryPackable]
public partial class MessageSectionConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public List<int> StartMessageItemIDList { get; set; } = [];
    public bool IsPerformMessage { get; set; }
    public int MainMissionLink { get; set; }

    [JsonIgnore] public List<MessageItemConfigExcel> Items { get; set; } = [];

    [JsonIgnore] public int GroupID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MessageSectionConfigData.Add(ID, this);
    }
}
