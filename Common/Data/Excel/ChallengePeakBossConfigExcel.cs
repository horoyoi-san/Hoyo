using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ChallengePeakBossConfig.json")]
[MemoryPackable]
public partial class ChallengePeakBossConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int HardTarget { get; set; }
    public int ColorMedalTarget { get; set; }
    public List<int> HardEventIDList { get; set; } = [];
    public List<int> HardTagList { get; set; } = [];
    public List<int> BuffList { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.ChallengePeakBossConfigData.TryAdd(ID, this);
    }

    public override void AfterAllDone()
    {
        GameData.ChallengePeakConfigData[ID].BossExcel = this;
    }
}
