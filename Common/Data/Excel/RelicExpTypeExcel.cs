using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RelicExpType.json")]
[MemoryPackable]
public partial class RelicExpTypeExcel : ExcelResource
{
    public int TypeID { get; set; }
    public int Level { get; set; }
    public int Exp { get; set; }

    public override int GetId()
    {
        return TypeID * 100 + Level;
    }

    public override void Loaded()
    {
        GameData.RelicExpTypeData.Add(GetId(), this);
    }
}
