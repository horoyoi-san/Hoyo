using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueDLCDifficulty.json")]
[MemoryPackable]
public partial class RogueDLCDifficultyExcel : ExcelResource
{
    public int DifficultyID { get; set; }
    public List<int> DifficultyCutList { get; set; } = [];
    public List<int> DifficultyLevelGroup { get; set; } = [];
    public List<int> LevelList { get; set; } = [];

    public override int GetId()
    {
        return DifficultyID;
    }

    public override void Loaded()
    {
        GameData.RogueDLCDifficultyData.Add(GetId(), this);
    }
}
