using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("DailyActiveQuestPool.json")]
[MemoryPackable]
public partial class DailyActiveQuestPoolExcel : ExcelResource
{
    public int QuestID { get; set; }
    public int Type { get; set; }

    public override int GetId()
    {
        return QuestID;
    }

    public override void Loaded()
    {
        GameData.DailyActiveQuestPoolData[QuestID] = this;
    }
}
