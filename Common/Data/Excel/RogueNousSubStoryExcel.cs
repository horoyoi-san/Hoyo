using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueNousSubStory.json")]
[MemoryPackable]
public partial class RogueNousSubStoryExcel : ExcelResource
{
    public int StoryID { get; set; }
    public int Layer { get; set; }
    public int MaxNousValue { get; set; }
    public List<int> NextIDList { get; set; } = [];
    public int RequireArea { get; set; }

    public override int GetId()
    {
        return StoryID;
    }

    public override void Loaded()
    {
        GameData.RogueNousSubStoryData.Add(GetId(), this);
    }
}
