using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ChallengePeakReward.json", true)]
[MemoryPackable]
public partial class ChallengePeakRewardExcel : ExcelResource
{
    public int ID { get; set; }
    public int RewardGroupID { get; set; }
    public string RewardType { get; set; } = string.Empty;
    public int TypeValue { get; set; }
    public int RewardID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        if (!GameData.ChallengePeakRewardData.ContainsKey(RewardGroupID))
            GameData.ChallengePeakRewardData[RewardGroupID] = new List<ChallengePeakRewardExcel>();
        GameData.ChallengePeakRewardData[RewardGroupID].Add(this);
    }
}
