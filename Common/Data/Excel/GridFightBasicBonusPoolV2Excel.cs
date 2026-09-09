using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightBasicBonusPoolV2.json")]
[MemoryPackable]
public partial class GridFightBasicBonusPoolV2Excel : ExcelResource
{
    public uint BonusID { get; set; }
    public uint Value { get; set; }
    public uint BonusTypeParam { get; set; }
    public List<uint> BonusTypeParamList { get; set; } = [];

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightBonusTypeEnum BonusType { get; set; }

    public override int GetId()
    {
        return (int)BonusID;
    }

    public override void Loaded()
    {
        GameData.GridFightBasicBonusPoolV2Data.TryAdd(BonusID, this);
    }
}
