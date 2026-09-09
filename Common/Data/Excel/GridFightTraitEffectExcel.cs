using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightTraitEffect.json")]
[MemoryPackable]
public partial class GridFightTraitEffectExcel : ExcelResource
{
    public uint ID { get; set; }
    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightTraitEffectTypeEnum TraitEffectType { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightTraitEffectData.TryAdd(ID, this);
    }
}
