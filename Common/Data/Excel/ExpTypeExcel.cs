using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ExpType.json")]
[MemoryPackable]
public partial class ExpTypeExcel : ExcelResource
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
        GameData.ExpTypeData.Add(GetId(), this);
    }
}
