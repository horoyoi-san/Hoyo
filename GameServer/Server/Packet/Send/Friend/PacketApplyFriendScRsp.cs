using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketApplyFriendScRsp : BasePacket
{
    public PacketApplyFriendScRsp(Retcode ret, uint uid) : base(CmdIds.ApplyFriendScRsp)
    {
        var proto = new ApplyFriendScRsp
        {
            Retcode = (uint)ret,
            Uid = uid
        };

        SetData(proto);
    }
}
