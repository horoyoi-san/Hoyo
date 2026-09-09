using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ShopConfig.json")]
[MemoryPackable]
public partial class ShopConfigExcel : ExcelResource
{
    public int ShopID { get; set; }
    public int ShopType { get; set; }

    public List<ShopGoodsConfigExcel> Goods { get; set; } = [];

    public override int GetId()
    {
        return ShopID;
    }

    public override void Loaded()
    {
        GameData.ShopConfigData.Add(GetId(), this);
    }
}
