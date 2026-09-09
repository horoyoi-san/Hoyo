using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RechargeConfig.json")]
[MemoryPackable]
public partial class RechargeConfigExcel : ExcelResource
{
    public string TierID { get; set; } = "";
    public string ProductID { get; set; } = "";
    public int GiftType { get; set; }
    public int ListOrder { get; set; }
    public int FirstCharge { get; set; }
    public int NormalCharge { get; set; }

    public override int GetId()
    {
        return TierID.GetHashCode();
    }

    public override void Loaded()
    {
        GameData.RechargeConfigData[ProductID] = this;
    }
}
