using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketAvatarPathChangedNotify : BasePacket
{
    public PacketAvatarPathChangedNotify(uint baseAvatarId, MultiPathAvatarType type) : base(
        CmdIds.AvatarPathChangedNotify)
    {
        var proto = new AvatarPathChangedNotify
        {
            BaseAvatarId = baseAvatarId,
            CurMultiPathAvatarType = type
        };

        SetData(proto);
    }
}
