using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueDialogueOptionDisplay.json")]
[MemoryPackable]
public partial class RogueDialogueOptionDisplayExcel : ExcelResource
{
    public int OptionDisplayID { get; set; }
    public HashName OptionTitle { get; set; } = new();
    public HashName OptionDesc { get; set; } = new();

    public override int GetId()
    {
        return OptionDisplayID;
    }

    public override void Loaded()
    {
        GameData.RogueDialogueOptionDisplayData.Add(OptionDisplayID, this);
    }
}
