using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("TrainPartyPassengerConfig.json")]
[MemoryPackable]
public partial class TrainPartyPassengerConfigExcel : ExcelResource
{
    public int PassengerID { get; set; }

    public override int GetId()
    {
        return PassengerID;
    }

    public override void Loaded()
    {
        GameData.TrainPartyPassengerConfigData.Add(PassengerID, this);
    }
}
