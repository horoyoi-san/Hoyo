using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("TutorialGuideData.json")]
[MemoryPackable]
public partial class TutorialGuideDataExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.TutorialGuideDataData.TryAdd(ID, this);
    }
}
