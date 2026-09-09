using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Carries the player basic info block in a PlayerSync notify.</summary>
public class BasicInfoSyncData(PlayerBasicInfo info) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.BasicInfo = info;
    }
}
