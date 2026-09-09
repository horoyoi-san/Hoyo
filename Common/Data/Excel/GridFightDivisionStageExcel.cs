using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightDivisionStage.json")]
[MemoryPackable]
public partial class GridFightDivisionStageExcel : ExcelResource
{
    public uint DivisionID { get; set; }
    public uint EnemyDifficultyLevel { get; set; }
    public List<uint> AffixChooseNumList { get; set; } = [];
    public uint ExpModify { get; set; }
    public uint SeasonID { get; set; }
    // 配表：进入遭遇关卡时按 (BinaryNodeDiffAddRule, 遭遇 quality) 查 GridFightBinaryDiffAddRule
    public uint BinaryNodeDiffAddRule { get; set; }

    public override int GetId()
    {
        return (int)DivisionID;
    }

    public override void Loaded()
    {
        GameData.GridFightDivisionStageData.TryAdd(DivisionID, this);
    }
}
