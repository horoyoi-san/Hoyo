using MemoryPack;
namespace March7thHoney.Data.Excel;

// 4.4 splits NPC monster templates out to MonsterTemplateUniqueConfig.json; merged
// resource trees keep them in the main table, so first-loaded wins via TryAdd.
[ResourceEntity("MonsterTemplateConfig.json,MonsterTemplateUniqueConfig.json", true)]
[MemoryPackable]
public partial class MonsterTemplateConfigExcel : ExcelResource
{
    public int MonsterTemplateID { get; set; }
    public List<int> NPCMonsterList { get; set; } = [];
    public int MonsterCampID { get; set; }

    public override int GetId()
    {
        return MonsterTemplateID;
    }

    public override void Loaded()
    {
        GameData.MonsterTemplateConfigData.TryAdd(MonsterTemplateID, this);
    }
}
