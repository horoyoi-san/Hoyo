using MemoryPack;
using March7thHoney.Data.Config;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightPortalBuff.json")]
[MemoryPackable]
public partial class GridFightPortalBuffExcel : ExcelResource
{
    public uint ID { get; set; }
    public bool IfInBook { get; set; }
    public List<FixedValueInfo<uint>> EffectParamList { get; set; } = [];
    public List<uint> ShowBonusIDList { get; set; } = [];
    public List<uint> PortalGameRefTrait { get; set; } = [];

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightPortalBuffData.TryAdd(ID, this);
    }
}
