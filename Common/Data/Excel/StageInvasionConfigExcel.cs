using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("StageInvasionConfig.json")]
[MemoryPackable]
public partial class StageInvasionConfigExcel : ExcelResource
{
    public int StageID { get; set; }
    public int InvasionID { get; set; }

    public override int GetId()
    {
        return StageID;
    }

    public override void AfterAllDone()
    {
        if (!GameData.StageConfigData.TryGetValue(StageID, out var stage)) return;
        if (!GameData.StageInvasionBuffData.TryGetValue(InvasionID, out var buff)) return;
        stage.InvasionMazeBuffID = buff.MazeBuffID;
    }
}
