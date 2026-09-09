using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("BattlePassReward.json")]
[MemoryPackable]
public partial class BattlePassRewardExcel : ExcelResource
{
    public int ID { get; set; }
    public int RewardItem { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        if (RewardItem > 0)
            GameData.BattlePassRewardItemIds.Add(RewardItem);
    }
}
