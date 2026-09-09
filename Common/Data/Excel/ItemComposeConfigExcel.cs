using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ItemComposeConfig.json")]
[MemoryPackable]
public partial class ItemComposeConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int ItemID { get; set; }
    public int CoinCost { get; set; }
    public List<MaterialItem> MaterialCost { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.ItemComposeConfigData[ID] = this;
    }
}

[MemoryPackable]
public partial class MaterialItem
{
    public int ItemID { get; set; }
    public int ItemNum { get; set; }
}
