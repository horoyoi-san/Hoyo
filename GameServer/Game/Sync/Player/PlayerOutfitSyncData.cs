using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

public class PlayerOutfitSyncData(CJLCPMDGIBO outfit) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.DHKFCDAGHDM = outfit;
    }
}
