using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightTraitBonus.json")]
[MemoryPackable]
public partial class GridFightTraitBonusExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint BonusThreshold { get; set; }
    public List<uint> BonusParamList { get; set; } = [];

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightTraitBonusTypeEnum BonusType { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightTraitBonusData.TryAdd(ID, []);
        GameData.GridFightTraitBonusData[ID].TryAdd(BonusThreshold, this);
    }
}
