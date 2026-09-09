using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MessageContactsConfig.json")]
[MemoryPackable]
public partial class MessageContactsConfigExcel : ExcelResource
{
    public int ID { get; set; }

    [JsonIgnore] public List<MessageGroupConfigExcel> Groups { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MessageContactsConfigData.Add(ID, this);
    }
}
