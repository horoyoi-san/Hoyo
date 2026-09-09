using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("CakeConfig.json")]
[MemoryPackable]
public partial class CakeConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int NPCID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.CakeConfigData[ID] = this;
    }
}
