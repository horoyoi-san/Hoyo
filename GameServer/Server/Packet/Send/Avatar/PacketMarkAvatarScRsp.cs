using March7thHoney.Database.Avatar;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketMarkAvatarScRsp : BasePacket
{
    public PacketMarkAvatarScRsp(FormalAvatarInfo avatar) : base(CmdIds.MarkAvatarScRsp)
    {
        var proto = new MarkAvatarScRsp
        {
            AvatarId = (uint)avatar.AvatarId,
            IsMarked = avatar.IsMarked
        };

        SetData(proto);
    }
}
