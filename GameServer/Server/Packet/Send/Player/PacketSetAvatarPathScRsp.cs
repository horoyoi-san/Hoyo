using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketSetAvatarPathScRsp : BasePacket
{
    public PacketSetAvatarPathScRsp(int avatarId) : base(CmdIds.SetAvatarPathScRsp)
    {
        var proto = new SetAvatarPathScRsp
        {
            AvatarId = (MultiPathAvatarType)avatarId
        };

        SetData(proto);
    }
}
