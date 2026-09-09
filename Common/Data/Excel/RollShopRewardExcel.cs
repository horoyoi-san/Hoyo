using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RollShopReward.json")]
[MemoryPackable]
public partial class RollShopRewardExcel : ExcelResource
{
    public uint GroupID { get; set; }
    public uint RewardID { get; set; }

    public override int GetId()
    {
        return (int)RewardID;
    }


    public override void Loaded()
    {
        GameData.RollShopRewardData.Add(GetId(), this);
    }
}
