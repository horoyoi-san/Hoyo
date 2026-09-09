using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketUnlockAvatarSkinScNotify : BasePacket
{
    public PacketUnlockAvatarSkinScNotify(int skinId) : base(CmdIds.UnlockAvatarSkinScNotify)
    {
        var proto = new UnlockAvatarSkinScNotify
        {
            SkinId = (uint)skinId
        };

        SetData(proto);
    }
}
