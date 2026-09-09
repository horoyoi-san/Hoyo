using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMonster.json")]
[MemoryPackable]
public partial class RogueMonsterExcel : ExcelResource
{
    public int RogueMonsterID { get; set; }
    public int NpcMonsterID { get; set; }
    public int EventID { get; set; }

    public override int GetId()
    {
        return RogueMonsterID;
    }

    public override void Loaded()
    {
        GameData.RogueMonsterData.Add(RogueMonsterID, this);
    }
}
