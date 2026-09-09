using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightAffixConfig.json")]
[MemoryPackable]
public partial class GridFightAffixConfigExcel : ExcelResource
{
    public uint ID { get; set; }
    public List<uint> RuleParamList { get; set; } = [];
    public List<GridFightRatioValue> EffectParamList { get; set; } = [];
    [JsonConverter(typeof(StringEnumConverter))] public GridFightAffixRuleEnum AffixRule { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightAffixConfigData.TryAdd(ID, this);
    }
}
