using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("BattleTargetConfig.json")]
[MemoryPackable]
public partial class BattleTargetConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int TargetParam { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.BattleTargetConfigData.TryAdd(ID, this);
    }
}
