using MemoryPack;
namespace March7thHoney.Data.Excel;

// 4.4 splits NPC monsters out to MonsterUniqueConfig.json; merged resource trees
// keep them in the main table, so first-loaded wins via TryAdd.
[ResourceEntity("MonsterConfig.json,MonsterUniqueConfig.json", true)]
[MemoryPackable]
public partial class MonsterConfigExcel : ExcelResource
{
    public int MonsterID { get; set; }
    public int MonsterTemplateID { get; set; }
    public int HardLevelGroup { get; set; }
    public List<int> SummonIDList { get; set; } = [];

    public override int GetId()
    {
        return MonsterID;
    }

    public override void Loaded()
    {
        GameData.MonsterConfigData.TryAdd(MonsterID, this);
    }
}
