using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Shop;

public class ShopService(PlayerInstance player) : BasePlayerManager(player)
{
    public async ValueTask<List<ItemData>> BuyItem(int shopId, int goodsId, int count)
    {
        GameData.ShopConfigData.TryGetValue(shopId, out var shopConfig);
        if (shopConfig == null) return [];
        var goods = shopConfig.Goods.Find(g => g.GoodsID == goodsId);
        if (goods == null) return [];
        GameData.ItemConfigData.TryGetValue(goods.ItemID, out var itemConfig);
        if (itemConfig == null) return [];

        foreach (var cost in goods.CostList) await Player.InventoryManager!.RemoveItem(cost.Key, cost.Value * count);
        var items = new List<ItemData>();
        if (itemConfig.ItemMainType is ItemMainTypeEnum.Equipment or ItemMainTypeEnum.Relic)
        {
            for (var i = 0; i < count; i++)
            {
                var item = await Player.InventoryManager!.AddItem(itemConfig.ID, 1, false);
                if (item != null) items.Add(item);
            }
        }
        else
        {
            var item = await Player.InventoryManager!.AddItem(itemConfig.ID, count, false);
            if (item != null)
            {
                if (GameData.ItemUseDataData.TryGetValue(item.ItemId, out var useData) && useData.IsAutoUse)
                {
                    var res = await Player.InventoryManager!.UseItem(item.ItemId);
                    if (res.returnItems != null) items.AddRange(res.returnItems);
                }
                else
                {
                    items.Add(item);
                }
            }
        }

        await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.BuyShopGoods, goods);

        return items;
    }
}
