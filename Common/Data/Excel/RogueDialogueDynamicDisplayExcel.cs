using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueDialogueDynamicDisplay.json")]
[MemoryPackable]
public partial class RogueDialogueDynamicDisplayExcel : ExcelResource
{
    public int DisplayID { get; set; }
    public HashName ContentText { get; set; } = new();

    public override int GetId()
    {
        return DisplayID;
    }

    public override void Loaded()
    {
        GameData.RogueDialogueDynamicDisplayData.Add(DisplayID, this);
    }
}
