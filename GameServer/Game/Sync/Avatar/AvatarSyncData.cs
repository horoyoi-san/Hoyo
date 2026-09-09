using March7thHoney.Database.Avatar;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Adds an avatar (and, for formal avatars, its path data) to the shared AvatarSync block.</summary>
public class AvatarSyncData(BaseAvatarInfo avatar) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.AvatarSync ??= new AvatarSync();
        notify.AvatarSync.AvatarList.Add(avatar.ToProto());
        if (avatar is FormalAvatarInfo formalAvatar)
            notify.AvatarSync.AvatarPathDataInfoList.Add(formalAvatar.ToAvatarPathDataProto());
    }
}
