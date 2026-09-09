using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("AchievementData.json")]
[MemoryPackable]
public partial class AchievementDataExcel : ExcelResource
{
    public int QuestID { get; set; }
    public int AchievementID { get; set; }

    public override int GetId()
    {
        return AchievementID;
    }

    public override void Loaded()
    {
        GameData.AchievementDataData.TryAdd(AchievementID, this);
    }
}
