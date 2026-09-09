using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager(PlayerInstance player) : BasePlayerManager<InventoryData>(player)
{
    public async ValueTask AddItem(ItemData itemData, bool notify = true)
    {
        await PutItem(itemData.ItemId, itemData.Count,
            itemData.Rank, itemData.Promotion,
            itemData.Level, itemData.Exp, itemData.TotalExp,
            itemData.MainAffix, itemData.SubAffixes,
            itemData.ReforgeSubAffixes, itemData.UniqueId);

        await Player.SendPacket(new PacketPlayerSyncScNotify(itemData));
        if (notify) await Player.SendPacket(new PacketScenePlaneEventScNotify(itemData));
    }

    public async ValueTask AddItems(List<ItemData> items, bool notify = true)
    {
        var syncItems = new List<ItemData>();
        foreach (var item in items)
        {
            var i = await AddItem(item.ItemId, item.Count, false, sync: false, returnRaw: true);
            if (i != null) syncItems.Add(i);
        }

        await Player.SendPacket(new PacketPlayerSyncScNotify(syncItems));
        if (notify) await Player.SendPacket(new PacketScenePlaneEventScNotify(items));
    }

    public async ValueTask<ItemData?> AddItem(int itemId, int count, bool notify = true, int rank = 1, int level = 1,
        int promotion = 0, bool sync = true, bool returnRaw = false)
    {
        GameData.ItemConfigData.TryGetValue(itemId, out var itemConfig);
        if (itemConfig == null) return null;

        ItemData? itemData = null;

        switch (itemConfig.ItemMainType)
        {
            case ItemMainTypeEnum.Equipment:
                itemData = await AddEquipmentItem(itemId, rank, level, promotion, itemConfig);
                break;
            case ItemMainTypeEnum.Usable:
                itemData = await AddUsableItem(itemId, count, itemConfig);
                break;
            case ItemMainTypeEnum.Relic:
                itemData = await AddRelicItem(itemId, level, sync);
                break;
            case ItemMainTypeEnum.Virtual:
                itemData = await AddVirtualItem(itemId, count, itemConfig);
                break;
            case ItemMainTypeEnum.AvatarCard:
                itemData = await AddAvatarCardItem(itemId, sync, notify);
                break;
            case ItemMainTypeEnum.Mission:
                itemData = await PutItem(itemId, count);
                break;
            default:
                itemData = await PutItem(itemId, Math.Min(count, itemConfig.PileLimit));
                break;
        }

        ItemData? clone = null;
        if (itemData == null) return returnRaw ? itemData : clone ?? itemData;

        clone = itemData.Clone();
        if (sync && itemConfig.ItemMainType != ItemMainTypeEnum.Virtual)
            await Player.SendPacket(new PacketPlayerSyncScNotify(itemData));
        clone.Count = count;
        if (notify) await Player.SendPacket(new PacketScenePlaneEventScNotify(clone));

        Player.MissionManager?.HandleFinishType(MissionFinishTypeEnum.GetItem, itemData.ToProto());

        return returnRaw ? itemData : clone;
    }

    public async ValueTask<ItemData> PutItem(int itemId, int count, int rank = 0, int promotion = 0, int level = 0,
        int exp = 0, int totalExp = 0, int mainAffix = 0, List<ItemSubAffix>? subAffixes = null,
        List<ItemSubAffix>? regorgeSubAffixes = null, int uniqueId = 0)
    {
        if (promotion == 0 && level > 10) promotion = GameData.GetMinPromotionForLevel(level);
        var item = new ItemData
        {
            ItemId = itemId,
            Count = count,
            Rank = rank,
            Promotion = promotion,
            Level = level,
            Exp = exp,
            TotalExp = totalExp,
            MainAffix = mainAffix,
            SubAffixes = subAffixes ?? [],
            ReforgeSubAffixes = regorgeSubAffixes ?? []
        };

        if (uniqueId > 0) item.UniqueId = uniqueId;

        switch (GameData.ItemConfigData[itemId].ItemMainType)
        {
            case ItemMainTypeEnum.Material:
            case ItemMainTypeEnum.Pet:
            case ItemMainTypeEnum.Virtual:
            case ItemMainTypeEnum.Usable:
            case ItemMainTypeEnum.Mission:
                var oldItem = Data.MaterialItems.Find(x => x.ItemId == itemId);
                if (oldItem != null)
                {
                    oldItem.Count += count;
                    item = oldItem;
                    break;
                }

                Data.MaterialItems.Add(item);
                break;
            case ItemMainTypeEnum.Equipment:
                if (Data.EquipmentItems.Count + 1 > GameConstants.INVENTORY_MAX_EQUIPMENT)
                {
                    await Player.SendPacket(new PacketRetcodeNotify(Retcode.RetEquipmentExceedLimit));
                    return item;
                }

                Data.EquipmentItems.Add(item);
                break;
            case ItemMainTypeEnum.Relic:
                if (Data.RelicItems.Count + 1 > GameConstants.INVENTORY_MAX_RELIC)
                {
                    await Player.SendPacket(new PacketRetcodeNotify(Retcode.RetRelicExceedLimit));
                    return item;
                }

                Data.RelicItems.Add(item);
                break;
        }

        MarkDirty();
        return item;
    }

    public async ValueTask<List<ItemData>> RemoveItems(List<(int itemId, int count, int uniqueId)> items,
        bool sync = true)
    {
        List<ItemData> removedItems = [];
        foreach (var item in items)
        {
            var removedItem = await RemoveItem(item.itemId, item.count, item.uniqueId, false);
            if (removedItem != null) removedItems.Add(removedItem);
        }

        if (sync && removedItems.Count > 0) await Player.SendPacket(new PacketPlayerSyncScNotify(removedItems));
        return removedItems;
    }

    public async ValueTask<ItemData?> RemoveItem(int itemId, int count, int uniqueId = 0, bool sync = true)
    {
        GameData.ItemConfigData.TryGetValue(itemId, out var itemConfig);
        if (itemConfig == null) return null;

        ItemData? itemData = null;

        switch (itemConfig.ItemMainType)
        {
            case ItemMainTypeEnum.Material:
            case ItemMainTypeEnum.Pet:
            case ItemMainTypeEnum.Mission:
            case ItemMainTypeEnum.Usable:
                var item = Data.MaterialItems.Find(x => x.ItemId == itemId);
                if (item == null) return null;
                item.Count -= count;
                if (item.Count <= 0)
                {
                    Data.MaterialItems.Remove(item);
                    item.Count = 0;
                }

                itemData = item;
                break;
            case ItemMainTypeEnum.Virtual:
                switch (itemConfig.ID)
                {
                    case 1:
                        Player.Data.Hcoin -= count;
                        itemData = new ItemData { ItemId = itemId, Count = count };
                        break;
                    case 2:
                        Player.Data.Scoin -= count;
                        itemData = new ItemData { ItemId = itemId, Count = count };
                        break;
                    case 3:
                        Player.Data.Mcoin -= count;
                        itemData = new ItemData { ItemId = itemId, Count = count };
                        break;
                    case 32:
                        Player.Data.TalentPoints -= count;
                        itemData = new ItemData { ItemId = itemId, Count = count };
                        break;
                }

                if (sync && itemData != null) await Player.SendPacket(new PacketPlayerSyncScNotify(Player.ToProto()));
                break;
            case ItemMainTypeEnum.Equipment:
                var equipment = Data.EquipmentItems.Find(x => x.UniqueId == uniqueId);
                if (equipment == null) return null;
                Data.EquipmentItems.Remove(equipment);
                equipment.Count = 0;
                itemData = equipment;
                break;
            case ItemMainTypeEnum.Relic:
                var relic = Data.RelicItems.Find(x => x.UniqueId == uniqueId);
                if (relic == null) return null;
                Data.RelicItems.Remove(relic);
                relic.Count = 0;
                itemData = relic;
                break;
        }

        if (itemData != null && sync && itemConfig.ItemMainType != ItemMainTypeEnum.Virtual)
            await Player.SendPacket(new PacketPlayerSyncScNotify(itemData));

        Player.MissionManager?.HandleFinishType(MissionFinishTypeEnum.UseItem, new ItemData
        {
            ItemId = itemId,
            Count = count
        });

        MarkDirty();
        return itemData;
    }

    /// <summary>
    ///     Get item by itemId and uniqueId, if uniqueId provided, itemId will be ignored
    /// </summary>
    /// <param name="itemId"></param>
    /// <param name="uniqueId"></param>
    /// <returns></returns>
    public ItemData? GetItem(int itemId, int uniqueId = 0, ItemMainTypeEnum mainType = ItemMainTypeEnum.Unknown)
    {
        GameData.ItemConfigData.TryGetValue(itemId, out var itemConfig);
        if (itemConfig == null && mainType == ItemMainTypeEnum.Unknown) return null;
        if (itemConfig != null)
            mainType = itemConfig.ItemMainType;
        switch (mainType)
        {
            case ItemMainTypeEnum.Material:
            case ItemMainTypeEnum.Pet:
            case ItemMainTypeEnum.Usable:
                return Data.MaterialItems.Find(x => x.ItemId == itemId);
            case ItemMainTypeEnum.Equipment:
                return uniqueId > 0
                    ? Data.EquipmentItems.Find(x => x.UniqueId == uniqueId)
                    : Data.EquipmentItems.Find(x => x.ItemId == itemId);
            case ItemMainTypeEnum.Relic:
                return uniqueId > 0
                    ? Data.RelicItems.Find(x => x.UniqueId == uniqueId)
                    : Data.RelicItems.Find(x => x.ItemId == itemId);
            case ItemMainTypeEnum.Virtual:
                switch (itemConfig?.ID ?? 0)
                {
                    case 1:
                        return new ItemData
                        {
                            ItemId = itemId,
                            Count = Player.Data.Hcoin
                        };
                    case 2:
                        return new ItemData
                        {
                            ItemId = itemId,
                            Count = Player.Data.Scoin
                        };
                    case 3:
                        return new ItemData
                        {
                            ItemId = itemId,
                            Count = Player.Data.Mcoin
                        };
                    case 11:
                        return new ItemData
                        {
                            ItemId = itemId,
                            Count = Player.Data.Stamina
                        };
                    case 22:
                        return new ItemData
                        {
                            ItemId = itemId,
                            Count = Player.Data.Exp
                        };
                    case 32:
                        return new ItemData
                        {
                            ItemId = itemId,
                            Count = Player.Data.TalentPoints
                        };
                }

                break;
        }

        return null;
    }
}
