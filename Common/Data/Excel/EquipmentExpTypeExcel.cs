using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("EquipmentExpType.json")]
[MemoryPackable]
public partial class EquipmentExpTypeExcel : ExcelResource
{
    public int ExpType { get; set; }
    public int Level { get; set; }
    public int Exp { get; set; }

    public override int GetId()
    {
        return ExpType * 100 + Level;
    }

    public override void Loaded()
    {
        GameData.EquipmentExpTypeData.Add(GetId(), this);
    }
}
