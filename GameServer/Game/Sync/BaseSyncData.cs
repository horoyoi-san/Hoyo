using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

public abstract class BaseSyncData
{
    public abstract void SyncData(in PlayerSyncScNotify notify);
}
