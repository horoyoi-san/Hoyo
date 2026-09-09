using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    private async ValueTask<ItemData?> AddRelicItem(int itemId, int level, bool sync)
    {
        //I dont think one player can have more than max count of relic until i see a player get 50000 relic and the client crashed :(
        if (Data.RelicItems.Count + 1 > GameConstants.INVENTORY_MAX_RELIC) // get the max relic
        {
            await Player.SendPacket(new PacketRetcodeNotify(Retcode.RetRelicExceedLimit));
            return null;
        }

        var (_, itemData) = await HandleRelic(itemId, ++Data.NextUniqueId, level, sync: sync);
        return itemData;
    }

    public async ValueTask<(int, ItemData?)> HandleRelic(
        int relicId, int uniqueId, int level, int mainAffixId = 0, List<(int, int)>? subAffixes = null,
        bool sync = true)
    {
        // Excel
        GameData.RelicConfigData.TryGetValue(relicId, out var itemConfig);
        GameData.ItemConfigData.TryGetValue(relicId, out var itemConfigExcel);
        if (itemConfig == null || itemConfigExcel == null)
            return (1, null);

        GameData.RelicSubAffixData.TryGetValue(itemConfig.SubAffixGroup, out var subAffixConfig);
        GameData.RelicMainAffixData.TryGetValue(itemConfig.MainAffixGroup, out var mainAffixConfig);
        if (subAffixConfig == null || mainAffixConfig == null)
            return (1, null);

        var relic = new ItemData
        {
            ItemId = relicId,
            Level = Math.Max(Math.Min(level, 9999), 0),
            UniqueId = uniqueId,
            Count = 1
        };

        // MainAffixId
        if (mainAffixId == 0 || !mainAffixConfig.TryGetValue(mainAffixId, out _))
            relic.AddRandomRelicMainAffix();
        else
            relic.MainAffix = mainAffixId;

        // SubAffixes
        subAffixes ??= [];
        if (subAffixes.Count > 4) return (3, null);
        relic.AddRelicSubAffix(subAffixes); // Add from input

        var initSubCnt = new Random().Next(3, 5);
        relic.AddRandomRelicSubAffix(initSubCnt - subAffixes.Count);
        if (initSubCnt == 3 && level / 3 > 0) relic.AddRandomRelicSubAffix(); // Random add init subAffixes

        var remainUpCnt = level / 3 - (4 - initSubCnt) - subAffixes.Sum(x => x.Item2);
        relic.IncreaseRandomRelicSubAffix(remainUpCnt); // Level up

        if (sync)
        {
            await Player.InventoryManager!.AddItem(relic, false);
        }
        else
        {
            await PutItem(relic.ItemId, relic.Count, relic.Rank, relic.Promotion, relic.Level,
                relic.Exp, relic.TotalExp, relic.MainAffix, relic.SubAffixes,
                relic.ReforgeSubAffixes, relic.UniqueId);
        }
        return (0, relic);
    }

    public async ValueTask<List<ItemData>> ComposeRelic(ComposeSelectedRelicCsReq req)
    {
        var count = Math.Max(1, (int)req.Count);

        // Cost items in req
        if (req.ComposeItemList != null)
            foreach (var cost in req.ComposeItemList.ItemList)
                await RemoveItem((int)cost.PileItem.ItemId, (int)cost.PileItem.ItemNum);
        if (req.WrItemList != null)
            foreach (var subCost in req.WrItemList.ItemList)
                await RemoveItem((int)subCost.PileItem.ItemId, (int)subCost.PileItem.ItemNum);

        // Cost items in excel
        GameData.ItemComposeConfigData.TryGetValue((int)req.ComposeId, out var composeConfig);
        if (composeConfig == null) return [];
        foreach (var cost in composeConfig.MaterialCost)
            await RemoveItem(cost.ItemID, cost.ItemNum * count);

        await RemoveItem(2, composeConfig.CoinCost * count);

        var relicId = (int)req.ComposeRelicId;
        GameData.RelicConfigData.TryGetValue(relicId, out var itemConfig);
        GameData.RelicSubAffixData.TryGetValue(itemConfig!.SubAffixGroup, out var subAffixConfig);

        var mainAffix = (int)req.MainAffixId;
        List<ItemData> items = [];
        for (var i = 0; i < count; i++)
        {
            var itemData = new ItemData
            {
                ItemId = relicId,
                Level = 0,
                UniqueId = ++Data.NextUniqueId,
                MainAffix = mainAffix,
                SubAffixes = req.SubAffixIdList.Select(subId => new ItemSubAffix(subAffixConfig![(int)subId], 1))
                    .ToList(),
                Count = 1
            };
            if (mainAffix == 0) itemData.AddRandomRelicMainAffix();
            itemData.AddRandomRelicSubAffix(3 - itemData.SubAffixes.Count + itemData.LuckyRelicSubAffixCount());
            await AddItem(itemData, false);
            items.Add(itemData);
        }

        return items;
    }
}
