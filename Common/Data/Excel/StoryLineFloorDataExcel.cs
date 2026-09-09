using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("StoryLineFloorData.json")]
[MemoryPackable]
public partial class StoryLineFloorDataExcel : ExcelResource
{
    public int FloorID { get; set; }
    public int StoryLineID { get; set; }
    public int DimensionID { get; set; }

    public override int GetId()
    {
        return FloorID;
    }

    public override void Loaded()
    {
        GameData.StoryLineFloorDataData.TryGetValue(StoryLineID, out var data);
        if (data == null)
        {
            data = [];
            GameData.StoryLineFloorDataData.Add(StoryLineID, data);
        }

        data.Add(FloorID, this);
    }
}
