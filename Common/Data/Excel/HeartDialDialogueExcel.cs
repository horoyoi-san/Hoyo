using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("HeartDialDialogue.json")]
[MemoryPackable]
public partial class HeartDialDialogueExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.HeartDialDialogueData[ID] = this;
    }
}
