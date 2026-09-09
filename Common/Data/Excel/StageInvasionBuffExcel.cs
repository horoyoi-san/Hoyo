using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("StageInvasionBuff.json")]
[MemoryPackable]
public partial class StageInvasionBuffExcel : ExcelResource
{
    public int InvasionID { get; set; }
    public int MazeBuffID { get; set; }

    public override int GetId()
    {
        return InvasionID;
    }

    public override void Loaded()
    {
        GameData.StageInvasionBuffData.TryAdd(GetId(), this);
    }
}
