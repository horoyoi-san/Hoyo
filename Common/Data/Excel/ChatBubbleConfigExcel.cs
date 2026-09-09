using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ChatBubbleConfig.json")]
[MemoryPackable]
public partial class ChatBubbleConfigExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.ChatBubbleConfigData[ID] = this;
    }
}
