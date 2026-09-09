using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("TrainPartyStepConfig.json")]
[MemoryPackable]
public partial class TrainPartyStepConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int CoinCost { get; set; }
    public int GroupID { get; set; }
    public int SortID { get; set; }
    public List<int> StaticPropIDList { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.TrainPartyStepConfigData.Add(ID, this);
    }
}
