using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightTraitBonusAddRule.json")]
[MemoryPackable]
public partial class GridFightTraitBonusAddRuleExcel : ExcelResource
{
    public uint ID { get; set; }
    public List<uint> ParamList { get; set; } = [];

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightTraitBonusAddTypeEnum TraitBonusType { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightTraitBonusAddRuleData.TryAdd(ID, this);
    }
}
