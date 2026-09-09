using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueNousMainStory.json")]
[MemoryPackable]
public partial class RogueNousMainStoryExcel : ExcelResource
{
    public int StoryID { get; set; }
    public int Layer { get; set; }
    public int RogueNPCID { get; set; }
    public int QuestID { get; set; }
    public int StoryGroup { get; set; }

    public override int GetId()
    {
        return StoryID;
    }

    public override void Loaded()
    {
        GameData.RogueNousMainStoryData.Add(GetId(), this);
    }
}
