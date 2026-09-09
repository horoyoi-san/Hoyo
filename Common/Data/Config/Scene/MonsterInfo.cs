using MemoryPack;
namespace March7thHoney.Data.Config.Scene;

[MemoryPackable]
public partial class MonsterInfo : PositionInfo
{
    public int NPCMonsterID { get; set; }
    public int EventID { get; set; }
    public int FarmElementID { get; set; }
    public bool IsClientOnly { get; set; }
}
