using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketDeleteBlacklistScRsp : BasePacket
{
    public PacketDeleteBlacklistScRsp(uint uid) : base(CmdIds.DeleteBlacklistScRsp)
    {
        var proto = new DeleteBlacklistScRsp
        {
            Uid = uid
        };

        SetData(proto);
    }
}
