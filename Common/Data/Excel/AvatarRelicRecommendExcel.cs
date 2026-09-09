using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("AvatarRelicRecommend.json")]
[MemoryPackable]
public partial class AvatarRelicRecommendExcel : ExcelResource
{
    public uint AvatarID { get; set; }
    public List<uint> Set4IDList { get; set; } = [];
    public List<uint> Set2IDList { get; set; } = [];
    public List<uint> ScoreRankList { get; set; } = [];
    public List<AvatarRelicRecommendMainAffix> PropertyList { get; set; } = [];

    public override int GetId()
    {
        return (int)AvatarID;
    }

    public override void Loaded()
    {
        GameData.AvatarRelicRecommendData.TryAdd(AvatarID, this);
    }
}

[MemoryPackable]
public partial class AvatarRelicRecommendMainAffix
{
    [JsonConverter(typeof(StringEnumConverter))]
    public RelicTypeEnum RelicType { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public AvatarPropertyTypeEnum PropertyType { get; set; }
}
