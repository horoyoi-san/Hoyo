using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync.Player;

public class PlayerBoardSync(PlayerInstance player) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.UpdatePlayerBoardModuleList = new PlayerBoardModuleSync
        {
            Signature = player.Data.Signature,
            HeadFrameInfo = player.Data.HeadFrame.ToProto()
        };
    }
}
