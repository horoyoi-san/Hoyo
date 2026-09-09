using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("TrainPartyAreaConfig.json")]
[MemoryPackable]
public partial class TrainPartyAreaConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int RequireAreaID { get; set; }
    public int FirstStep { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.TrainPartyAreaConfigData.Add(ID, this);
    }
}
