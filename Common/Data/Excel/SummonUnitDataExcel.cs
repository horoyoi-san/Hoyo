using MemoryPack;
using March7thHoney.Data.Config.SummonUnit;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("SummonUnitData.json")]
[MemoryPackable]
public partial class SummonUnitDataExcel : ExcelResource
{
    public int ID { get; set; }
    public string JsonPath { get; set; } = "";

    [JsonConverter(typeof(StringEnumConverter))]
    public SummonUnitUniqueGroupEnum UniqueGroup { get; set; }

    public bool DestroyOnEnterBattle { get; set; }
    public bool RemoveMazeBuffOnDestroy { get; set; }

    public bool IsClient { get; set; }

    public SummonUnitConfigInfo? ConfigInfo { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.SummonUnitDataData[ID] = this;
    }
}
