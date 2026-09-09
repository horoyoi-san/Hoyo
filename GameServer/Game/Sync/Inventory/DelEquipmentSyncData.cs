using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Marks equipment unique ids as removed in a PlayerSync notify.</summary>
public class DelEquipmentSyncData(IEnumerable<uint> delEquipmentIds) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.DelEquipmentList.Add(delEquipmentIds);
    }
}
