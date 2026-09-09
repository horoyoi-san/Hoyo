using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    public async ValueTask<List<ItemData>> HandleReward(int rewardId, bool notify = false, bool sync = true)
    {
        GameData.RewardDataData.TryGetValue(rewardId, out var rewardData);
        if (rewardData == null) return [];
        List<ItemData> items = [];

        foreach (var item in rewardData.GetItems())
        {
            var i = await AddItem(item.Item1, item.Item2, notify, sync: false);
            if (i != null) items.Add(i);
        }

        if (sync)
            await Player.SendPacket(new PacketPlayerSyncScNotify(items));

        var hCoin = await AddItem(1, rewardData.Hcoin, notify, sync: false);
        if (hCoin != null)
            items.Add(hCoin);

        return items;
    }

    public async ValueTask<List<ItemData>> HandleMappingInfo(int mappingId, int worldLevel)
    {
        // calculate drops
        List<ItemData> items = [];
        List<ItemData> resItems = [];
        GameData.MappingInfoData.TryGetValue(mappingId * 10 + worldLevel, out var mapping);
        if (mapping != null)
        {
            foreach (var item in mapping.DropItemList)
            {
                var random = Random.Shared.Next(0, 101);

                if (random <= item.Chance)
                {
                    var amount = item.ItemNum > 0 ? item.ItemNum : Random.Shared.Next(item.MinCount, item.MaxCount + 1);

                    GameData.ItemConfigData.TryGetValue(item.ItemID, out var itemData);
                    if (itemData == null) continue;

                    items.Add(new ItemData
                    {
                        ItemId = item.ItemID,
                        Count = amount * (item.ItemID == 22
                            ? 1
                            : ConfigManager.Config.ServerOption.ValidFarmingDropRate())
                    });
                }
            }

            // Generate relics
            var relicDrops = mapping.GenerateRelicDrops();

            // Let AddItem notify relics count exceeding limit
            items.AddRange(Data.RelicItems.Count + relicDrops.Count - 1 > GameConstants.INVENTORY_MAX_RELIC
                ? relicDrops[..(GameConstants.INVENTORY_MAX_RELIC - Data.RelicItems.Count + 1)]
                : relicDrops);

            foreach (var item in items)
            {
                var i = (await Player.InventoryManager!.AddItem(item.ItemId, item.Count, false))!;
                i.Count = item.Count; // return the all thing

                resItems.Add(i);
            }
        }

        return resItems;
    }
}
