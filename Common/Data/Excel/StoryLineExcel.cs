using MemoryPack;
using March7thHoney.Enums.Mission;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("StoryLine.json")]
[MemoryPackable]
public partial class StoryLineExcel : ExcelResource
{
    public int StoryLineID { get; set; }
    public StoryLineCondition BeginCondition { get; set; } = new();
    public StoryLineCondition EndCondition { get; set; } = new();
    public int InitEntranceID { get; set; }
    public int InitGroupID { get; set; }
    public int InitAnchorID { get; set; }

    public override int GetId()
    {
        return StoryLineID;
    }

    public override void Loaded()
    {
        GameData.StoryLineData[StoryLineID] = this;
    }
}

[MemoryPackable]
public partial class StoryLineCondition
{
    [JsonConverter(typeof(StringEnumConverter))]
    public StoryLineConditionTypeEnum Type { get; set; } = new();

    public int Param { get; set; }
}
