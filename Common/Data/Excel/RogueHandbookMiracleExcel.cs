using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueHandbookMiracle.json")]
[MemoryPackable]
public partial class RogueHandbookMiracleExcel : ExcelResource
{
    public int MiracleHandbookID { get; set; }
    public int MiracleReward { get; set; }

    public List<int> MiracleTypeList { get; set; } = [];

    public override int GetId()
    {
        return MiracleHandbookID;
    }

    public override void Loaded()
    {
        GameData.RogueHandbookMiracleData.Add(GetId(), this);
    }
}
