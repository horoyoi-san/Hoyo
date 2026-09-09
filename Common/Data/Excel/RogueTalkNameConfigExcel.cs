using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTalkNameConfig.json")]
[MemoryPackable]
public partial class RogueTalkNameConfigExcel : ExcelResource
{
    public int TalkNameID { get; set; }
    public HashName Name { get; set; } = new();

    public override int GetId()
    {
        return TalkNameID;
    }

    public override void Loaded()
    {
        GameData.RogueTalkNameConfigData.Add(TalkNameID, this);
    }
}
