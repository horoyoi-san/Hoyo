using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MazePuzzleSwitchHand.json")]
[MemoryPackable]
public partial class MazePuzzleSwitchHandExcel : ExcelResource
{
    public int SwitchID { get; set; }
    public int PlaneID { get; set; }
    public int FloorID { get; set; }
    public List<int> SwitchHandID { get; set; } = [];

    public override int GetId()
    {
        return SwitchID;
    }

    public override void Loaded()
    {
        GameData.MazePuzzleSwitchHandData.Add(SwitchID, this);
    }
}
