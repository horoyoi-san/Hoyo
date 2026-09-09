using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("TutorialData.json")]
[MemoryPackable]
public partial class TutorialDataExcel : ExcelResource
{
    public int TutorialID { get; set; }
    public int Priority { get; set; }

    public override int GetId()
    {
        return TutorialID;
    }

    public override void Loaded()
    {
        GameData.TutorialDataData.TryAdd(TutorialID, this);
    }
}
