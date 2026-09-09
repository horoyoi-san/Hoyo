using System.Collections.Frozen;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using Google.Protobuf.Collections;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    public async ValueTask<bool> LockItems(RepeatedField<uint> ids, bool isLocked,
        ItemMainTypeEnum itemType = ItemMainTypeEnum.Unknown)
    {
        List<ItemData> targetItems;
        switch (itemType)
        {
            case ItemMainTypeEnum.Equipment:
                targetItems = Data.EquipmentItems;
                break;
            case ItemMainTypeEnum.Relic:
                targetItems = Data.RelicItems;
                break;
            case ItemMainTypeEnum.Unknown:
            case ItemMainTypeEnum.Virtual:
            case ItemMainTypeEnum.AvatarCard:
            case ItemMainTypeEnum.Usable:
            case ItemMainTypeEnum.Material:
            case ItemMainTypeEnum.Mission:
            case ItemMainTypeEnum.Display:
            case ItemMainTypeEnum.Pet:
            default:
                return false;
        }

        if (targetItems.Count == 0) return false;
        var idPool = ids.ToList().ConvertAll(x => (int)x).ToFrozenSet();
        var items = new List<ItemData>();
        foreach (var x in targetItems)
        {
            if (x.Discarded || !idPool.Contains(x.UniqueId)) continue;
            x.Locked = isLocked;
            items.Add(x);
        }

        if (items.Count <= 0) return false;
        await Player.SendPacket(new PacketPlayerSyncScNotify(items));
        return true;
    }

    public async ValueTask<bool> DiscardItems(RepeatedField<uint> ids, bool discarded,
        ItemMainTypeEnum itemType = ItemMainTypeEnum.Unknown)
    {
        List<ItemData> targetItems;
        switch (itemType)
        {
            case ItemMainTypeEnum.Equipment:
                targetItems = Data.EquipmentItems;
                break;
            case ItemMainTypeEnum.Relic:
                targetItems = Data.RelicItems;
                break;
            case ItemMainTypeEnum.Unknown:
            case ItemMainTypeEnum.Virtual:
            case ItemMainTypeEnum.AvatarCard:
            case ItemMainTypeEnum.Usable:
            case ItemMainTypeEnum.Material:
            case ItemMainTypeEnum.Mission:
            case ItemMainTypeEnum.Display:
            case ItemMainTypeEnum.Pet:
            default:
                return false;
        }

        if (targetItems.Count == 0) return false;
        var idPool = ids.ToList().ConvertAll(x => (int)x).ToFrozenSet();
        var items = new List<ItemData>();
        foreach (var x in targetItems)
        {
            if (x.Locked || !idPool.Contains(x.UniqueId)) continue;
            x.Discarded = discarded;
            items.Add(x);
        }

        if (items.Count <= 0) return false;
        await Player.SendPacket(new PacketPlayerSyncScNotify(items));
        return true;
    }
}
