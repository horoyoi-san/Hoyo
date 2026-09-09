using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("OfferingTypeConfig.json")]
[MemoryPackable]
public partial class OfferingTypeConfigExcel : ExcelResource
{
    public int MaxLevel { get; set; }
    public int ItemID { get; set; }
    public int ActivityModuleID { get; set; }
    public int LongTailLimit { get; set; }
    public int ID { get; set; }
    public int UnlockID { get; set; }
    public bool IsAutoOffer { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.OfferingTypeConfigData.TryAdd(ID, this);
    }
}
