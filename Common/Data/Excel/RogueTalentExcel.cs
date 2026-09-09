using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTalent.json")]
[MemoryPackable]
public partial class RogueTalentExcel : ExcelResource
{
    public int TalentID { get; set; }
    public bool IsImportant { get; set; }

    public override int GetId()
    {
        return TalentID;
    }

    public override void Loaded()
    {
        GameData.RogueTalentData.Add(GetId(), this);
    }
}
