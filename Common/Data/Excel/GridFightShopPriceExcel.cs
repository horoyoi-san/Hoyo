using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightShopPrice.json")]
[MemoryPackable]
public partial class GridFightShopPriceExcel : ExcelResource
{
    public uint Rarity { get; set; }
    public uint BuyGoldStar1 { get; set; }
    public uint BuyGoldStar2 { get; set; }
    public uint BuyGoldStar3 { get; set; }
    public uint BuyGoldStar4 { get; set; }
    public uint SellGoldStar1 { get; set; }
    public uint SellGoldStar2 { get; set; }
    public uint SellGoldStar3 { get; set; }
    public uint SellGoldStar4 { get; set; }

    [JsonIgnore] public List<uint> BuyGoldList => [BuyGoldStar1, BuyGoldStar2, BuyGoldStar3, BuyGoldStar4];
    [JsonIgnore] public List<uint> SellGoldList => [SellGoldStar1, SellGoldStar2, SellGoldStar3, SellGoldStar4];

    public override int GetId()
    {
        return (int)Rarity;
    }

    public override void Loaded()
    {
        GameData.GridFightShopPriceData.TryAdd(Rarity, this);
    }
}
