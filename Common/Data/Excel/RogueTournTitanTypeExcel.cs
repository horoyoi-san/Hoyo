using MemoryPack;
using March7thHoney.Enums.TournRogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournTitanType.json")]
[MemoryPackable]
public partial class RogueTournTitanTypeExcel : ExcelResource
{
    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTitanTypeEnum RogueTitanType { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTitanCategoryEnum RogueTitanCategory { get; set; }

    public override int GetId()
    {
        return (int)RogueTitanType;
    }

    public override void Loaded()
    {
        GameData.RogueTournTitanTypeData.Add(RogueTitanType, this);
    }
}
