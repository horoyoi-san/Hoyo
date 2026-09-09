using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ChallengeMazeRewardLine.json,ChallengeStoryRewardLine.json,ChallengeBossRewardLine.json", true)]
[MemoryPackable]
public partial class ChallengeRewardExcel : ExcelResource
{
    public int GroupID { get; set; }
    public int StarCount { get; set; }
    public int RewardID { get; set; }

    public override int GetId()
    {
        return (GroupID << 16) + StarCount;
    }

    public override void Loaded()
    {
        if (!GameData.ChallengeRewardData.ContainsKey(GroupID))
            GameData.ChallengeRewardData[GroupID] = new List<ChallengeRewardExcel>();
        GameData.ChallengeRewardData[GroupID].Add(this);
    }
}
