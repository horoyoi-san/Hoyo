using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightDivisionInfo.json")]
[MemoryPackable]
public partial class GridFightDivisionInfoExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint SeasonID { get; set; }
    public uint Progress { get; set; }
    public uint DivisionLevel { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightDivisionInfoData.TryAdd(ID, this);
    }
}
