using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightMonster.json")]
[MemoryPackable]
public partial class GridFightMonsterExcel : ExcelResource
{
    public uint MonsterID { get; set; }
    public uint Star3EliteGroup3 { get; set; }
    public uint MonsterTier { get; set; }
    public uint Star1EliteGroup3 { get; set; }
    public uint Star4EliteGroup3 { get; set; }
    public uint Star2EliteGroup3 { get; set; }

    public override int GetId()
    {
        return (int)MonsterID;
    }

    public override void Loaded()
    {
        GameData.GridFightMonsterData.TryAdd(MonsterID, this);
    }
}
