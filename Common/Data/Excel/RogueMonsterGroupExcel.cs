using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMonsterGroup.json")]
[MemoryPackable]
public partial class RogueMonsterGroupExcel : ExcelResource
{
    public Dictionary<string, double> RogueMonsterListAndWeight { get; set; } = [];
    public int RogueMonsterGroupID { get; set; }
    public int EliteGroup { get; set; }

    public override int GetId()
    {
        return RogueMonsterGroupID;
    }

    public override void Loaded()
    {
        GameData.RogueMonsterGroupData.Add(GetId(), this);
    }
}
