using MemoryPack;
using March7thHoney.Data.Config;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightTraitEffectLayerPa.json")]
[MemoryPackable]
public partial class GridFightTraitEffectLayerPaExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint Layer { get; set; }
    public List<FixedValueInfo<double>> EffectParamList { get; set; } = [];

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightTraitEffectLayerPaData.TryAdd(ID, []);
        GameData.GridFightTraitEffectLayerPaData[ID][Layer] = this;
    }
}
