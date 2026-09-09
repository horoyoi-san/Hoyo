using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ExpeditionReward.json")]
[MemoryPackable]
public partial class ExpeditionRewardExcel : ExcelResource
{
    public int ExpeditionID { get; set; }
    public int Duration { get; set; }
    public int AvatarNum { get; set; }
    public int RewardID { get; set; }
    public int ExtraRewardID { get; set; }

    public override int GetId()
    {
        return ExpeditionID * 100 + Duration;
    }

    public override void Loaded()
    {
        if (!GameData.ExpeditionRewardData.TryGetValue(ExpeditionID, out var list))
        {
            list = [];
            GameData.ExpeditionRewardData[ExpeditionID] = list;
        }

        list.Add(this);
    }
}
