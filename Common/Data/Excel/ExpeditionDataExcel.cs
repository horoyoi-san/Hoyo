using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ExpeditionData.json")]
[MemoryPackable]
public partial class ExpeditionDataExcel : ExcelResource
{
    public int ExpeditionID { get; set; }
    public int GroupID { get; set; }
    public int UnlockMission { get; set; }

    public override int GetId()
    {
        return ExpeditionID;
    }

    public override void Loaded()
    {
        GameData.ExpeditionDataData[ExpeditionID] = this;
    }
}
