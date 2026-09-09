using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Carries a mission sync block in a PlayerSync notify.</summary>
public class MissionSyncData(MissionSync mission) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.MissionSync = mission;
    }
}
