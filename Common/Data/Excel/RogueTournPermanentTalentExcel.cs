using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournPermanentTalent.json")]
[MemoryPackable]
public partial class RogueTournPermanentTalentExcel : ExcelResource
{
    public int TalentID { get; set; }
    public List<int> NextTalentIDList { get; set; } = [];

    public override int GetId()
    {
        return TalentID;
    }

    public override void Loaded()
    {
        GameData.RogueTournPermanentTalentData.TryAdd(TalentID, this);
    }
}
