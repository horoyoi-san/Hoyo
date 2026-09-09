using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournDivision.json")]
[MemoryPackable]
public partial class RogueTournDivisionExcel : ExcelResource
{
    public int DivisionLevel { get; set; }
    public int DivisionProgress { get; set; }

    public override int GetId()
    {
        return DivisionLevel;
    }

    public override void Loaded()
    {
        GameData.RogueTournDivisionData.Add(DivisionLevel, this);
    }
}
