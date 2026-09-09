using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ActionPointOverdraw.json")]
[MemoryPackable]
public partial class ActionPointOverdrawExcel : ExcelResource
{
    public int ActionPoint { get; set; }
    public int MazeBuff { get; set; }

    public override int GetId()
    {
        return ActionPoint;
    }

    public override void Loaded()
    {
        GameData.ActionPointOverdrawData.Add(ActionPoint, this);
    }
}
