using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("AvatarPromotionConfig.json,AvatarPromotionConfigLD.json", true)]
[MemoryPackable]
public partial class AvatarPromotionConfigExcel : ExcelResource
{
    public int AvatarID { get; set; }
    public int Promotion { get; set; }
    public int MaxLevel { get; set; }
    public int PlayerLevelRequire { get; set; }
    public int WorldLevelRequire { get; set; }
    public List<ItemParam> PromotionCostList { get; set; } = [];

    public override int GetId()
    {
        return AvatarID * 10 + Promotion;
    }

    public override void Loaded()
    {
        GameData.AvatarPromotionConfigData.TryAdd(GetId(), this);
    }

    [MemoryPackable]
    public partial class ItemParam
    {
        public int ItemID;
        public int ItemNum;
    }
}
