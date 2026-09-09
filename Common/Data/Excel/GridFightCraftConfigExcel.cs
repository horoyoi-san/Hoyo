using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightCraftConfig.json")]
[MemoryPackable]
public partial class GridFightCraftConfigExcel : ExcelResource
{
    public uint CraftID { get; set; }
    public uint CraftEquipID { get; set; }
    public List<uint> CostEquipList { get; set; } = [];

    public override int GetId()
    {
        return (int)CraftID;
    }

    public override void Loaded()
    {
        GameData.GridFightCraftConfigData.TryAdd(CraftID, this);
    }
}
