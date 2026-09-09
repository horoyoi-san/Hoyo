using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("TrainPartyDynamicConfig.json")]
[MemoryPackable]
public partial class TrainPartyDynamicConfigExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.TrainPartyDynamicConfigData.Add(ID, this);
    }
}
