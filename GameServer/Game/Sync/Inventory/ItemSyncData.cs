using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Routes a single item into the right PlayerSync list (equipment / relic / material) by its main type.</summary>
public class ItemSyncData(ItemData item) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        GameData.ItemConfigData.TryGetValue(item.ItemId, out var itemConfig);
        if (itemConfig == null) return;
        switch (itemConfig.ItemMainType)
        {
            case ItemMainTypeEnum.Equipment:
                if (item.Count > 0)
                    notify.EquipmentList.Add(item.ToEquipmentProto());
                else
                    notify.DelEquipmentList.Add((uint)item.UniqueId);
                break;
            case ItemMainTypeEnum.Relic:
                if (item.Count > 0)
                    notify.RelicList.Add(item.ToRelicProto());
                else
                    notify.DelRelicList.Add((uint)item.UniqueId);
                break;
            case ItemMainTypeEnum.Mission:
            case ItemMainTypeEnum.Material:
            case ItemMainTypeEnum.Pet:
            case ItemMainTypeEnum.Usable:
                notify.MaterialList.Add(item.ToMaterialProto());
                break;
        }
    }
}
