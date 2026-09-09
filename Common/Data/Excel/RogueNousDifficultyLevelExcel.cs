using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueNousDifficultyLevel.json")]
[MemoryPackable]
public partial class RogueNousDifficultyLevelExcel : ExcelResource
{
    public int DifficultyID { get; set; }

    public override int GetId()
    {
        return DifficultyID;
    }

    public override void Loaded()
    {
        GameData.RogueNousDifficultyLevelData[DifficultyID] = this;
    }
}
