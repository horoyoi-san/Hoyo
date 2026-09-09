using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightBonusPoolV2.json")]
[MemoryPackable]
public partial class GridFightBonusPoolV2Excel : ExcelResource
{
    public uint RandomBonusID { get; set; }
    public uint TotalValue { get; set; }
    public List<uint> BonusList { get; set; } = [];
    public List<uint> BonusMaxNumberList { get; set; } = [];
    public List<uint> BonusWeightList { get; set; } = [];

    public override int GetId() => (int)RandomBonusID;

    public override void Loaded()
    {
        GameData.GridFightBonusPoolV2Data[RandomBonusID] = this;
    }
}
