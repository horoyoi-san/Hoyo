using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RechargeGiftConfig.json")]
[MemoryPackable]
public partial class RechargeGiftConfigExcel : ExcelResource
{
    public int GiftType { get; set; }
    public List<int> GiftIDList { get; set; } = [];

    public override int GetId()
    {
        return GiftType;
    }

    public override void Loaded()
    {
        GameData.RechargeGiftConfigData.Add(GiftType, this);
    }
}
