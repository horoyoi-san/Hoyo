using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMagicTalent.json")]
[MemoryPackable]
public partial class RogueMagicTalentExcel : ExcelResource
{
    public int TalentID { get; set; }
    public int Level { get; set; }

    public override int GetId()
    {
        return TalentID;
    }

    public override void Loaded()
    {
        GameData.RogueMagicTalentData.Add(TalentID, this);
    }
}
