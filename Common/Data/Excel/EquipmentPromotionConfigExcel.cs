using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("EquipmentPromotionConfig.json")]
[MemoryPackable]
public partial class EquipmentPromotionConfigExcel : ExcelResource
{
    public int EquipmentID { get; set; }
    public int Promotion { get; set; }
    public int MaxLevel { get; set; }
    public int WorldLevelRequire { get; set; }
    public List<ItemParam> PromotionCostList { get; set; } = [];

    public override int GetId()
    {
        return EquipmentID * 10 + Promotion;
    }

    public override void Loaded()
    {
        GameData.EquipmentPromotionConfigData.Add(GetId(), this);
    }

    [MemoryPackable]
    public partial class ItemParam
    {
        public int ItemID;
        public int ItemNum;
    }
}
