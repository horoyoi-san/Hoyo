using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    public async ValueTask<ItemData?> ComposeItem(int composeId, int count, List<ItemCost> costData)
    {
        // Cost items in req
        foreach (var cost in costData)
            await RemoveItem((int)cost.PileItem.ItemId, (int)cost.PileItem.ItemNum);

        // Cost items in excel
        GameData.ItemComposeConfigData.TryGetValue(composeId, out var composeConfig);
        if (composeConfig == null) return null;
        foreach (var cost in composeConfig.MaterialCost)
            await RemoveItem(cost.ItemID, cost.ItemNum * count);

        await RemoveItem(2, composeConfig.CoinCost * count);

        return await AddItem(composeConfig.ItemID, count, false);
    }

    public async ValueTask<List<ItemData>> SellItem(ItemCostData costData, bool toMaterial)
    {
        List<ItemData> items = [];
        Dictionary<int, int> itemMap = [];
        List<(int itemId, int count, int uniqueId)> removeItems = [];

        foreach (var cost in costData.ItemList)
            if (cost.EquipmentUniqueId != 0) // equipment
            {
                var itemData = Data.EquipmentItems.Find(x => x.UniqueId == cost.EquipmentUniqueId);
                if (itemData == null) continue;
                removeItems.Add((itemData.ItemId, 1, (int)cost.EquipmentUniqueId));
                GameData.ItemConfigData.TryGetValue(itemData.ItemId, out var itemConfig);
                if (itemConfig == null) continue;
                foreach (var returnItem in itemConfig.ReturnItemIDList) // return items
                {
                    if (!itemMap.ContainsKey(returnItem.ItemID)) itemMap[returnItem.ItemID] = 0;
                    itemMap[returnItem.ItemID] += returnItem.ItemNum;
                }
            }
            else if (cost.RelicUniqueId != 0) // relic
            {
                var itemData = Data.RelicItems.Find(x => x.UniqueId == cost.RelicUniqueId);
                if (itemData == null) continue;
                removeItems.Add((itemData.ItemId, 1, (int)cost.RelicUniqueId));
                GameData.ItemConfigData.TryGetValue(itemData.ItemId, out var itemConfig);
                if (itemConfig == null) continue;
                if (itemConfig.Rarity != ItemRarityEnum.SuperRare || toMaterial)
                {
                    foreach (var returnItem in itemConfig.ReturnItemIDList) // basic return items
                    {
                        itemMap.TryAdd(returnItem.ItemID, 0);
                        itemMap[returnItem.ItemID] += returnItem.ItemNum;
                    }

                    var expReturned = (int)(itemData.CalcTotalExpGained() * 0.8);

                    var credit = (int)(expReturned * 1.5);
                    if (credit > 0)
                    {
                        itemMap.TryAdd(2, 0);
                        itemMap[2] += (int)(expReturned * 1.5);
                    }

                    var lostGoldFragCnt = expReturned / 500;
                    if (lostGoldFragCnt > 0)
                    {
                        itemMap.TryAdd(232, 0);
                        itemMap[232] += lostGoldFragCnt;
                    }

                    var lostGoldLightdust = expReturned % 500 / 100;
                    if (lostGoldLightdust > 0)
                    {
                        itemMap.TryAdd(231, 0);
                        itemMap[231] += lostGoldLightdust;
                    }
                }
                else
                {
                    var expGained = itemData.CalcTotalExpGained();
                    var remainsCnt = (int)(10 + expGained * 0.005144);
                    if (remainsCnt > 0)
                    {
                        itemMap.TryAdd(235, 0);
                        itemMap[235] += remainsCnt;
                    }
                }
            }
            else
            {
                removeItems.Add(((int)cost.PileItem.ItemId, (int)cost.PileItem.ItemNum, 0));
            }

        var removedItems = RemoveItems(removeItems);

        foreach (var itemInfo in itemMap)
        {
            var item = await AddItem(itemInfo.Key, itemInfo.Value, false);
            if (item != null) items.Add(item);
        }

        return items;
    }
}
