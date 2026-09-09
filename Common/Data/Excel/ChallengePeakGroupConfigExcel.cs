using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ChallengePeakGroupConfig.json")]
[MemoryPackable]
public partial class ChallengePeakGroupConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int RewardGroupID { get; set; }
    public int MapEntranceID { get; set; }
    public int MapEntranceBoss { get; set; }
    public int BossLevelID { get; set; }
    public List<int> PreLevelIDList { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.ChallengePeakGroupConfigData.TryAdd(ID, this);
    }
}
