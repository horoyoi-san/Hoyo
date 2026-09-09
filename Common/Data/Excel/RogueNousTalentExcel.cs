using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueNousTalent.json")]
[MemoryPackable]
public partial class RogueNousTalentExcel : ExcelResource
{
    public int TalentID { get; set; }

    public override int GetId()
    {
        return TalentID;
    }

    public override void Loaded()
    {
        GameData.RogueNousTalentData[TalentID] = this;
    }
}
