using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("NPCData.json")]
[MemoryPackable]
public partial class NPCDataExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.NpcDataData.Add(ID, this);
    }
}
