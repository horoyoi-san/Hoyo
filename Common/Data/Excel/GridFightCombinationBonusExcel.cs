using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightCombinationBonus.json")]
[MemoryPackable]
public partial class GridFightCombinationBonusExcel : ExcelResource
{
    public uint BonusID { get; set; }
    public List<uint> CombinationBonusList { get; set; } = [];
    public List<uint> BonusNumberList { get; set; } = [];

    public override int GetId()
    {
        return (int)BonusID;
    }

    public override void Loaded()
    {
        GameData.GridFightCombinationBonusData.TryAdd(BonusID, this);
    }
}
