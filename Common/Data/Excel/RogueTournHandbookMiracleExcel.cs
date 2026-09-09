using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournHandbookMiracle.json")]
[MemoryPackable]
public partial class RogueTournHandbookMiracleExcel : ExcelResource
{
    public int HandbookMiracleID { get; set; }
    public int MiracleDisplayID { get; set; }

    public override int GetId()
    {
        return HandbookMiracleID;
    }

    public override void Loaded()
    {
        GameData.RogueTournHandbookMiracleData.TryAdd(GetId(), this);
    }
}
