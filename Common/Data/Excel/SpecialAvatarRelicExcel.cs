using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("SpecialAvatarRelic.json")]
[MemoryPackable]
public partial class SpecialAvatarRelicExcel : ExcelResource
{
    public int RelicPropertyType { get; set; }
    public List<SpecialAvatarRelicInfo> RelicIDList { get; set; } = [];

    public override int GetId()
    {
        return RelicPropertyType;
    }

    public override void Loaded()
    {
        GameData.SpecialAvatarRelicData[GetId()] = this;
    }
}

[MemoryPackable]
public partial class SpecialAvatarRelicInfo
{
    [JsonProperty("BDHIKPAMCJF")] public int RelicID { get; set; }

    [JsonProperty("PKAFFFBFJII")] public int RelicLevel { get; set; }
}
