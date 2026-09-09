using MemoryPack;
using March7thHoney.Enums.Quest;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("FuncUnlockData.json")]
[MemoryPackable]
public partial class FuncUnlockDataExcel : ExcelResource
{
    public int UnlockID { get; set; }
    public List<FuncUnlockCondition> Conditions { get; set; } = [];

    public override int GetId()
    {
        return UnlockID;
    }

    public override void Loaded()
    {
        GameData.FuncUnlockDataData[UnlockID] = this;
    }
}

[MemoryPackable]
public partial class FuncUnlockCondition
{
    [JsonConverter(typeof(StringEnumConverter))]
    public ConditionTypeEnum Type { get; set; }

    public string Param { get; set; } = string.Empty;
}
