using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MarbleMatchInfo.json")]
[MemoryPackable]
public partial class MarbleMatchInfoExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MarbleMatchInfoData.Add(ID, this);
    }
}
