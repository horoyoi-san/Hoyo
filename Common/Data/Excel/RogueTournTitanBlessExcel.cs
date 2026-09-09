using MemoryPack;
using March7thHoney.Enums.Rogue;
using March7thHoney.Enums.TournRogue;
using March7thHoney.Proto;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournTitanBless.json")]
[MemoryPackable]
public partial class RogueTournTitanBlessExcel : ExcelResource
{
    public int TitanBlessID { get; set; }
    public int MazeBuffID { get; set; }
    public int TitanBlessLevel { get; set; }
    public int BlessRatio { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTitanTypeEnum TitanType { get; set; }

    [JsonProperty(ItemConverterType = typeof(StringEnumConverter))]
    public List<RogueTitanCategoryEnum> BlessBattleDisplayCategoryList { get; set; } = [];

    public override int GetId()
    {
        return TitanBlessID;
    }

    public override void Loaded()
    {
        GameData.RogueTournTitanBlessData.Add(TitanBlessID, this);
    }

    public object ToResultProto(RogueCommonActionResultSourceType select)
    {
        return new { Source = (int)select, TitanBlessID };
    }
}
