using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournHandBookEvent.json")]
[MemoryPackable]
public partial class RogueTournHandBookEventExcel : ExcelResource
{
    public int EventHandbookID { get; set; }

    public override int GetId()
    {
        return EventHandbookID;
    }

    public override void Loaded()
    {
        GameData.RogueTournHandBookEventData.TryAdd(GetId(), this);
    }
}
