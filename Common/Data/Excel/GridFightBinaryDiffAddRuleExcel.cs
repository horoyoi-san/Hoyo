using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightBinaryDiffAddRule.json")]
[MemoryPackable]
public partial class GridFightBinaryDiffAddRuleExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint Quality { get; set; }
    public uint EnemyDifficultyAddValue { get; set; }

    public override int GetId() => (int)((ID << 4) | Quality);

    public override void Loaded()
    {
        GameData.GridFightBinaryDiffAddRuleData.TryAdd(ID, []);
        GameData.GridFightBinaryDiffAddRuleData[ID][Quality] = this;
    }
}
